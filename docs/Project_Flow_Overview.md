# LLM-OBD: In-Depth Flow Overview

This document walks through the full pipeline end-to-end — from a dashboard light turning on, to the driver getting a personalized explanation back. No code, just the mechanics of how each stage works and why it exists.

---

## The problem this flow solves

A check-engine light tells you almost nothing: "something's wrong," with no context on severity, cause, or what to do next. Worse, a novice driver and a trained mechanic get the exact same signal. This system replaces that black box with a two-sided AI pipeline — a small model in the car, a large model in the cloud — connected by a satellite link that can only carry small amounts of text at a time.

That bandwidth constraint is the reason almost every design decision below exists: every stage is about **compressing information down before transmission, then re-expanding it with context after it lands in the cloud.**

---

## Stage 0 — On-vehicle profile and pfault capture

The car maintains a **driver profile**: age, driving experience, mechanical skill level, and name. This isn't just metadata — it's what lets the same fault produce a completely different explanation for a nervous new driver versus an experienced mechanic.

When a fault occurs, the onboard system records the relevant sensor readings at that moment (e.g. engine temp, O2 sensor, fuel mixture) tied to that fault event.

## Stage 1 — Onboard summarization (Gemma 1B)

The car can't just dump raw sensor data and full profile info over satellite — that's too much data for a slow, expensive link, and the car might be completely out of terrestrial signal (remote highway, open ocean, disaster zone).

So the onboard system feeds the driver profile + fault data into a small local LLM (**Gemma 1B**, lightweight enough to run on cheap in-car hardware) and asks it to condense everything into a short text summary — something like _"Error: Engine. Driver: inexperienced. Is it safe to keep driving?"_

This is the only thing that gets transmitted off the vehicle. It's small enough to survive a slow satellite uplink.

## Stage 2 — Transmission to the backend

The condensed query travels over satellite to the backend server. Because it's just a few KB of text (not raw sensor streams or full profile data), it tolerates the latency and bandwidth limits of LEO/MEO/GEO satellite links that a full data dump never could.

## Stage 3 — Query embedding

The backend receives the short text summary and needs to search a knowledge base for similar past cases. Text can't be searched directly for "similarity," so the first step is **embedding**: feeding the summary into an embedding model that converts the text into a list of numbers (a vector) representing its meaning. Two texts about similar problems end up with numerically similar vectors — that's what makes semantic search possible.

## Stage 4 — Knowledge base similarity search

Using that embedded vector, the server queries a knowledge base of previously submitted cases (faults other drivers have reported) and retrieves the **top 5 most similar cases**. This is a form of nearest-neighbor search over the vector space — it finds cases that "mean" something close to this driver's issue, even if the wording is completely different.

## Stage 5 — Query augmentation

The original short summary is thin — it was deliberately compressed to survive the satellite link. Now that we're in the cloud with no bandwidth constraint, the 5 retrieved similar cases get stitched together with the original query into one larger paragraph. Think of it as "fattening up" the short summary with richer detail borrowed from cases that looked similar. This augmented query is more descriptive and gives the next retrieval step more to work with.

## Stage 6 — Solution retrieval

Using this fattened-up query, the server does a second retrieval pass — this time pulling the **top 5 resolved cases** with actual solutions attached, sourced from forums, service manuals, and repair reports. This is the step that grounds the response in real fixes rather than guesses.

## Stage 7 — Prompt assembly

Everything gathered so far — the original case, the 5 similar cases, and the 5 resolved cases with their solutions — gets stitched together into one large prompt. This is the full context the final model will reason over.

## Stage 8 — Response generation (GPT-OSS 120B)

That large assembled prompt is sent to the main cloud LLM (**GPT-OSS 120B** — a much larger, more capable model than the onboard Gemma 1B). It synthesizes everything: the fault, the similar cases, the known fixes, and the driver's profile/preferences, and produces one tailored response — written at the right technical level, with the right tone of urgency, for that specific driver.

This whole retrieval + augmentation process is what makes the system **RAG-based (Retrieval-Augmented Generation)** rather than just a chatbot guessing at an answer — the model is grounded in real prior cases and real solutions before it writes anything.

## Stage 9 — Response delivery back to the vehicle

The generated response travels back over the satellite link to the car.

## Stage 10 — On-vehicle display decision

The car receives the response and decides **how** to surface it based on the data from the cloud — e.g. severity of the fault determines whether it becomes:

- A critical dashboard alert / audio alarm,
- A quiet console notification, or
- A message routed to a companion app for later reading.

This severity-aware delivery means the driver isn't panicked by minor issues, but critical ones are impossible to miss. Note: the traditional warning-light system stays active underneath this whole pipeline as a fail-safe — if the AI pipeline or connection fails, the driver still gets the basic signal.

## Stage 11 — Feedback loop

The driver can like or dislike the response they received. This feedback closes the loop — over time it (along with expert review) can be used to improve which cases get surfaced and how responses are generated, making the knowledge base and retrieval smarter for future queries.

---

## Why the pipeline is shaped this way

| Constraint                                            | Design response                                                                                                              |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Satellite bandwidth is scarce/slow                    | Onboard model compresses everything into a short query before transmission (Stage 1)                                         |
| Short query lacks context                             | Cloud-side augmentation re-expands it using retrieved similar cases before the final model sees it (Stage 5)                 |
| LLMs hallucinate without grounding                    | Two-stage retrieval (similar cases, then resolved cases/solutions) grounds the final answer in real precedent (Stages 4 & 6) |
| One-size-fits-all explanations fail different drivers | Driver profile is carried through the entire pipeline and shapes the final generation (Stage 8)                              |
| AI or connectivity might fail                         | Legacy warning-light system remains active as a fallback (Stage 10)                                                          |
| Quality needs to improve over time                    | Like/dislike feedback feeds back into the system (Stage 11)                                                                  |

## End-to-end shape

```
[Car: driver profile + sensor fault]
        │
        ▼
[Onboard LLM (Gemma 1B): condense into short query]
        │  (satellite uplink — small payload)
        ▼
[Backend: embed query] → [vector]
        │
        ▼
[Knowledge base search #1: top 5 similar cases]
        │
        ▼
[Augment: stitch original query + 5 similar cases into fattened query]
        │
        ▼
[Knowledge base search #2: top 5 resolved cases + solutions]
        │
        ▼
[Assemble giant prompt: case + similar cases + solutions]
        │
        ▼
[Cloud LLM (GPT-OSS 120B): generate personalized response]
        │  (satellite downlink)
        ▼
[Car: decide display — dashboard / console / app, by severity]
        │
        ▼
[Driver: like / dislike feedback] → improves knowledge base over time
```
