// Generates ~400 synthetic driver queries for seeding the historical_queries
// table/collection, so the augmentation module (same-prefix historical
// matching, see src/augmentation) has real prior queries to match against
// instead of an empty collection. Templated rather than hand-written one by
// one: each of the 20 error-type categories below has ~10 distinct query
// "shapes" with a couple of fill-in-the-blank slots, combined with vehicle/
// mileage/condition pools to reach 20 unique queries per category.

export interface DriverExperience {
  label: string; // used verbatim in the prefix, e.g. "Novice"
}

export const DRIVER_EXPERIENCES = ["Novice", "Intermediate", "Experienced"] as const;
export type DriverExperienceLabel = (typeof DRIVER_EXPERIENCES)[number];

export interface VehicleSeed {
  make: string;
  model: string;
}

export const VEHICLES: VehicleSeed[] = [
  { make: "Toyota", model: "Camry" },
  { make: "Toyota", model: "RAV4" },
  { make: "Toyota", model: "Corolla" },
  { make: "Honda", model: "Civic" },
  { make: "Honda", model: "CR-V" },
  { make: "Honda", model: "Accord" },
  { make: "Ford", model: "F-150" },
  { make: "Ford", model: "Escape" },
  { make: "Ford", model: "Explorer" },
  { make: "Chevrolet", model: "Silverado" },
  { make: "Chevrolet", model: "Equinox" },
  { make: "Chevrolet", model: "Malibu" },
  { make: "Nissan", model: "Altima" },
  { make: "Nissan", model: "Rogue" },
  { make: "Jeep", model: "Grand Cherokee" },
  { make: "Jeep", model: "Wrangler" },
  { make: "Subaru", model: "Outback" },
  { make: "Subaru", model: "Forester" },
  { make: "BMW", model: "3 Series" },
  { make: "Mercedes-Benz", model: "C-Class" },
  { make: "Hyundai", model: "Elantra" },
  { make: "Hyundai", model: "Tucson" },
  { make: "Kia", model: "Sportage" },
  { make: "Volkswagen", model: "Jetta" },
  { make: "Mazda", model: "CX-5" },
  { make: "Tesla", model: "Model 3" },
  { make: "Ram", model: "1500" },
  { make: "GMC", model: "Sierra" },
  { make: "Dodge", model: "Charger" },
  { make: "Honda", model: "Odyssey" },
];

const MILEAGES = [
  "12,000", "18,500", "24,000", "31,000", "38,500", "45,000", "52,000",
  "61,000", "68,500", "74,000", "82,000", "91,500", "97,000", "105,000",
  "118,000", "126,500", "134,000", "142,000", "155,000", "168,000",
];

const TIMEFRAMES = [
  "the past couple of days", "about a week now", "the last month",
  "just today", "the past couple weeks", "a few days ago", "this morning",
  "the last three or four drives", "since yesterday", "on and off for a while now",
];

const CONDITIONS = [
  "in cold weather", "on the highway", "in stop-and-go traffic",
  "right after starting the car", "after driving for about 20 minutes",
  "when it's raining", "going up a hill", "when turning", "at idle",
  "randomly, with no clear pattern", "when braking", "under hard acceleration",
  "on rough roads", "first thing in the morning", "after a long drive",
];

export interface QueryTemplate {
  errorType: string;
  templates: string[];
}

