Identity & licensing

What's your age? (numeric) → age
What kind of license do you hold? (learner / intermediate / full) → license_type
How many years have you been driving? (<1 / 1–3 / 3–10 / 10+) → years_experience

Mechanical proficiency — ask concretely, not abstractly
This is the field people are worst at self-rating honestly ("intermediate" means something different to everyone). Ask what they've actually done instead of how skilled they feel:

Which of these have you done yourself, without a mechanic? (multi-select)
Checked or topped up fluids
Changed the oil
Replaced an air filter or wiper blades
Replaced brake pads
Jump-started a battery
Diagnosed or repaired something more involved (e.g. fuel pump, suspension)
None of these

→ derive self_rated_proficiency from the answer pattern rather than asking "are you a novice/expert" directly.

Guidance preference 5. When something's wrong with your car, what do you actually want to know? (pick one)

Just tell me if it's safe to keep driving
Give me the technical details so I can look at it myself
A bit of both, depending on how serious it is

→ preferred_guidance_style

Physical considerations 6. Is there anything that affects what car maintenance you can physically do? (checkboxes + optional free text, all skippable)

Difficulty lifting heavy items
Vision limitations
Mobility or back limitations
Prefer not to say
Other: ___

→ physical_limitations

Maintenance relationship (optional, useful but not essential at cold-start) 7. How do you usually handle car maintenance? (I do it myself / I take it to a mechanic / A mix)

This last one is a nice-to-have, not a blocker — worth flagging that questions 1–6 alone are enough to seed a usable profile, and you don't want to gate first use behind a long form. Q7, and anything finer-grained than this, can just as easily get backfilled later once the driver's used the app a few times, which is exactly what the dynamic-refinement half of the profile is there for.
