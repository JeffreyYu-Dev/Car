# LLM-OBD — Personalized Vehicular Health Diagnosis via LLM

A working implementation of the IEEE paper
**["Personalized Vehicular Health Diagnosis via Large Language Model"](docs/paper/Personalized_Vehicular_Health_Diagnosis_via_Large_Language_Model.pdf)**,
plus a set of features built on top of it that the paper describes but doesn't
build.

A check-engine light tells you almost nothing: *something's wrong*, with no
context on severity, cause, or what to do next. Worse, a nervous new driver and
a trained mechanic get the exact same signal. This system replaces that with a
two-sided AI pipeline — a small model in the car, a large model in the cloud —
connected by a link that can only carry a few KB of text at a time.

That bandwidth constraint is why almost every design decision below exists.
Every stage is about **compressing information down before transmission, then
re-expanding it with context after it lands in the cloud.**

## 🚗 Live

| | |
|---|---|
| **On-board unit** (driver UI) | https://onboard-server-production.up.railway.app |
| **Backend dashboard** (traces, knowledge base, feedback) | https://backend-dashboard-production-10dc.up.railway.app |
| **Backend API** | https://backend-server-production-36eb.up.railway.app |

Running on Railway: the two llama.cpp model servers, both application servers,
and the dashboard, with Neon and Qdrant Cloud behind them. The on-board Gemma 3
1B generates at ~75 tokens/sec on CPU.

---

## Contents