export const QUERY_TEMPLATES: QueryTemplate[] = [
  {
    errorType: "Engine",
    templates: [
      "My engine has been shaking pretty badly at idle for {timeframe}, but it smooths out once I start driving. Is this something I need to get looked at soon?",
      "There's a rattling/knocking noise coming from the engine {condition}, started around {mileage} miles. Should I keep driving it?",
      "Check engine light came on {timeframe} and it's just staying steady, not flashing. Car seems to drive fine otherwise. How urgent is this?",
      "My check engine light is flashing, not just staying on, {condition}. What should I do right now?",
      "Engine seems to hesitate or stumble when I accelerate from a stop, especially {condition}. Started {timeframe}.",
      "I'm noticing white smoke from the exhaust {condition} and my coolant level keeps dropping. Is this serious?",
      "The engine cranks for a really long time before it actually starts, {condition}. Been happening for {timeframe}.",
      "My temperature gauge crept into the red zone {condition} today. I pulled over right away, what should I do next?",
      "Engine idle feels really rough and inconsistent, like it's about to stall {condition}. Mileage is around {mileage}.",
      "I smell something sweet, almost like syrup, coming from under the hood {condition}. Coolant reservoir looked low too.",
    ],
  },
  {
    errorType: "Brakes",
    templates: [
      "I'm hearing a high-pitched squeal from the brakes {condition}, been going on for {timeframe}. Is that just the wear indicator?",
      "Now I'm hearing a grinding metal-on-metal sound when I brake, {condition}. Started {timeframe}.",
      "Brake pedal feels spongy and sinks lower than usual, especially {condition}. Mileage around {mileage}.",
      "Car pulls hard to one side whenever I brake, {condition}. Noticed this {timeframe}.",
      "Steering wheel shakes/vibrates specifically when I'm braking {condition}. Been happening for {timeframe}.",
      "My brake pedal feels firm at first but slowly sinks to the floor when I hold it at a stoplight. Is that dangerous?",
      "There's a burning smell coming from the wheels after {condition} driving. Should I stop and let it cool?",
      "Brake warning light came on the dash {condition}, mileage is about {mileage}. What does that usually mean?",
      "It feels like I have to press the brake pedal way harder than normal to get the car to stop, {condition}.",
      "Rear brakes squeal lightly {condition} but it goes away after a few minutes of driving. Normal or not?",
    ],
  },
  {
    errorType: "Transmission",
    templates: [
      "There's a delay of a second or two before the car actually moves after I shift into Drive, {condition}. Started {timeframe}.",
      "Transmission feels like it's slipping, engine revs up but the car doesn't speed up right away, {condition}.",
      "I get a hard, jerky shift feeling between gears {condition}, around {mileage} miles now.",
      "Car shudders/vibrates specifically between 30-45 mph under light acceleration. Started {timeframe}.",
      "Grinding noise specifically when shifting into one particular gear, {condition}. Other gears seem fine.",
      "My 'Check Trans' light started flashing {condition} and the car feels like it's stuck in one gear now.",
      "Automatic transmission fluid looks dark brown and smells a little burnt. Is that something to worry about?",
      "Transmission makes a whining noise that changes with speed, {condition}. Mileage is around {mileage}.",
      "Car won't shift into reverse smoothly, there's a clunk each time, {condition}.",
      "CVT transmission shudders under light acceleration {condition}, especially when the car is still cold.",
    ],
  },
  {
    errorType: "Electrical",
    templates: [
      "My power windows suddenly stopped working on one side {condition}. Checked and it's not the switch itself I don't think.",
      "Dashboard lights keep flickering randomly, {condition}. Been going on for {timeframe}.",
      "Radio and dashboard lights reset themselves randomly while driving, {condition}.",
      "A bunch of different electrical things are acting up at once — power windows, radio, dash lights — {condition}.",
      "My interior lights stayed on and drained something overnight even though I'm sure I turned them off.",
      "One of my fuses keeps blowing every time I replace it. What could cause that?",
      "Dashboard warning lights flicker specifically {condition}, mileage is around {mileage}.",
      "My key fob and remote start suddenly stopped working reliably {condition}. Battery in the fob is new.",
      "Power locks are acting up, sometimes locking/unlocking on their own {condition}.",
      "Headlights dim noticeably when I turn on the AC or use other accessories, {condition}.",
    ],
  },
  {
    errorType: "Battery",
    templates: [
      "My battery is dead again this morning even though the car ran fine yesterday. Mileage is around {mileage}.",
      "Car cranks really slowly {condition}, battery is about 3 years old. Is it time to replace it?",
      "Battery keeps dying overnight even though the car runs totally fine when I do drive it.",
      "Headlights noticeably dim when the car is idling {condition}. Could this be the battery or alternator?",
      "Battery warning light came on the dash {condition}. What should I check first?",
      "I had to jump start my car {timeframe} and now I'm worried it'll happen again. How do I know if it's the battery or alternator?",
      "Car won't start at all {condition}, no crank, just a clicking sound. Mileage around {mileage}.",
      "My 12V battery died even though the main range/charge indicator still shows plenty left. Is that normal?",
      "Battery terminal looks a little corroded, could that actually cause starting problems {condition}?",
      "Car struggles to start specifically {condition} but is fine the rest of the time.",
    ],
  },
  {
    errorType: "Tires",
    templates: [
      "TPMS light came on the dash {condition}, mileage is around {mileage}. Do I need to check all four tires?",
      "Car pulls noticeably to the right even though the tires look fine to me. Started {timeframe}.",
      "I'm noticing uneven wear on the inside edge of my front tires, mileage around {mileage}.",
      "TPMS light stays on even after I've corrected the tire pressure. What else could cause that?",
      "One of my tires seems to be slowly losing pressure over {timeframe}, no visible nail or damage.",
      "Steering wheel vibrates at highway speed {condition}, could this be a tire balance issue?",
      "I hear a rhythmic thumping noise from one of the tires {condition}. Started {timeframe}.",
      "Tires are wearing unevenly on one side of the car, noticed this around {mileage} miles.",
      "Car feels like it's wandering or drifting on the highway {condition}, tires look okay visually.",
      "Spare tire TPMS sensor light won't turn off even though I'm using my regular tires now.",
    ],
  },
  {
    errorType: "Cooling System",
    templates: [
      "Coolant reservoir keeps needing topped off every {timeframe}. No puddles under the car that I can see.",
      "Temperature gauge climbs higher than usual {condition}, mileage is around {mileage}.",
      "There's a sweet smell inside the cabin {condition}, and the windshield fogs up oddly.",
      "White smoke from the tailpipe along with coolant disappearing, no visible external leak. Started {timeframe}.",
      "My heater is blowing cold air even with it set to full hot, {condition}.",
      "I noticed a greenish puddle under the front of my car {condition} this morning.",
      "Engine seems to overheat specifically {condition} but is fine otherwise. Mileage around {mileage}.",
      "Coolant looks kind of milky or foamy when I check the reservoir. Is that normal?",
      "Fan seems to run loudly and constantly {condition}, even after the engine has been off a while.",
      "AC and heater fan makes a weird noise {condition}, not sure if it's related to the cooling system.",
    ],
  },
  {
    errorType: "Exhaust",
    templates: [
      "There's a rattling noise from underneath the car {condition}, especially for the first minute after starting.",
      "Exhaust seems louder than usual all of a sudden, {condition}. Started {timeframe}.",
      "I'm getting a reduced power warning along with the check engine light, {condition}. Mileage around {mileage}.",
      "I can smell exhaust fumes inside the cabin {condition}. Is that dangerous?",
      "There's a hissing sound coming from near the engine/exhaust area {condition}.",
      "Car feels noticeably less powerful than usual {condition}, along with a warning light on the dash.",
      "I keep getting a message about the emissions/DPF system needing service. What triggers that?",
      "There's a metallic rattling from underneath specifically at cold start, goes away after the first minute or so of driving.",
      "Exhaust pipe looks like it's hanging lower than normal, noticed {timeframe} ago.",
      "Strong exhaust smell right after starting the car {condition}, mileage is around {mileage}.",
    ],
  },
  {
    errorType: "Suspension",
    templates: [
      "I hear a clunking noise over bumps {condition}, mileage is around {mileage}.",
      "The ride feels really bouncy lately, like the car keeps bobbing after a bump instead of settling down.",
      "Clunk noise happens specifically when I'm turning over a bump, not on straight bumps. Started {timeframe}.",
      "My car seems to be sitting lower on one corner compared to the other three. Noticed this {timeframe}.",
      "Steering feels loose or vague {condition}, and I hear a clunk from the front end.",
      "There's a squeaking noise from the suspension {condition}, especially over rough roads.",
      "Car bounces excessively after hitting a pothole {condition}. Mileage around {mileage}.",
      "I hear a clunk from the rear of the car specifically {condition}.",
      "Front end makes a knocking sound when I go over speed bumps {condition}.",
      "Ride quality has gotten noticeably harsher/rougher over {timeframe}, not sure if it's tires or suspension.",
    ],
  },
  {
    errorType: "Climate Control",
    templates: [
      "AC is blowing air but it's not cold at all, {condition}. Mileage around {mileage}.",
      "AC blows cold on the driver's side but warm on the passenger side, {condition}.",
      "There's a musty smell from the vents specifically when I first turn on the AC {condition}.",
      "Heater takes a really long time to warm up {condition}, longer than it used to.",
      "AC compressor makes a loud clicking or clunking noise when it kicks on {condition}.",
      "Climate control fan only works on the highest setting, other speeds don't do anything.",
      "AC cools fine at idle but gets noticeably weaker {condition}. Started {timeframe}.",
      "I'm noticing water dripping inside the cabin near the floor {condition}, could that be the AC?",
      "Defroster doesn't seem to clear the windshield as fast as it used to, {condition}.",
      "There's a burning smell when I turn the AC on {condition}. Mileage around {mileage}.",
    ],
  },
  {
    errorType: "Fuel System",
    templates: [
      "Car is hard to start specifically {condition}, sometimes takes several tries. Mileage around {mileage}.",
      "I hear a whining noise from the back of the car near the fuel tank {condition}.",
      "Car stalled shortly after I refueled at a station I'd never used before, {condition}.",
      "Fuel economy has dropped noticeably over {timeframe}, nothing else seems different.",
      "Car hesitates or stumbles under acceleration, especially from a stop, {condition}.",
      "Check engine light came on right after I refueled, {condition}. Could the gas cap cause that?",
      "I'm smelling fuel/gasoline near the car {condition}, mileage is around {mileage}.",
      "Engine surges or lurches slightly at steady highway speed, {condition}.",
      "Car struggles to accelerate uphill {condition}, feels underpowered compared to normal.",
      "Fuel gauge seems to read inaccurately, dropping faster than expected {condition}.",
    ],
  },
  {
    errorType: "Dashboard Warning Lights",
    templates: [
      "There's a wrench symbol with an exclamation point lit up on my dash {condition}. What does that mean on my car?",
      "Multiple warning lights came on at once {condition}, mileage is around {mileage}.",
      "Check engine light turned on {timeframe} ago and hasn't gone off since, but the car drives normally.",
      "A warning light I don't recognize lit up on the dash {condition}. It's an amber/orange color.",
      "TPMS and check engine light both came on around the same time, {condition}.",
      "My dash lit up like a Christmas tree all of a sudden {condition}. Should I pull over immediately?",
      "Battery warning light is on along with reduced power, {condition}. Mileage around {mileage}.",
      "Oil pressure warning light flickered briefly {condition} then went off. Should I be worried?",
      "A red warning light (not sure exactly which one) came on {condition} and stayed on.",
      "Traction control / stability warning light turned on {condition}, car feels normal to drive otherwise.",
    ],
  },
  {
    errorType: "Steering",
    templates: [
      "Steering wheel vibrates noticeably at highway speed, {condition}. Mileage around {mileage}.",
      "Steering suddenly became really stiff and hard to turn, {condition}.",
      "There's a whining noise when I turn the steering wheel, especially {condition}.",
      "Steering wheel feels off-center now, even though the car drives straight. Noticed this {timeframe}.",
      "Car feels like it wanders on the highway and I have to correct the steering constantly, {condition}.",
      "I hear a clunk from the steering column {condition}, mileage around {mileage}.",
      "Steering wheel shakes specifically when braking, not otherwise. Started {timeframe}.",
      "Power steering warning light came on {condition} and steering got noticeably heavier.",
      "There's a delay or looseness in the steering before it actually responds, {condition}.",
      "Steering makes a groaning noise on tight turns, {condition}, especially in parking lots.",
    ],
  },
  {
    errorType: "Exterior Lights",
    templates: [
      "One of my brake lights burned out, is that something I can just replace myself?",
      "Both headlights on one side stopped working at the same time, {condition}. Mileage around {mileage}.",
      "My headlights seem noticeably dimmer than they used to be, especially {condition}.",
      "Turn signal is blinking really fast on one side. What does that usually mean?",
      "Fog lights won't turn on at all anymore, {condition}. Checked the switch and it seems fine.",
      "One of my headlights flickers on and off {condition}, mileage around {mileage}.",
      "Interior dome light won't turn off even with the doors closed, draining my battery I think.",
      "Reverse lights don't come on when I put the car in reverse, {condition}.",
      "Taillight housing looks foggy/cloudy and the light seems dimmer, noticed this {timeframe}.",
      "Daytime running lights work but my regular headlights won't turn on {condition}.",
    ],
  },
  {
    errorType: "Wipers & Visibility",
    templates: [
      "Wipers are streaking badly across the windshield {condition}. Mileage around {mileage}.",
      "Wiper blades chatter/judder instead of wiping smoothly, {condition}.",
      "Wipers stopped working entirely {condition}, checked the fuse and it looks fine.",
      "Windshield fogs up on the inside really fast {condition}, even with the defroster on.",
      "Wiper blades are frozen to the windshield {condition} and I'm worried about damaging the motor.",
      "Rear wiper doesn't work at all anymore, {condition}. Front wipers are fine.",
      "Wipers only work on the highest speed setting, other settings don't do anything.",
      "There's a annoying squeak from the wipers every pass, {condition}.",
      "Washer fluid doesn't spray even though the reservoir is full, {condition}.",
      "Wipers randomly turn on by themselves {condition}, mileage around {mileage}.",
    ],
  },
  {
    errorType: "Unusual Noise",
    templates: [
      "There's a squeaking noise that changes with wheel speed, not engine speed, {condition}.",
      "I hear a humming noise that gets louder the faster I go, {condition}. Mileage around {mileage}.",
      "There's a clicking noise specifically when I turn the steering wheel {condition}.",
      "Car makes a loud bang/pop noise occasionally {condition}, hard to pin down where from.",
      "There's a squealing belt-like noise from under the hood {condition}.",
      "I hear a rattling noise from inside the dashboard {condition}, not sure what's loose.",
      "Grinding noise from one of the wheels specifically {condition}. Started {timeframe}.",
      "There's a whirring/whining noise that's more noticeable {condition}, mileage around {mileage}.",
      "Car makes a thumping noise from underneath specifically {condition}.",
      "I hear a hissing sound coming from the engine bay {condition} after I shut the car off.",
    ],
  },
  {
    errorType: "Fluid Leak",
    templates: [
      "There's a puddle under my car {condition}, looks dark brown/black and oily.",
      "I found a reddish puddle under the front of the car {condition}. Mileage around {mileage}.",
      "There's a greenish, slightly sticky puddle under the car {condition} this morning.",
      "I noticed a clear watery puddle under the car {condition}, not sure if that's normal.",
      "Yellowish thick fluid near one of the wheels, noticed this {timeframe}.",
      "There's a small leak under the car that's been getting worse over {timeframe}.",
      "I keep having to top off a fluid but can't tell where it's leaking from, {condition}.",
      "Oil spots on my driveway have been showing up for {timeframe} now.",
      "There's a strong fluid smell inside the cabin {condition}, not sure which fluid.",
      "Fluid is dripping steadily from underneath the engine {condition}, mileage around {mileage}.",
    ],
  },
  {
    errorType: "Safety Restraint System",
    templates: [
      "Airbag warning light turned on and stayed lit {condition}. Mileage around {mileage}.",
      "Airbag light flickers briefly at startup then goes off. Is that normal or a problem?",
      "Seatbelt warning chime keeps going off even though I'm buckled in, {condition}.",
      "I got a recall notice about my airbag system, should I stop driving until it's fixed?",
      "Passenger airbag light shows off even when there's clearly someone in the seat, {condition}.",
      "Airbag light came on after I had something stored under the passenger seat. Coincidence?",
      "Seatbelt pretensioner light or message appeared on the dash {condition}.",
      "Airbag warning light is solid on, not flickering, {condition}. What should I do?",
      "I noticed the airbag light after a minor fender bender {condition}. Should I get it checked?",
      "Occupant sensor seems to misread whether someone is in the passenger seat, {condition}.",
    ],
  },
  {
    errorType: "Fuel Economy",
    templates: [
      "My MPG has dropped noticeably over {timeframe}, nothing else seems wrong with the car.",
      "Fuel economy tanked right after I got new tires installed. Is that related?",
      "I'm getting way worse gas mileage in cold weather {condition}, is that normal?",
      "Fuel economy seems worse since I started noticing a slight pull to one side, {condition}.",
      "My hybrid's fuel economy dropped a lot over {timeframe}, could the battery be degrading?",
      "Gas mileage has been steadily declining over the last {timeframe}, mileage around {mileage}.",
      "I noticed one wheel gets much hotter than the others after driving, and MPG has dropped too.",
      "Highway fuel economy dropped noticeably {condition}, city driving seems about the same.",
      "Fuel economy got worse right after I put a roof rack/cargo carrier on, is that expected?",
      "My EV's range has dropped a lot in cold weather {condition}, is that normal or a battery issue?",
    ],
  },
  {
    errorType: "Infotainment & Connectivity",
    templates: [
      "My touchscreen infotainment system froze completely {condition} and won't respond to anything.",
      "Bluetooth keeps disconnecting from my phone randomly {condition}, even though it's paired.",
      "Backup camera image is blurry or distorted specifically {condition}.",
      "Infotainment system restarts itself randomly while driving, {condition}.",
      "My phone won't pair with the car's Bluetooth at all anymore, {condition}.",
      "Navigation freezes or lags badly {condition}, mileage around {mileage}.",
      "Backup camera doesn't show any image at all when I put the car in reverse, {condition}.",
      "Touchscreen has a delay of several seconds before it responds to taps, {condition}.",
      "USB/Android Auto or CarPlay keeps disconnecting randomly {condition}.",
      "Infotainment screen shows a black screen on startup {condition} until I restart the car.",
    ],
  },
];
