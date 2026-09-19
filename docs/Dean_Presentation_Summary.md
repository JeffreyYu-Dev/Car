# LLM-OBD: Personalized Vehicular Health Diagnosis via LLM
### One-page briefing for presenting to the dean

---

## The 10-second pitch
Cars today just flash a vague "check engine" light. This project builds an AI co-pilot that reads the car's sensors and explains *what's actually wrong, how serious it is, and what to do about it* — in language matched to that specific driver's skill level. It also works over satellite, so it still functions on a remote highway, at sea, or after a disaster when there's no cell signal.

## The problem
- Modern cars are packed with sensors (engine temp, O2, fuel mixture, etc.) but only surface that data as generic warning lights.
- A novice driver and a mechanic get the *exact same* light — one panics, the other has no useful detail.
- In places without cell coverage (remote highways, maritime routes, disaster zones), even that limited system can't reach outside help.

## The idea
Split the AI into two parts so it works even on cheap hardware and slow connections:
1. **Small AI on the vehicle** ("query generator") — reads live sensor data + the driver's profile (experience, physical limitations, preferences) and turns it into one short text question, e.g. *"Error: Engine. Driver: inexperienced. Is it safe to keep driving?"*
2. **Large AI in the cloud** ("response generator") — receives that short question (even over satellite, since it's just a few KB of text, not raw data), looks up trustworthy repair knowledge (manuals, service bulletins, recall notices), and writes back a personalized, accurate answer.

Because only a tiny text query is transmitted — never raw sensor streams — this works over slow/expensive satellite links (LEO for emergencies, MEO for highways, GEO for ships), and keeps the driver's data more private.

## What makes it "smart," not just a chatbot
- **Retrieval-Augmented Generation (RAG):** the cloud AI looks up real repair knowledge before answering, instead of guessing — reduces hallucinated/wrong advice.
- **Personalization:** the same engine fault produces a different message for each driver — a reassuring plain-language note for a nervous new driver vs. diagnostic codes and part numbers for an experienced mechanic.
- **Severity-aware delivery:** critical faults trigger an urgent dashboard alert + audio alarm; minor issues become a quiet reminder or a memo the driver can check later — so people aren't scared by non-emergencies.
- **Learns over time:** driver feedback ("was this helpful?") plus expert review continuously improves the knowledge base.
- **Fails safe:** the old-fashioned warning light system stays active underneath, so nothing critical is ever hidden if the AI or connection fails.

## What was actually built (not just theory)
A working prototype was implemented, mirroring the published research design:
- **On-board unit:** a lightweight AI (Gemma3, 1B parameters) running on a low-power NVIDIA Jetson Nano — cheap enough to fit in any car.
- **Cloud server:** a larger AI (LLaMA, 30B parameters) running on GPU servers, generating the personalized responses.
- **Full pipeline:** sensor simulation → fault detection → query generation → knowledge retrieval → personalized response → a dashboard to visualize it all.
- Tested against a real automotive fault dataset (EngineFaultDB) across three fault types (lean mixture, rich mixture, sensor fault) and three distinct driver personas, successfully producing different, appropriate guidance for each.

## Why it matters
- **Safety:** clearer, faster guidance means better driving decisions in the moment.
- **Accessibility:** removes the "you need to be a mechanic to understand your car" barrier.
- **Coverage:** first system of its kind designed to keep working where there's no terrestrial network — relevant as satellite-connected vehicles (Starlink, 6G non-terrestrial networks) become mainstream.
- **Practical:** end-to-end response time is 1–2 minutes, which easily tolerates satellite delay, and it runs on affordable, low-power hardware — not exotic or expensive equipment.

## If the dean asks...
- **"Is this novel?"** — Yes; per the paper, it's the first work to combine LLM-driven personalization with satellite (non-terrestrial network) connectivity for vehicle diagnostics.
- **"Is this just theoretical?"** — No, there's a working hardware + software prototype (Jetson Nano + GPU server) with real test results, published in *IEEE Communications Standards Magazine*.
- **"What's next?"** — Real-world road testing, expanding the fault library, and refining satellite integration (LEO/MEO/GEO handoff).