- [The pipeline](#the-pipeline)
- [What this adds to the paper](#what-this-adds-to-the-paper)
- [Architecture](#architecture)
- [Running it locally](#running-it-locally)
- [Configuration](#configuration)
- [Deploying](#deploying)
- [Repository layout](#repository-layout)
- [Paper](#paper)

---

## The pipeline

```
[Car: driver profile + sensor fault]
        │
        ▼
[On-board LLM (Gemma 3 1B): condense into a short query]
        │  ── satellite uplink — small payload ──
        ▼
[Backend: embed query]  →  vector
        │
        ▼
[Retrieval #1: top-K similar historical queries]
        │
        ▼
[Augment: q_final = α·q_init + (1−α)·Σ z_k·q_k]
        │
        ▼
[Retrieval #2: top-M knowledge base entries + solutions]
        │
        ▼
[Assemble prompt: case + similar cases + solutions + driver profile]
        │
        ▼
[Cloud LLM (gpt-oss-120b): generate personalized response]
        │  ── satellite downlink ──
        ▼
[Action module: severity → alert / reminder / memo]
        │
        ▼
[Driver: helpful / not helpful]  →  expert review  →  back into the knowledge base
```

### Why it's shaped this way

| Constraint | Design response |
|---|---|
| Satellite bandwidth is scarce and slow | The on-board model compresses everything into one short query before transmission |
| That short query lacks context | The cloud re-expands it using retrieved similar cases before the final model sees it |
| LLMs hallucinate without grounding | Two-stage retrieval — similar cases, then resolved cases with solutions — grounds the answer in real precedent |
| One-size-fits-all explanations fail different drivers | The driver profile is carried through the whole pipeline and shapes the final generation |
| The AI or the link might fail | The legacy warning-light system stays active underneath as a fallback |
| Quality needs to improve over time | Driver feedback plus expert scoring feeds back into the knowledge base |

### Query augmentation

The step worth calling out is **Stage 5**, which is Eq. (1) in the paper:

```
q_final = α · q_init + (1 − α) · Σ_k z(q_k, q_init) · q_k
```

The query that survives the uplink is deliberately thin. Rather than search
with it directly, the backend finds the K historical queries that share its
fault prefix, softmaxes their cosine similarities into weights `z`, and blends
them into the query vector. `α` (default `0.5`) controls how much of the
original query survives the blend.

The effect is that a terse query gets pulled toward the region of embedding
space where richer, better-resolved versions of the same problem already live —
before the knowledge base is searched at all.

### Severity-aware delivery

The action module maps the model's severity classification to a delivery
channel, deterministically — choosing the channel is the module's job, not the
LLM's:

| Severity | Channel | What the driver gets |
|---|---|---|
| `critical` | `dashboard_alert` | Urgent dashboard alert with an audio alarm |
| `reminder` | `dashboard_reminder` | A quiet dashboard notice at an appropriate moment |
| `advisory` | `memo` | A passive memo to read whenever they like |

If the model's output can't be parsed as the expected JSON, a keyword heuristic
takes over and defaults to `reminder` — safer than silently downgrading a
possibly-critical warning to a memo, and less alarming than forcing everything
into an alert.

---

## What this adds to the paper

The paper describes the pipeline and reports results. These are the parts built
here that go beyond it:

### Pipeline tracing

Every `POST /api/vehicle-query` runs inside a trace context, and every stage
anywhere downstream — embedding, both Qdrant searches, the augmentation
arithmetic, Postgres writes, the cloud LLM call — attaches to it automatically.
Traces are recorded the moment a request starts and stream to the dashboard
live over a websocket as each stage lands.

This turns the pipeline from a black box into something you can actually
inspect: which historical queries matched and with what weights, what the query
vector looked like before and after augmentation, what the assembled prompt
was, and where the time went.

### Knowledge base administration

The paper assumes a knowledge base exists. This builds the ingestion for it:
upload a PDF service manual and it's text-extracted, chunked, embedded, and
written to Qdrant and Postgres together. Entries are typed — `manual`,
`service_bulletin`, `recall_notice`, `forum`, `feedback`, `other` — and carry a
reliability score used in the paper's pre-ranking mechanism, so retrieval ranks
on relevance *and* trustworthiness rather than cosine similarity alone.

### Two-layer feedback with automatic reinsertion

- **Layer 1** — the driver marks a response helpful or not.
- **Layer 2** — an expert scores it 0–1.

Once the expert score crosses a threshold (default `0.7`), the query/response
pair is automatically reinserted into the RAG knowledge base, so the system
learns from its own resolved cases.

Selection is driven purely by the expert score, deliberately ignoring the
driver's signal — the paper notes that an expert may rate a driver-unhelpful
response highly when it's still an instructive example. Reinsertion is
idempotent; a pair is inserted at most once however often the score is edited.

### A driver-facing on-board unit

- Multi-step onboarding that builds a driver profile — age, experience,
  mechanical skill, physical limitations, preferences
- Multiple driver profiles with an active-driver switch, broadcast live to
  every connected client
- A fault simulator that replays real readings from **EngineFaultDB**
- Live ECU log streaming over websockets
- **Follow-up chat** — the driver can keep asking questions about a diagnosis
  rather than receiving one message and nothing more
- **Retry** on a failed diagnosis
- A delivery-channel indicator showing how the action module classified the
  fault

---

## Architecture

Five services. The split mirrors the paper's: everything under `onboard/` is
what would physically ship in the vehicle, everything under `backend/` is what
runs in the cloud.

| Service | Stack | Port | Role |
|---|---|---|---|
| `onboard-server` | Bun + React | 3000 | Driver profiles, fault capture, query generation, driver UI |
| `chat-llm` | llama.cpp + Gemma 3 1B | 8080 | The on-board query generator |
| `backend-server` | Bun + Hono | 4000 | RAG pipeline, retrieval, augmentation, feedback |
| `embedding-llm` | llama.cpp + Qwen3-Embedding-0.6B | 5173 | Text → 1024-dim vectors |
| `backend-dashboard` | TanStack Start | 5000 | Traces, knowledge base, feedback review |

**External services:** [Neon](https://neon.tech) for Postgres (historical
queries, knowledge entries, feedback) and [Qdrant
Cloud](https://qdrant.tech) for the two vector collections.

**The cloud LLM is provider-agnostic.** Anything speaking the OpenAI
chat-completions shape works — Groq, OpenAI, together.ai, or your own
llama.cpp/vLLM server. Switching is three environment variables, not a code
change. It defaults to Groq's `openai/gpt-oss-120b`.

---

## Running it locally

**Requirements:** Docker with Docker Compose. That's it — the model servers,
both application servers, and the dashboard all run as containers.

### 1. Get the models

The two GGUF weights aren't in the repo (they're ~1.4GB together). Download
them into place:

```bash
# On-board query generator (~770MB)
curl -L -o onboard/models/gemma-3-1b-it-Q4_K_M.gguf \
  https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf

# Embedding model (~610MB)
curl -L -o backend/models/Qwen3-Embedding-0.6B-Q8_0.gguf \
  https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF/resolve/main/Qwen3-Embedding-0.6B-Q8_0.gguf
```

### 2. Configure

```bash
cp backend/server/.env.example backend/server/.env
cp onboard/server/.env.example onboard/server/.env
```

Fill in `backend/server/.env` — you'll need a Neon database URL, a Qdrant
endpoint and API key, and a Groq API key. Every variable is documented in the
example file.

### 3. Run

```bash
docker compose up --build
```

| | |
|---|---|
| On-board unit (driver UI) | http://localhost:3000 |
| Backend dashboard | http://localhost:5000 |
| Backend API | http://localhost:4000 |

The root `docker-compose.yml` brings up all five services on one network.
`backend/docker-compose.yml` and `onboard/docker-compose.yml` bring up each
half on its own, if you only need one side.

### Seeding

```bash
cd backend/server
bun run scripts/seed.ts     # sample historical queries + knowledge entries
bun run scripts/topup.ts
```

### Tests

```bash
cd backend/server
bun test
```

---

## Configuration

### `backend/server/.env`

| Variable | Default | |
|---|---|---|
| `DATABASE_URL` | — | Neon Postgres connection string |
| `QDRANT_ENDPOINT` | — | Qdrant Cloud endpoint |
| `QDRANT_API_KEY` | — | Qdrant API key |
| `EMBEDDING_URL` | `http://localhost:8080` | llama.cpp server running with `--embedding` |
| `EMBEDDING_DIM` | `1024` | Must match the embedding model's output dimension |
| `QUERY_AUGMENTATION_ALPHA` | `0.5` | `α` in the augmentation equation |
| `HISTORICAL_QUERY_TOP_K` | `5` | How many same-prefix historical queries to blend in |
| `REINSERTION_EXPERT_SCORE_THRESHOLD` | `0.7` | Expert score at which a pair re-enters the knowledge base |
| `CLOUD_LLM_BASE_URL` | Groq | Any OpenAI-compatible endpoint |
| `CLOUD_LLM_MODEL` | `openai/gpt-oss-120b` | |
| `CLOUD_LLM_API_KEY` | — | Optional; omit for a local server needing no auth |

### `onboard/server/.env`

| Variable | Default | |
|---|---|---|
| `DATABASE` | `db.sqlite` | SQLite file for driver profiles and fault events |
| `BACKEND_URL` | `http://localhost:4000` | The cloud backend |
| `LLAMA_URL` | `http://localhost:8080` | The on-board llama.cpp server |

> `DATABASE_URL` must be a **Neon** endpoint — the backend uses
> `@neondatabase/serverless` over HTTP rather than a TCP Postgres driver, so a
> plain Postgres URL won't connect.

---

## Deploying

Every service has a production `Dockerfile` beside its `Dockerfile.dev`. The
two model images fetch their GGUF weights from HuggingFace at build time, so
nothing large lives in git and a cold start doesn't have to download a model.

Both application servers bind `$PORT` when the platform provides one and fall
back to their compose defaults otherwise.

### On Railway

Create one service per directory, all from this repo:

| Service | Root directory | Notes |
|---|---|---|
| `embedding-llm` | `backend/models` | Generate a **private** domain only |
| `chat-llm` | `onboard/models` | Generate a **private** domain only |
| `backend-server` | `backend/server` | Public domain |
| `backend-dashboard` | `backend/dashboard` | Public domain |
| `onboard-server` | `onboard/server` | Public domain; attach a volume for the SQLite file |

Then wire them together using Railway's private network:

```bash
# embedding-llm
BIND_HOST=::
PORT=5173

# chat-llm
BIND_HOST=::
PORT=8080

# backend-server
BIND_HOST=::
PORT=4000
EMBEDDING_URL=http://embedding-llm.railway.internal:5173
DATABASE_URL=...          # Neon
QDRANT_ENDPOINT=...
QDRANT_API_KEY=...
CLOUD_LLM_API_KEY=...     # Groq

# onboard-server
BIND_HOST=::
LLAMA_URL=http://chat-llm.railway.internal:8080
BACKEND_URL=http://backend-server.railway.internal:4000
DATABASE=/data/db.sqlite  # on the mounted volume

# backend-dashboard (build args — VITE_* is inlined at build time)
VITE_API_URL=https://<backend-server public domain>
VITE_API_URL_INTERNAL=http://backend-server.railway.internal:4000
```

`BIND_HOST=::` is not optional. **Railway's private network is IPv6-only**, so
a service bound to `0.0.0.0` is unreachable at `<service>.railway.internal` no
matter how healthy it looks — the deploy goes green and every internal call
times out. `PORT` is pinned on the services others address by name, so those
internal URLs stay predictable.

Keep the two model servers on private domains only. They have no
authentication — a public domain would expose free inference to anyone who
finds it.

**Sizing.** The model servers are the constraint. Gemma 3 1B at Q4_K_M needs
roughly 1.5GB of RAM and Qwen3-Embedding-0.6B at Q8 about 1GB, and both run on
CPU, so generation is slower than on the paper's Jetson Nano prototype. Five
services plus that memory footprint is beyond any free tier.

**Tune the model servers, or they will not work.** `LLAMA_EXTRA_ARGS` is passed
straight through to `llama-server`, and two defaults are actively harmful in a
container:

```bash
# embedding-llm
LLAMA_EXTRA_ARGS=--ctx-size 2048 --threads 8 --parallel 1 --batch-size 512 --ubatch-size 512

# chat-llm
LLAMA_EXTRA_ARGS=--ctx-size 8192 --threads 8 --parallel 1
```

- **Context size.** llama.cpp defaults to the model's full trained window and
  allocates a KV cache to match — 131072 tokens here. That is gigabytes for a
  0.6B embedding model, and the container is OOM-killed on startup with no
  error message, just a silent restart loop. Neither model needs more than a
  few thousand tokens for this workload.
- **Threads.** llama.cpp sizes its thread pool from the *host's* core count,
  not the container's share — it started 48 threads on a container entitled to
  a fraction of that. The oversubscription thrashes: prompt processing ran at
  **0.26 tokens/sec** before `--threads` was pinned. Set it to the vCPU count
  you are actually paying for.

If you'd rather not self-host the models, both are swappable for hosted
OpenAI-compatible endpoints by changing `EMBEDDING_URL` and `LLAMA_URL` — at
the cost of the "small model actually runs in the car" property that the paper
is about.

---

## Repository layout

```
car/
├── docker-compose.yml              all five services, one network
├── backend/                        ── cloud side ──
│   ├── models/Dockerfile           embedding model server (Qwen3-Embedding-0.6B)
│   ├── server/                     RAG pipeline + API (Bun, Hono)
│   │   ├── src/
│   │   │   ├── index.tsx           routes, trace middleware
│   │   │   ├── augmentation/       Eq. (1): historical blending
│   │   │   ├── knowledge/          retrieval, ingestion, PDF extraction
│   │   │   ├── llm/                prompt assembly + cloud LLM client
│   │   │   ├── action/             severity → delivery channel
│   │   │   ├── feedback/           expert-score reinsertion
│   │   │   ├── qdrant/             collections
│   │   │   ├── db/                 drizzle schemas
│   │   │   └── lib/                tracing, embeddings, vector math
│   │   └── scripts/                seed data
│   └── dashboard/                  traces, knowledge, feedback UI
└── onboard/                        ── vehicle side ──
    ├── models/Dockerfile           query-generator model server (Gemma 3 1B)
    └── server/
        └── src/
            ├── index.ts            routes, websockets
            ├── llama-cpp.ts        prompt construction + on-board inference
            ├── monitoring/         mock ECU (EngineFaultDB)
            ├── fault-simulator.ts
            ├── diagnostics/        diagnosis lifecycle
            └── frontend/           driver UI (React)
```

Further reading in [`docs/`](docs/):

- [`Project_Flow_Overview.md`](docs/Project_Flow_Overview.md) — the pipeline
  stage by stage, no code
- [`Dean_Presentation_Summary.md`](docs/Dean_Presentation_Summary.md) — a
  one-page non-technical briefing
- [`LLM-OBD_Quiz_Summary.md`](docs/LLM-OBD_Quiz_Summary.md)
- [`presentations/`](docs/presentations/) — slide decks

---

## Paper

> Y. Chen, G. Qiang, X. Xie, B. Wang, D. Cai, M. Diyan, T. Liu, and F. Fang,
> "Personalized Vehicular Health Diagnosis via Large Language Model,"
> *IEEE Communications Standards Magazine*, 2026.
> doi: [10.1109/MCOMSTD.2026.3674904](https://doi.org/10.1109/MCOMSTD.2026.3674904)

A copy is included at
[`docs/paper/`](docs/paper/Personalized_Vehicular_Health_Diagnosis_via_Large_Language_Model.pdf).
