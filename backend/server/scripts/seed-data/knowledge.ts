import type { KnowledgeSourceType } from "@/knowledge/ingest";

export interface KnowledgeSeed {
  content: string;
  source: string;
  sourceType: KnowledgeSourceType;
  reliabilityScore: number;
}

// ~50 hand-written knowledge base entries spanning the same topic areas as
// the synthetic driver queries (see historical-queries.ts in this folder),
// so retrieval has real material to match against instead of an empty
// collection. Mix of manuals, service bulletins, recall notices, and forum
// threads, with reliabilityScore roughly reflecting how authoritative each
// source type is (manuals/bulletins high, forum posts lower/mixed).
export const KNOWLEDGE_SEEDS: KnowledgeSeed[] = [
  // --- Engine ---
  {
    source: "Engine Diagnostics Reference Manual, Ch. 3: Interpreting Air-Fuel Mixture Sensor Data",
    sourceType: "manual",
    reliabilityScore: 0.95,
    content: `Interpreting Engine Sensor Readings (MAP, TPS, CO, HC, O2, Lambda, AFR)

These readings vary with engine load, RPM, and driving conditions, so a single reading being modestly outside a typical range is not by itself alarming — especially with no active fault code reported. Look for a fault code actively being reported together with multiple correlated readings pointing the same direction before treating something as a specific condition, not an isolated single-metric deviation.

Lambda (air-fuel equivalence ratio) is the most direct indicator of mixture: Lambda of approximately 1.0 is the stoichiometric (balanced) mixture. Lambda meaningfully below 1 (richer than balanced) indicates a rich mixture — too much fuel relative to air. Lambda meaningfully above 1 (leaner than balanced) indicates a lean mixture — too much air relative to fuel. AFR (air-fuel ratio) tells the same story on a different scale: below roughly 14.7:1 is rich, above it is lean.

Rich mixture pattern: Lambda noticeably below 1, typically accompanied by elevated CO and HC together (unburned fuel escaping combustion). Consequences: fouled spark plugs, visible dark exhaust smoke, reduced fuel economy, and — if sustained — a real risk of catalytic converter overheating and damage from unburned fuel igniting downstream. A pronounced rich condition (Lambda well below 1, CO and HC clearly elevated together, especially with visible smoke or a strong fuel smell reported) is a real safety/component-damage concern and warrants prompt attention; avoid sustained hard acceleration until inspected.

Lean mixture pattern: Lambda noticeably above 1, often accompanied by reduced MAP and reduced power or hesitation under acceleration (the engine is starved for fuel relative to the air it's pulling in). Consequences: rough running, hesitation, and — if sustained — the engine runs hotter than normal, which can damage pistons, valves, or the catalytic converter over time. A lean condition is usually safe to drive gently in the near term but should be diagnosed soon rather than ignored indefinitely, since the risk is cumulative heat damage rather than an immediate stall/fire risk.

Sensor/voltage fault pattern: readings that are internally inconsistent with each other (e.g. a reading that doesn't move in the direction the other correlated readings imply it should, or a reading sitting at an implausible constant regardless of load/RPM changes) suggest the sensor or its wiring is faulty rather than a genuine air-fuel imbalance. In this case the underlying mechanical condition may be fine, but the readings can't be trusted for diagnosis until the sensor is checked — treat this as an active fault requiring inspection, but not one with a specific known hazard the way a confirmed rich or lean condition has, since the readings themselves are unreliable.

General severity guidance: a fault code being actively reported always means at least some follow-up is warranted — it should never be dismissed as nothing to act on. Whether it rises to an immediate safety concern depends on how far the correlated readings deviate from normal and whether they match a hazardous pattern (like the rich-mixture pattern above) rather than a manageable one (like a mild lean condition or an isolated sensor inconsistency).`,
  },
  {
    source: "2022 Sedan Owner's Manual, Ch. 4: Engine",
    sourceType: "manual",
    reliabilityScore: 0.95,
    content: `Engine Oil Pressure Warning Light

If the oil pressure warning light illuminates while driving, pull over safely as soon as possible and shut off the engine. Continuing to drive with low oil pressure can cause severe engine damage within minutes. Check the oil level using the dipstick once the engine has cooled for at least ten minutes. If the level is low, add the manufacturer-recommended oil grade in small increments and recheck. If the light remains on after topping off the oil, do not restart the engine — have the vehicle towed to a service center, as this may indicate a failed oil pump or a major internal leak rather than simple low oil.

Routine oil changes every 5,000-7,500 miles (or per the maintenance schedule for synthetic oil) prevent most oil-pressure-related failures. Always use the viscosity grade specified on the oil fill cap; using the wrong viscosity in extreme temperatures can itself trigger transient low-pressure warnings at cold start.`,
  },
  {
    source: "Service Bulletin SB-2021-114: Rough Idle / Misfire on 4-Cylinder Turbo Engines",
    sourceType: "service_bulletin",
    reliabilityScore: 0.9,
    content: `Some 2019-2022 model year vehicles equipped with the 2.0L turbocharged 4-cylinder engine may exhibit a rough idle, hesitation on acceleration, or an illuminated check engine light with stored codes P0300-P0304 (random/cylinder misfire). Root cause has been traced to carbon buildup on intake valves, a known characteristic of direct-injection engines that do not wash the valves with fuel.

Recommended repair: perform a walnut-shell media blasting intake valve cleaning service. Inspect and replace spark plugs if worn beyond 0.8mm gap. Verify PCV valve is not stuck open, as this can introduce excess oil vapor that accelerates carbon deposits. This bulletin supersedes prior guidance recommending fuel additives alone, which technicians found insufficient to resolve deposits already present.`,
  },
  {
    source: "r/MechanicAdvice forum thread: 'Engine shakes badly at idle, smooths out driving'",
    sourceType: "forum",
    reliabilityScore: 0.55,
    content: `Had almost the exact same issue on my car — turned out to be a cracked vacuum hose near the intake manifold. Engine runs lean at idle because of the extra unmetered air, which causes the rough shake, but once you're driving and off idle the effect is way less noticeable because the ratio of vacuum leak air to total airflow drops.

Cheap thing to check before paying a shop: spray a little carb cleaner or soapy water around the intake hoses and gaskets while the engine idles. If the idle changes (usually smooths out briefly) when you spray a spot, that's your leak. Also check the PCV grommet, mine was brittle and cracked after about 90k miles.`,
  },
  {
    source: "2020 Compact SUV Owner's Manual, Ch. 4: Engine",
    sourceType: "manual",
    reliabilityScore: 0.95,
    content: `Engine Overheating

If the temperature gauge moves into the red zone or a coolant temperature warning appears, turn off the air conditioning and turn on the heater to full to help draw heat away from the engine. Pull over as soon as safely possible. Do not open the coolant reservoir or radiator cap while the engine is hot — pressurized coolant can cause severe burns. Allow at least 30 minutes for the system to cool before checking coolant level.

Frequent overheating can indicate a failing thermostat, water pump, radiator blockage, or a leak in a hose or gasket. Continuing to drive an overheating vehicle risks warped cylinder heads and blown head gaskets, which are far more expensive to repair than the underlying cooling system issue.`,
  },

  // --- Brakes ---
  {
    source: "2021 Pickup Truck Owner's Manual, Ch. 5: Brakes",
    sourceType: "manual",
    reliabilityScore: 0.95,
    content: `Brake Pad Wear Indicators

Most brake pads include a wear indicator tab that produces a high-pitched squeal when the pad material is nearing minimum thickness — this is intentional and audible even with windows up, meant to alert the driver before metal-on-metal contact occurs. If you hear a metallic grinding sound rather than a squeal, the pads have likely worn through completely and the backing plate is contacting the rotor, which can score the rotor surface and significantly increase stopping distance.

Have brakes inspected immediately if you notice: squealing or grinding, a soft or spongy pedal, the vehicle pulling to one side under braking, or vibration through the steering wheel or pedal when braking (often indicates warped rotors).`,
  },
  {
    source: "Recall Notice R-2020-0847: Brake Booster Vacuum Hose",
    sourceType: "recall_notice",
    reliabilityScore: 1,
    content: `Certain 2018-2020 model year vehicles may have a brake booster vacuum hose that was manufactured with insufficient wall thickness. Over time and with engine heat exposure, the hose can crack, resulting in a loss of brake assist. Affected drivers may notice the brake pedal becoming significantly harder to press, requiring more force to stop the vehicle. While the vehicle remains capable of stopping using manual braking force, sudden loss of assist can be startling and increase stopping distance, particularly for smaller or less-experienced drivers.

Owners of affected vehicles will be notified by mail and should schedule a free inspection and hose replacement at an authorized dealer. Do not attempt to repair the vacuum hose with tape or aftermarket hose as a temporary fix; use the vehicle only as necessary until the recall repair is completed.`,
  },
  {
    source: "CarTalkForums thread: 'Brake pedal sinks to floor overnight'",
    sourceType: "forum",
    reliabilityScore: 0.5,
    content: `If your pedal is firm when you first press it but slowly sinks to the floor while holding steady pressure (like at a stoplight), that's a classic sign of a leaking master cylinder — internal seals are letting fluid bypass instead of building pressure. This is different from a pedal that's low from the start, which is usually just air in the lines or low fluid.

Don't drive on this for long, master cylinders can fail completely with little warning. Check your brake fluid reservoir level too — if it's dropping over weeks with no visible external leak, that's consistent with a master cylinder bypassing fluid internally into the brake booster.`,
  },
  {
    source: "Service Bulletin SB-2022-033: Rear Brake Squeal at Low Speed",
    sourceType: "service_bulletin",
    reliabilityScore: 0.88,
    content: `Some vehicles may exhibit an intermittent light squeal from the rear brakes at low speeds (under 10 mph) that disappears at highway speed, distinct from the standard wear-indicator squeal. This has been traced to a design characteristic of the OE ceramic pad compound combined with morning humidity/light surface rust on rotors, and is not indicative of a defect or reduced braking performance. No repair is necessary; the noise typically diminishes after the first few brake applications each morning as light surface rust is scraped off. If grinding, pulsation, or pulling accompanies the squeal, inspect for a mechanical cause per standard brake diagnostic procedure.`,
  },

  // --- Transmission ---
  {
    source: "2019 Sedan Owner's Manual, Ch. 6: Transmission",
    sourceType: "manual",
    reliabilityScore: 0.95,
    content: `Automatic Transmission Warning Signs

Delayed or harsh engagement when shifting from Park to Drive, slipping (engine RPM rises without a corresponding increase in speed), or shuddering around 30-45 mph can indicate low or degraded transmission fluid, a failing torque converter, or worn internal clutch packs. Transmission fluid should be checked (or, on sealed-for-life units, inspected by a technician) if any of these symptoms appear.

Never ignore a flashing "Check Trans" or gear-position indicator, as this typically indicates the transmission control module has entered a protective "limp mode" that restricts available gears to prevent further damage.`,
  },
  {
    source: "Service Bulletin SB-2020-201: CVT Shudder Under Light Acceleration",
    sourceType: "service_bulletin",
    reliabilityScore: 0.9,
    content: `Vehicles equipped with the continuously variable transmission (CVT) may exhibit a shudder or vibration felt through the floor and seat during light throttle acceleration between 30-45 mph, most noticeable when the transmission is cold. Root cause identified as degraded CVT fluid friction properties. Repair involves a full fluid exchange (not a partial drain-and-fill) using the specified low-friction CVT fluid, followed by a transmission control module relearn procedure. Using a non-CVT-specific automatic transmission fluid will worsen shudder symptoms and is not covered under warranty diagnosis if identified as the cause.`,
  },
  {
    source: "ManualTransmissionOwners forum: 'Grinding when shifting into 2nd gear'",
    sourceType: "forum",
    reliabilityScore: 0.5,
    content: `Grinding specifically on one gear (especially 2nd) while the others shift fine usually points to worn synchro rings on that gear rather than clutch issues — if it were the clutch not fully disengaging you'd usually notice some grinding on most/all gears, not just one. Try double-clutching into 2nd as a temporary workaround (clutch in, to neutral, clutch out, rev match, clutch in, into gear) but that's a band-aid, the synchros need replacement eventually. Also worth checking clutch fluid level/clutch pedal free play first since a partially disengaging clutch is a cheaper fix to rule out.`,
  },

  // --- Electrical ---
  {
    source: "2021 Hatchback Owner's Manual, Ch. 9: Electrical System",
    sourceType: "manual",
    reliabilityScore: 0.95,
    content: `Blown Fuses

If a specific electrical feature stops working (power windows, radio, interior lights), check the corresponding fuse in the fuse box before assuming a component failure — a blown fuse is often the actual cause and is inexpensive to replace. Fuse box locations and diagrams are provided on the inside of the fuse box cover and in the appendix of this manual. Always replace a fuse with one of the identical amperage rating; using a higher-rated fuse can allow excessive current to flow and damage wiring or components, creating a fire risk.

If a replacement fuse blows again immediately, do not keep replacing it — this indicates a short circuit that needs professional diagnosis.`,
  },
  {
    source: "Service Bulletin SB-2021-078: Intermittent Electrical Gremlins Traced to Corroded Ground Strap",
    sourceType: "service_bulletin",
    reliabilityScore: 0.85,
    content: `Vehicles presenting with multiple, seemingly unrelated intermittent electrical symptoms — flickering dash lights, radio resetting, power windows working slowly, random warning lights — should be inspected for a corroded or loose engine-to-body ground strap before deeper diagnosis of individual systems. A poor ground path increases resistance across the whole electrical system and can produce symptoms that look like several separate component failures. Clean ground strap contact points to bare metal, apply dielectric grease, and torque to specification. Many "unsolvable" intermittent electrical complaints are resolved by this single inspection.`,
  },
  {
    source: "AutoElectricalHelp forum: 'Random dash lights flickering, especially over bumps'",
    sourceType: "forum",
    reliabilityScore: 0.5,
    content: `Flickering that gets worse over bumps is almost always a connector/wiring issue rather than a component itself — something vibrating and making intermittent contact. Common culprits in my experience: battery terminal that's slightly loose or corroded (wiggle test it with the engine running and lights on, see if they flicker when you push on the terminal), or a body control module connector that's not fully seated. Start with the battery terminals since it's a 2-minute check and a surprisingly common cause.`,
  },

  // --- Battery ---
  {
    source: "2020 Sedan Owner's Manual, Ch. 9: Battery",
    sourceType: "manual",
    reliabilityScore: 0.95,
    content: `Battery Care and Jump-Starting

A vehicle battery typically lasts 3-5 years depending on climate and usage. Signs of a failing battery include slow engine crank, dimming headlights at idle, and dashboard warning lights flickering when accessories are used. Extreme heat degrades battery life faster than cold, though cold weather is when a marginal battery is most likely to fail to start the engine, since cold reduces available cranking amps while also thickening engine oil.

When jump-starting, connect cables in this order: positive to dead battery positive, positive to good battery positive, negative to good battery negative, negative to an unpainted metal ground point on the dead vehicle (not the dead battery's negative terminal, to avoid sparking near battery gases). Reverse the order when disconnecting.`,
  },
  {
    source: "BatteryForum thread: 'Battery keeps dying overnight even though car runs fine'",
    sourceType: "forum",
    reliabilityScore: 0.5,
    content: `If the car starts and runs fine but the battery is dead again after sitting overnight, that's a parasitic drain, not a charging system problem (alternator issues usually show up as the battery dying while driving or dashboard warnings, not overnight while parked). Common causes: an interior light or trunk light not shutting off fully, an aftermarket alarm/stereo installed incorrectly, or a module that isn't going to sleep properly. A parasitic draw test with a multimeter (in series with the negative terminal, car off, everything closed) can find it — normal resting draw is usually under 50 milliamps; anything much higher means something's staying awake.`,
  },
  {
    source: "Service Bulletin SB-2022-011: Battery Drain Traced to Telematics Module Not Entering Sleep Mode",
    sourceType: "service_bulletin",
    reliabilityScore: 0.88,
    content: `Some vehicles equipped with the connected-services telematics module may experience excessive parasitic battery drain (dead battery after 1-3 days of non-use) caused by a software issue preventing the module from entering low-power sleep mode after the vehicle is locked. Symptoms are most common in vehicles that sit unused for several days, such as a second car or one used only on weekends. Repair is a telematics module software update, available at dealers. This does not affect vehicles without the connected-services option.`,
  },

  // --- Tires ---
  {
    source: "2021 Crossover Owner's Manual, Ch. 8: Wheels and Tires",
    sourceType: "manual",
    reliabilityScore: 0.95,
    content: `Tire Pressure Monitoring System (TPMS)

The TPMS warning light illuminates when one or more tires is significantly underinflated relative to the recommended pressure listed on the driver's door jamb placard (not the maximum pressure printed on the tire sidewall, which is a different, higher number). Check all four tires, plus the spare if equipped with its own sensor, with a reliable gauge when tires are cold (driven less than one mile). A TPMS light that stays on after correcting pressure may indicate a slow leak, a failing sensor battery (sensors typically last 5-10 years), or a system needing relearn after tire rotation.

Driving on significantly underinflated tires increases the risk of a blowout from excess heat buildup and reduces fuel economy and handling.`,
  },
  {
    source: "TireTalk forum: 'Car pulls to the right, tires look fine'",
    sourceType: "forum",
    reliabilityScore: 0.5,
    content: `Pulling to one side with visually fine tires is usually alignment, not the tires themselves — get a four-wheel alignment before replacing anything. That said, also check tire pressure side to side (even a 5 psi difference can cause a mild pull) and inspect for uneven wear that isn't obvious at a glance, like feathering on the edge of the tread, which points to alignment/toe issues that have been present for a while. If the pull is strong and sudden rather than gradual, get the tires and brakes checked too — a dragging caliper on one side can also cause a pull.`,
  },
  {
    source: "Service Bulletin SB-2019-142: Premature Uneven Tire Wear on All-Wheel-Drive Models",
    sourceType: "service_bulletin",
    reliabilityScore: 0.85,
    content: `Some all-wheel-drive vehicles may show premature and uneven tire wear, particularly cupping on the rear tires, when tire rotation intervals specified in the maintenance schedule are not strictly followed. AWD systems are more sensitive to tire diameter mismatch between axles than front- or rear-wheel-drive vehicles, since even small circumference differences from uneven wear force the AWD coupling to work harder, accelerating wear further in a feedback loop. Strongly recommend rotating tires every 5,000 miles on AWD-equipped vehicles rather than the 7,500-mile interval sometimes used for 2WD models, and replacing all four tires together rather than one or two at a time where possible.`,
  },

  // --- Cooling System ---
  {
    source: "2020 Sedan Owner's Manual, Ch. 4: Cooling System",
    sourceType: "manual",
    reliabilityScore: 0.95,
    content: `Coolant Level and Leaks

Check the coolant reservoir level when the engine is cold; it should sit between the MIN and MAX marks. A reservoir that needs frequent topping off indicates a leak somewhere in the system — common points are the radiator, hoses, water pump, and heater core. Sweet-smelling exhaust, fog on the inside of the windshield with a sweet smell, or a wet passenger floor can indicate a leaking heater core, which is a more involved repair than a hose or radiator leak. Never mix coolant colors/types without confirming compatibility, as some formulations are not compatible and can form gel that clogs the cooling system.`,
  },
  {
    source: "CoolingSystemForum thread: 'White smoke from exhaust, coolant disappearing'",
    sourceType: "forum",
    reliabilityScore: 0.5,
    content: `White smoke (not to be confused with white vapor in cold weather, which is normal) combined with coolant disappearing with no visible external leak and no puddles under the car is a classic sign of a blown head gasket letting coolant into the combustion chamber. Other things to check: oil that looks like a milkshake (coolant mixing into oil), and a "chocolate milk" residue under the oil filler cap. If you see any of these together, stop driving the car and get it looked at — a blown head gasket can quickly turn into a much more expensive engine repair (warped head, hydrolocked cylinder) if you keep driving on it.`,
  },

  // --- Exhaust ---
  {
    source: "2019 Pickup Truck Owner's Manual, Ch. 4: Exhaust and Emissions",
    sourceType: "manual",
    reliabilityScore: 0.9,
    content: `Diesel Particulate Filter / Check Engine Light for Emissions

A check engine light accompanied by reduced power and a "Reduced Engine Power" or emissions-related message can indicate the diesel particulate filter (DPF) or catalytic converter needs regeneration or servicing. Highway driving at sustained speed for 20+ minutes allows an active DPF regeneration cycle to complete; frequent short trips prevent regeneration and can lead to filter clogging over time. If the warning persists after a sustained highway drive, have the system diagnosed rather than continuing to drive in reduced-power mode, as a fully clogged DPF or failed catalytic converter can cause more significant drivability issues.`,
  },
  {
    source: "Service Bulletin SB-2021-166: Rattling Noise from Underbody at Cold Start",
    sourceType: "service_bulletin",
    reliabilityScore: 0.85,
    content: `Some vehicles may produce a metallic rattling noise from underneath the vehicle for the first 10-30 seconds after a cold start, most noticeable in cold weather. This has been traced to a heat shield on the exhaust system with clips that loosen slightly as the metal cools overnight, allowing minor vibration until the engine settles into idle. Inspect heat shield clips/fasteners and tighten or replace as needed; this is a noise complaint only and does not indicate an exhaust leak or emissions issue unless accompanied by a hissing sound or a strong exhaust smell in the cabin.`,
  },

  // --- Suspension ---
  {
    source: "2021 Crossover Owner's Manual, Ch. 8: Suspension",
    sourceType: "manual",
    reliabilityScore: 0.9,
    content: `Suspension Noise and Ride Quality

A clunking noise over bumps, especially at low speed on rough pavement, often indicates worn sway bar end links or loose strut mounts, both relatively inexpensive repairs if caught early. A "bouncy" ride that continues for several oscillations after a bump (rather than settling after one or two) typically indicates worn shock absorbers or struts, which affects braking distance and handling stability in addition to comfort — this is a safety-relevant wear item, not just a comfort one, and should be addressed within a reasonable time rather than indefinitely postponed.`,
  },
  {
    source: "SuspensionGarage forum: 'Clunk over bumps, only when turning'",
    sourceType: "forum",
    reliabilityScore: 0.5,
    content: `Clunk that only happens over bumps while turning (not straight-line bumps) points more toward sway bar end links or bushings than struts — the sway bar is what's loaded differently during a turn. Struts/shocks usually clunk on straight-line bumps too, not just during turns. Cheap and easy to visually check: with the car on a lift or jack stands, grab the sway bar end link and try to wiggle it by hand; excessive play (should be minimal to none) means it's worn.`,
  },

  // --- Climate Control ---
  {
    source: "2020 Hatchback Owner's Manual, Ch. 7: Climate Control",
    sourceType: "manual",
    reliabilityScore: 0.9,
    content: `Air Conditioning Not Cooling

If the A/C blows air but it isn't cold, the system may be low on refrigerant due to a slow leak — A/C systems are sealed and shouldn't need refrigerant added regularly, so a need to recharge is itself a sign of a leak somewhere that should be found and repaired, not just topped off repeatedly. Other causes of weak cooling include a failing compressor clutch (listen for the compressor engaging with a click when A/C is turned on) or a blocked cabin air filter restricting airflow, which is a simple owner-serviceable part in most vehicles.`,
  },
  {
    source: "ClimateControlForum thread: 'AC blows cold on one side, warm on the other'",
    sourceType: "forum",
    reliabilityScore: 0.5,
    content: `Dual-zone systems that blow cold on one side and warm on the other (when both zones are set to the same cold temp) usually point to a stuck or failing blend door actuator on the warm side rather than a refrigerant issue — if it were low refrigerant, both sides would usually be affected. You can sometimes hear a faint clicking or motor-hunting sound from behind the dash near the affected side when you change the temp setting, which is the actuator trying and failing to move the door.`,
  },

  // --- Fuel System ---
  {
    source: "2019 Sedan Owner's Manual, Ch. 4: Fuel System",
    sourceType: "manual",
    reliabilityScore: 0.9,
    content: `Hard Starting or Stalling

Difficulty starting after refueling, or stalling shortly after startup, can indicate a failing fuel pump, a clogged fuel filter (on vehicles with a serviceable filter), or contaminated fuel. If symptoms began immediately after refueling at an unfamiliar station, water or debris contamination in the fuel is possible, though modern fuel systems and filters are generally resilient to this. A fuel pump nearing failure often produces a whining noise from the rear of the vehicle (near the fuel tank) that changes pitch, audible with a window down before starting the engine.`,
  },
  {
    source: "Service Bulletin SB-2020-089: Hesitation on Acceleration Traced to Fuel Injector Deposits",
    sourceType: "service_bulletin",
    reliabilityScore: 0.85,
    content: `Vehicles with over 60,000 miles on the original fuel injectors may develop a hesitation or stumble under acceleration, particularly from a stop, caused by injector spray pattern degradation from deposit buildup. Using consistently low-quality fuel (below Top Tier detergent standards) accelerates this. Recommended service: professional fuel injection cleaning service (not a simple additive poured in the tank, which has limited effect on injectors already fouled). Switching to Top Tier detergent gasoline going forward is recommended to slow future deposit formation.`,
  },

  // --- Dashboard Warning Lights ---
  {
    source: "2021 Sedan Owner's Manual, Ch. 3: Instrument Panel Warning Lights",
    sourceType: "manual",
    reliabilityScore: 0.95,
    content: `Check Engine Light: Steady vs. Flashing

A steady check engine light indicates a fault has been detected that should be diagnosed soon but generally does not require immediate stopping — the vehicle can typically be driven to a service center. A flashing or blinking check engine light indicates an active engine misfire severe enough to risk damaging the catalytic converter, and the vehicle should be driven minimally (ideally not at all) until diagnosed, avoiding hard acceleration and high RPM. This distinction — steady versus flashing — is the single most important thing to communicate to a driver about this warning light, since the appropriate response differs significantly.`,
  },
  {
    source: "DashLightsExplained forum: 'What does a wrench symbol with exclamation point mean'",
    sourceType: "forum",
    reliabilityScore: 0.5,
    content: `The wrench-with-exclamation-point icon varies by manufacturer but is commonly either a "maintenance due" reminder (non-urgent, just means it's time for scheduled service) or, on some makes, a "reduced power / powertrain fault" indicator that's more urgent — the vehicle may go into a limp mode with reduced acceleration. Check your specific owner's manual's warning light glossary since this symbol isn't standardized across brands the way the check engine light shape is. If the car's power feels noticeably reduced along with the light, treat it as the urgent version regardless of what it technically means.`,
  },

  // --- Steering ---
  {
    source: "2020 SUV Owner's Manual, Ch. 8: Steering",
    sourceType: "manual",
    reliabilityScore: 0.9,
    content: `Steering Wheel Vibration or Stiffness

Vibration felt in the steering wheel at highway speed usually points to a wheel balance or alignment issue rather than the steering system itself. Steering that suddenly becomes very stiff or hard to turn, especially at low speed like parking, can indicate a power steering fluid leak (on hydraulic systems) or an electric power steering fault (on EPS-equipped vehicles, often accompanied by a steering warning light). Stiff steering should be addressed promptly — while the vehicle remains steerable using more force, sudden unexpected stiffness while already turning (such as in a parking lot) can catch a driver off guard.`,
  },

  // --- Exterior Lights ---
  {
    source: "2019 Hatchback Owner's Manual, Ch. 9: Lighting",
    sourceType: "manual",
    reliabilityScore: 0.9,
    content: `Headlight and Taillight Bulb Replacement

Modern halogen headlight bulbs typically last 500-1,000 hours of use; LED headlight units, where equipped, are generally not user-serviceable and require a shop visit if a section fails. When a taillight or brake light bulb burns out, replace it promptly — driving with a non-functioning brake light significantly increases rear-end collision risk since following drivers lose a key braking cue, and it's also a common cause of being pulled over. If both bulbs on one side fail simultaneously, suspect a wiring or ground issue rather than two coincidental bulb failures.`,
  },

  // --- Wipers & Visibility ---
  {
    source: "2020 Compact Car Owner's Manual, Ch. 9: Wipers and Visibility",
    sourceType: "manual",
    reliabilityScore: 0.9,
    content: `Streaking or Chattering Wipers

Wiper blades typically need replacement every 6-12 months depending on climate exposure. Streaking indicates a worn or cracked rubber edge; chattering (a juddering motion rather than a smooth wipe) can indicate a worn blade, a bent wiper arm not applying even pressure, or a windshield with a film of residue that needs cleaning with glass cleaner before judging the blades themselves. In freezing conditions, always ensure wiper blades are not frozen to the windshield before operating the wiper switch, as this can burn out the wiper motor.`,
  },

  // --- Unusual Noise ---
  {
    source: "NoiseDiagnosis forum: 'Squeaking noise that changes with wheel speed, not engine speed'",
    sourceType: "forum",
    reliabilityScore: 0.5,
    content: `A good first diagnostic step for any noise complaint: does it change with engine RPM (in park, rev the engine — if the noise speeds up, it's engine/accessory related) or with vehicle/wheel speed (if it only happens while moving and changes pitch with road speed regardless of RPM, it's wheel bearing, tire, or drivetrain related)? A wheel bearing noise often changes character when you weight-shift the car — humming that gets louder in a turn in one direction and quieter in the other is a classic wheel bearing symptom, since turning shifts load onto the bearing on the outside of the turn.`,
  },

  // --- Fluid Leak ---
  {
    source: "2021 SUV Owner's Manual, Ch. 4: Identifying Fluid Leaks",
    sourceType: "manual",
    reliabilityScore: 0.9,
    content: `Identifying Fluid Leaks by Color and Location

A puddle under the vehicle can often be identified by color and consistency: clear-to-light-yellow and watery is likely condensation from the air conditioning system and is normal in humid weather. Green, orange, or pink and slightly sticky is typically coolant. Dark brown or black and oily is engine oil. Red and thin is usually transmission or power steering fluid. Yellowish and thick, often near a wheel, can be brake fluid, which is a safety-critical leak that should be addressed immediately rather than monitored. Note the approximate location under the vehicle (front, center, rear; driver or passenger side) as this helps narrow down the source before a technician inspects it.`,
  },

  // --- Safety Restraint System ---
  {
    source: "Recall Notice R-2019-0512: Airbag Control Module Software",
    sourceType: "recall_notice",
    reliabilityScore: 1,
    content: `Certain model year vehicles may have airbag control module software that, under specific rare crash conditions, could fail to deploy the front airbags as intended. This recall involves a software update to the airbag control module, performed free of charge at authorized dealers, and does not require part replacement. Owners will be notified by mail. If the airbag warning light on the instrument panel is illuminated continuously, this is a separate, immediate concern (indicating the system has detected a fault and may have disabled airbag deployment) and the vehicle should be inspected promptly regardless of recall status.`,
  },
  {
    source: "2020 Sedan Owner's Manual, Ch. 2: Safety Restraint Systems",
    sourceType: "manual",
    reliabilityScore: 0.95,
    content: `Airbag Warning Light

If the airbag warning light illuminates and stays on after startup (a brief illumination during the startup bulb check is normal), the airbag system has detected a fault and one or more airbags may not deploy in a collision. Common causes include a fault in the seat occupancy sensor, a loose connector under a seat (sometimes from items being pushed under the seat and disturbing wiring), or a failing clockspring in the steering column. Have this diagnosed promptly — do not disregard it as a minor warning, since a non-functioning airbag system directly affects occupant safety in a crash.`,
  },

  // --- Fuel Economy ---
  {
    source: "FuelEconomyForum thread: 'MPG dropped noticeably, nothing else seems wrong'",
    sourceType: "forum",
    reliabilityScore: 0.5,
    content: `A gradual, unexplained MPG drop with no other symptoms is often tire pressure (check it, it's the easiest thing to rule out and a surprisingly common cause), followed by a dragging brake caliper (feel if one wheel is noticeably hotter than the others after a drive), a clogged air filter, or an oxygen sensor starting to degrade before it's bad enough to trigger a check engine light. Also consider whether your driving conditions changed — colder weather alone (short trips, more idling to warm up, winter blend fuel with slightly lower energy content) can drop MPG noticeably without anything being wrong with the car.`,
  },
  {
    source: "2021 Hybrid Sedan Owner's Manual, Ch. 4: Maximizing Fuel Economy",
    sourceType: "manual",
    reliabilityScore: 0.9,
    content: `Factors Affecting Fuel Economy

Tire pressure below the recommended level increases rolling resistance and reduces fuel economy measurably even at a 5-8 psi deficit. Aggressive acceleration and braking reduce real-world fuel economy significantly compared to smooth, anticipatory driving, particularly in hybrid models where regenerative braking efficiency is highest with gradual deceleration. Roof racks and carriers increase aerodynamic drag and reduce highway fuel economy even when empty; remove them when not in use. Short trips under 5 miles rarely allow the engine and catalytic converter to reach full operating efficiency, disproportionately lowering average MPG for drivers who mostly make short local trips.`,
  },

  // --- Infotainment & Connectivity ---
  {
    source: "2021 Sedan Owner's Manual, Ch. 10: Infotainment System",
    sourceType: "manual",
    reliabilityScore: 0.85,
    content: `Infotainment System Freezing or Unresponsive

If the touchscreen infotainment system becomes unresponsive or freezes, a soft reset can usually be performed by holding the power button (or home + volume down, depending on system) for 10-15 seconds, or by turning the vehicle off, waiting 30 seconds, and restarting. This does not affect vehicle drivability, as the infotainment system operates independently from engine and safety systems. If freezing is frequent, check for available software updates, which are periodically released to address stability issues, via the settings menu or at a dealer visit.`,
  },
  {
    source: "InfotainmentHelp forum: 'Phone won't stay connected via Bluetooth, keeps dropping'",
    sourceType: "forum",
    reliabilityScore: 0.5,
    content: `If Bluetooth keeps dropping intermittently rather than failing to connect at all, try forgetting the pairing on both the phone and the car and re-pairing from scratch rather than just reconnecting — corrupted pairing profiles are a common cause and a fresh pairing often fixes it entirely. Also worth checking if your phone's OS has a recent update pending; several phone manufacturers have shipped Bluetooth stack bugs in specific OS versions that caused exactly this symptom across many different car brands, not specific to one manufacturer.`,
  },

  // --- Extra general / cross-cutting ---
  {
    source: "2022 Full-Size SUV Owner's Manual, Ch. 12: Scheduled Maintenance",
    sourceType: "manual",
    reliabilityScore: 0.95,
    content: `Scheduled Maintenance Overview

Following the scheduled maintenance intervals in this manual (available in the maintenance minder display or the printed schedule) is the single most effective way to avoid unexpected breakdowns. Key intervals: engine oil and filter every 5,000-10,000 miles depending on oil type and driving conditions; cabin and engine air filters every 15,000-30,000 miles or annually; brake fluid every 2-3 years regardless of mileage, since brake fluid absorbs moisture over time even without leaks, lowering its boiling point; coolant every 5 years or 60,000-100,000 miles depending on coolant type; transmission fluid per the specific transmission's schedule, which varies significantly by model. "Severe" driving conditions (frequent short trips, extreme temperatures, towing, dusty roads) warrant the shorter end of these intervals.`,
  },
  {
    source: "Service Bulletin SB-2022-058: Musty Odor from HVAC Vents at Startup",
    sourceType: "service_bulletin",
    reliabilityScore: 0.85,
    content: `A musty or mildew-like odor from the HVAC vents, most noticeable when the A/C or heat is first turned on after the vehicle has sat, is commonly caused by mold/mildew growth on the evaporator core, which stays damp after A/C use and can develop odor-causing growth in humid climates. Recommended remedy: replace the cabin air filter if not done recently, and run the blower on fresh air (not recirculate) for a few minutes with the A/C off before shutting the vehicle off, allowing the evaporator to dry. An evaporator/HVAC system antimicrobial treatment, available at most shops, can also resolve persistent odor.`,
  },
  {
    source: "2018 Sports Coupe Owner's Manual, Ch. 4: Engine — Cold Weather Starting",
    sourceType: "manual",
    reliabilityScore: 0.9,
    content: `Cold Weather Starting Difficulty

Slow cranking or failure to start in cold weather is most commonly a marginal battery that's fine in warm weather but cannot deliver sufficient cranking amps once temperatures drop, since battery capacity decreases significantly in cold temperatures while the engine oil simultaneously thickens and requires more cranking force to turn over. Block heaters, where equipped or installed aftermarket, can help significantly in very cold climates by keeping engine oil warmer overnight. If the vehicle cranks normally but doesn't catch/start, this points away from the battery and toward fuel delivery or ignition issues instead.`,
  },
  {
    source: "TransmissionTalk forum: 'Transmission fluid looks dark red/brown, is that normal?'",
    sourceType: "forum",
    reliabilityScore: 0.5,
    content: `Fresh ATF is usually bright red/pink and slightly translucent. Dark red or light brown with a slightly burnt smell is aging fluid that's due for a change but not necessarily an emergency. Dark brown/black, opaque, and a strong burnt smell is more concerning — that level of degradation can mean the fluid has been overheated at some point or is very overdue, and clutch material may be breaking down internally. If you can smell it clearly burnt from a few inches away, get it serviced soon rather than waiting for the next scheduled interval.`,
  },
  {
    source: "Recall Notice R-2021-0293: Fuel Pump Relay May Overheat",
    sourceType: "recall_notice",
    reliabilityScore: 1,
    content: `Certain vehicles may be equipped with a fuel pump relay that can overheat under sustained high electrical load, in rare cases posing a fire risk in the engine bay fuse box area. Affected owners will be notified by mail and should schedule a free relay replacement at an authorized dealer as soon as possible. In the interim, if a burning smell is noticed near the dashboard or engine bay, or the vehicle stalls unexpectedly, park the vehicle away from structures and other vehicles and contact the dealer immediately rather than continuing to drive it.`,
  },
  {
    source: "2020 Minivan Owner's Manual, Ch. 8: Suspension and Ride Height",
    sourceType: "manual",
    reliabilityScore: 0.9,
    content: `Vehicle Sitting Lower on One Corner

If the vehicle visibly sits lower at one corner compared to the other three, suspect a broken or badly sagging coil spring, or on air-suspension-equipped models, a leaking air spring or failed compressor. A broken coil spring can sometimes be heard as a clunk over bumps localized to that corner and, in severe cases, the broken spring coil can contact the tire during suspension travel, causing a rubbing noise and abnormal tire wear. This is a drivability and safety concern that should be inspected promptly rather than treated as a cosmetic issue.`,
  },
  {
    source: "BrakeTalk forum: 'Brakes feel fine but there's a burning smell after a long downhill drive'",
    sourceType: "forum",
    reliabilityScore: 0.5,
    content: `A sharp, acrid burning smell after extended downhill braking (mountain roads, long grades) is usually overheated brake pads/rotors from riding the brakes continuously rather than a mechanical failure — pull over somewhere safe and let them cool for 15-20 minutes rather than continuing to drive on them hot, since overheated brakes lose effectiveness (brake fade) right when you need them most. For future long descents, use lower gears (manually selected if available) to let engine braking do more of the work, applying the brakes firmly in shorter bursts rather than riding them continuously.`,
  },
  {
    source: "Service Bulletin SB-2019-077: Delayed Power Window Operation in Cold Weather",
    sourceType: "service_bulletin",
    reliabilityScore: 0.8,
    content: `Some vehicles may exhibit slow or delayed power window operation in cold weather (below approximately 20°F), most noticeable on the first use of the day. This is caused by increased window regulator mechanism friction and door seal stiffness at low temperature interacting with the window's anti-pinch safety feature, which reduces motor force when resistance is detected, and is not a component defect. Operation typically returns to normal after the first few cycles as the door warms slightly and seals soften. No repair is necessary unless the issue persists at normal temperatures.`,
  },
  {
    source: "2019 Electric Sedan Owner's Manual, Ch. 5: High-Voltage Battery",
    sourceType: "manual",
    reliabilityScore: 0.95,
    content: `EV Range Reduction in Cold Weather

It is normal and expected for an electric vehicle's usable range to decrease in cold weather, sometimes by 20-40%, due to both reduced battery chemical efficiency at low temperatures and increased energy use for cabin heating (which, unlike a combustion engine, cannot rely on waste heat). Preconditioning the cabin and battery while still plugged in (before departure) uses grid power rather than battery power for the initial warm-up, preserving more range for driving. This is not a sign of battery degradation; compare range over a full season rather than day-to-day cold-weather readings when assessing long-term battery health.`,
  },
  {
    source: "EVOwnersForum thread: '12V battery died even though the traction battery shows charge'",
    sourceType: "forum",
    reliabilityScore: 0.5,
    content: `EVs and hybrids have a separate small 12V battery (like a normal gas car) that powers accessories, computers, and the systems that wake up the main traction battery — the big battery being charged doesn't help you if the little 12V one dies, since the car can't even boot up its systems to start without it. This trips up a lot of new EV owners. If the car is completely dead/unresponsive (not even accessory power) despite the app showing plenty of range, it's almost certainly the 12V battery, not the main pack, and it can be jump-started from the front similar to a conventional car (check your manual for the correct jump point, some EVs have a dedicated one since the engine bay layout is different).`,
  },
  {
    source: "2021 Compact SUV Owner's Manual, Ch. 4: Emissions and Check Engine Light",
    sourceType: "manual",
    reliabilityScore: 0.9,
    content: `Loose Gas Cap Triggering Check Engine Light

One of the most common, least serious causes of an illuminated check engine light is a loose, cross-threaded, or damaged fuel filler cap, which allows the evaporative emissions system to detect a leak (the system is sealed and pressure/vacuum tested). If the check engine light appears shortly after refueling, stop and ensure the cap is tightened until it clicks (typically 3 full turns). The light may take several drive cycles to turn off on its own even after the cap is properly sealed, as the system needs to complete its self-test successfully a few times before clearing the code.`,
  },
  {
    source: "Service Bulletin SB-2020-145: Sunroof Wind Noise at Highway Speed",
    sourceType: "service_bulletin",
    reliabilityScore: 0.8,
    content: `Some vehicles equipped with a panoramic sunroof may produce a low-frequency wind buzzing or fluttering noise at highway speeds (typically 55-70 mph) with the sunroof fully closed. This has been traced to a wind deflector alignment tolerance issue. Repair involves adjusting or shimming the wind deflector per the technical procedure. Temporarily, opening the sunroof slightly and reclosing it fully (recycling the seal) can reduce the noise in some cases, though this is not a permanent fix. This is a noise-only concern and does not indicate a water leak risk unless accompanied by visible seal damage.`,
  },
  {
    source: "ParkingSensorForum thread: 'Backup camera image is blurry/distorted only in rain'",
    sourceType: "forum",
    reliabilityScore: 0.45,
    content: `Blurry or streaky backup camera image specifically in rain (fine otherwise) is almost always water beading/streaking directly on the camera lens itself, not an electronic fault — these cameras are small and mounted low/exposed, so they get direct road spray. Wipe the lens with a microfiber cloth; some owners apply a small dab of rain-repellent glass treatment (like the kind used on windshields) directly to the camera lens cover, which noticeably helps water bead off cleanly instead of smearing across the image.`,
  },
  {
    source: "2020 Sedan Owner's Manual, Ch. 5: Steering and Handling",
    sourceType: "manual",
    reliabilityScore: 0.9,
    content: `Steering Wheel Off-Center After Alignment or Repair

If the steering wheel is not centered when driving straight (e.g., the wheel is rotated slightly even though the car tracks straight), this is a cosmetic/comfort issue from an alignment that adjusted toe without re-centering the wheel, not a safety issue on its own — but it should still be corrected, since a driver may unconsciously compensate for it in a way that affects reaction time in an emergency maneuver. This is a quick adjustment for a shop with alignment equipment and is often covered as a comeback under a recent alignment service; it should not require a new alignment from scratch.`,
  },
  {
    source: "Recall Notice R-2022-0104: Rearview Camera Image May Not Display",
    sourceType: "recall_notice",
    reliabilityScore: 1,
    content: `Certain vehicles may experience a software condition where the rearview camera image fails to display on the center screen when the vehicle is shifted into reverse, due to a processing delay in the infotainment software under specific conditions. Federal regulations require a functioning rearview image when backing up. A software update to resolve the delay is available free of charge at authorized dealers. Owners will be notified by mail. Until the update is performed, drivers should exercise added caution when reversing, using mirrors and a visual check rather than relying solely on the camera.`,
  },
];
