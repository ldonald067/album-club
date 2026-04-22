import { ALBUMS, getListenUrl } from "./albums";

const SOUNDTRACK_PROFILES = [
  {
    key: "hip-hop",
    match: /\b(?:hip-hop|hip hop|rap|trip-hop|trip hop|grime|drill)\b/i,
    texture: "streetlight detail and elastic swagger",
    bridgeFocus: "low-end patience",
    recommendationTraits: [
      "midnight momentum",
      "side-street detail",
      "dry wit in the pocket",
    ],
    gameTitles: [
      "Objective Marker Detour",
      "Crew Assembly Walk",
      "Late-Night Side Quest",
      "Checkpoint With Bad Ideas",
    ],
    gameLocations: [
      "the city block between two story missions",
      "the walk back from a mission that got louder than planned",
      "a district where every alley looks like optional trouble",
      "the map stretch where the side quests suddenly sound better than the main plot",
    ],
    gameActions: [
      "you keep choosing curiosity over safety",
      "the game wants you to look cool before it wants you to be useful",
      "every NPC seems to know one more secret than they are admitting",
      "you are one wrong turn away from doubling the runtime in a very fun way",
    ],
    filmTitles: [
      "Windshield Reflection Scene",
      "Corner Store Montage",
      "After-Hours Character Beat",
      "No-Sleep City Glow",
    ],
    filmShots: [
      "windshield reflections and storefront light",
      "elevator mirrors, empty sidewalks, and a phone that keeps lighting up",
      "crosswalk neon and the exact wrong amount of confidence",
      "fluorescent convenience-store light hitting people mid-lie",
    ],
    filmTurns: [
      "the lead is pretending this is under control",
      "the joke has already become a problem",
      "somebody is stalling before they text back",
      "the movie is buying time before the consequences arrive",
    ],
    tvTitles: [
      "Pilot Needle Drop",
      "Prestige TV Walk-Up",
      "Cold Open With Trouble Brewing",
      "Season Premiere Reentry",
    ],
    tvSetups: [
      "a pilot introducing its city as stylish, funny, and a little corrupt",
      "a season premiere re-entering the world with better clothes and worse choices",
      "the cold open where you learn who thinks they run things",
      "the scene that quietly tells you everybody here is hiding something",
    ],
    tvTurns: [
      "the smartest character is already tired of everyone else",
      "someone is about to overplay charm instead of judgment",
      "the show wants menace without losing its sense of humor",
      "the whole episode is about to hinge on one reckless little choice",
    ],
    listenFor: [
      "drums that land like footsteps",
      "space in the arrangement doing more than clutter ever could",
      "small production details that sparkle under streetlights",
      "how the confidence sits in the pauses as much as the bars",
      "bass movement that feels like a camera dolly instead of a shove",
    ],
    studios: ["Rockstar Games", "Ryu Ga Gotoku Studio", "Remedy", "Campo Santo"],
    bossFightModes: [
      "less final boss and more dangerous mini-boss with perfect posture",
      "the fight where style points matter almost as much as damage",
      "the showdown that starts with banter and ends with a chase",
      "the boss music for somebody who has already talked too much",
    ],
    needleDropScenes: [
      "the walk away from a deal that technically worked",
      "the scene where the city looks better than everybody in it feels",
      "the moment a bad plan briefly feels like self-knowledge",
      "the first shot after the party turns into aftermath",
    ],
    endCreditsMoods: [
      "cool on the surface and one bad decision from unraveling",
      "half victory lap, half \"well, that escalated\"",
      "satisfied, but still checking the rear-view mirror",
      "too sharp to feel sleepy and too bruised to feel triumphant",
    ],
  },
  {
    key: "dream",
    match:
      /\b(?:shoegaze|dream pop|dream-pop|ambient|post-rock|post rock|slowcore)\b/i,
    texture: "glow, haze, and suspended gravity",
    bridgeFocus: "texture before exposition",
    recommendationTraits: [
      "weightless tension",
      "luminous blur",
      "slow-burning emotional weather",
    ],
    gameTitles: [
      "Safe Room Stargazing",
      "Map Screen Exhale",
      "Checkpoint Aftershock",
      "Open-World Weather Shift",
    ],
    gameLocations: [
      "the quiet checkpoint after a boss fight leaves you buzzing",
      "a ridge where the map opens and the game finally lets you breathe",
      "the long walk between danger and actual safety",
      "the stretch where exploration feels more emotional than efficient",
    ],
    gameActions: [
      "you stop sprinting because the scenery has started saying something back",
      "the objective can wait because the air itself suddenly matters",
      "every ruined building looks like it remembers somebody",
      "you start noticing the world more than the UI",
    ],
    filmTitles: [
      "Wide-Shot Ache",
      "Motel Sign Reverie",
      "Blue-Hour Montage",
      "Window Scene At 2 A.M.",
    ],
    filmShots: [
      "a motel sign humming against a huge dark frame",
      "a long road seen from too far away to feel comforting",
      "a bedroom window turning one person into a whole weather system",
      "foggy glass, headlights, and the exact right amount of distance",
    ],
    filmTurns: [
      "nobody says the important thing out loud",
      "the camera understands the heartbreak before the script admits it",
      "the scene needs ache more than plot",
      "you can feel the memory forming in real time",
    ],
    tvTitles: [
      "Prestige Drama Dissolve",
      "Cold Open In Soft Focus",
      "Final Scene Before Credits",
      "Episode Transition With Feelings",
    ],
    tvSetups: [
      "the dissolve between two scenes that do not rhyme until the music makes them",
      "the cold open where a show chooses atmosphere over explanation",
      "the final minute before credits when nobody has solved anything but everybody has shifted",
      "the transition scene where silence does the heavy lifting",
    ],
    tvTurns: [
      "the episode gets sadder without getting louder",
      "the emotional reveal arrives as mood before dialogue",
      "the show trusts stillness for once",
      "the camera hangs back because closeness would be too much",
    ],
    listenFor: [
      "texture taking the lead before melody does",
      "the point where blur turns from pretty to aching",
      "how the mix makes distance feel tactile",
      "drums that sound like memory instead of instruction",
      "the exact moment the guitars stop hitting and start glowing",
    ],
    studios: ["Playdead", "Team Ico", "Remedy", "Thatgamecompany"],
    bossFightModes: [
      "the boss fight after the boss fight, when the real enemy is emotional damage",
      "the encounter that feels enormous because the room goes quiet first",
      "the phase-change music for something elegant and unfair",
      "less adrenaline rush, more cosmic \"oh no\"",
    ],
    needleDropScenes: [
      "the scene where two people almost say the thing",
      "the shot of an empty room that somehow hurts more than the argument",
      "the drive home after the version of the night you cannot redo",
      "the walk across a parking lot that turns into a whole thesis on loneliness",
    ],
    endCreditsMoods: [
      "gorgeous, spent, and not remotely over it",
      "the kind of ending that makes the credits feel like part of the wound",
      "soft around the edges and devastating in the middle",
      "calm enough to breathe, sad enough to linger",
    ],
  },
  {
    key: "indie-rock",
    match:
      /\b(?:punk|post-punk|post punk|new wave|garage rock|garage|indie rock|alt rock|alternative)\b/i,
    texture: "snap, attitude, and mess used on purpose",
    bridgeFocus: "rhythmic bite",
    recommendationTraits: [
      "hook-first momentum",
      "nervy charm",
      "wired-up swagger",
    ],
    gameTitles: [
      "Arcade Racer Menu Screen",
      "Downtown Chase Setup",
      "Character Select Confidence",
      "Midnight Course Preview",
    ],
    gameLocations: [
      "the menu screen that makes you want to pick the rude car",
      "a city course where every corner invites bad judgment",
      "the level intro that dares you to drive like property damage is flavor text",
      "the stretch before a timed mission where the game gets cocky on purpose",
    ],
    gameActions: [
      "the UI suddenly looks smug in a way that works",
      "you feel faster before the controls even prove it",
      "the game wants velocity, but also eyeliner",
      "the point is not grace, it is nerve",
    ],
    filmTitles: [
      "Messy Night Out Montage",
      "Bad Idea In Good Lighting",
      "Rooftop Cigarette Scene",
      "The Plan Is Already Worse",
    ],
    filmShots: [
      "smudged eyeliner, alley light, and one too many declarations",
      "a rooftop, a cigarette, and the kind of confidence that ages poorly by morning",
      "friends crossing town like nobody has ever been told no",
      "crowded rooms that somehow make everybody lonelier and funnier",
    ],
    filmTurns: [
      "the plan has already gone sideways and everyone still thinks it was worth it",
      "the movie needs momentum more than innocence",
      "someone mistakes charisma for wisdom",
      "chaos is doing half the characterization for free",
    ],
    tvTitles: [
      "Season Opener Reset",
      "New Semester Same Problems",
      "Episode One With Better Jackets",
      "Returning Cast Reboot",
    ],
    tvSetups: [
      "the season opener where everybody is back and nobody learned enough",
      "the pilot that wants a little rebellion without losing its jokes",
      "the episode that reintroduces the cast by making them all mildly impossible",
      "the opener where the soundtrack tells you the show knows what cool looks like",
    ],
    tvTurns: [
      "the emotional problems are old; the outfits are fresh",
      "the show gets louder without getting broader",
      "everybody is mid-reset and already failing beautifully",
      "the scene wants impatience, chemistry, and a little vanity",
    ],
    listenFor: [
      "rhythm section snap over polish",
      "hooks that feel thrown rather than placed",
      "how sloppiness gets used as charisma",
      "the moments where tension shows up as momentum",
      "guitars that make a point quickly and keep moving",
    ],
    studios: ["Sega", "Insomniac Games", "Double Fine", "Annapurna Interactive"],
    bossFightModes: [
      "the stylish miniboss who gets the second-best theme in the game",
      "the first boss that teaches you swagger counts as difficulty",
      "the fight that feels playable in a leather jacket",
      "the encounter where cockiness is practically a damage type",
    ],
    needleDropScenes: [
      "the sprint to the next bad decision",
      "the montage where friendship and self-destruction look temporarily interchangeable",
      "the night-out sequence that becomes plot before sunrise",
      "the scene where the room gets funnier right before it gets meaner",
    ],
    endCreditsMoods: [
      "sweaty, alive, and absolutely not reflective enough yet",
      "the kind of ending that lights a cigarette instead of learning a lesson",
      "half grin, half emotional property damage",
      "still buzzing and not ready for anyone to call it character growth",
    ],
  },
  {
    key: "jazz-soul",
    match: /\b(?:jazz|soul|funk|r&b|rnb|disco|motown)\b/i,
    texture: "groove, warmth, and expensive little turns",
    bridgeFocus: "the pocket",
    recommendationTraits: [
      "silky momentum",
      "room-owning warmth",
      "harmonic confidence",
    ],
    gameTitles: [
      "Detective Hub Theme",
      "Velvet Lounge Briefing",
      "Night Shift Safe Zone",
      "Case Board With Style",
    ],
    gameLocations: [
      "the beautifully lit hub where every NPC knows more than they are saying",
      "a jazz-bar checkpoint where plot comes dressed correctly",
      "the detective office after midnight once the city noise softens",
      "the between-missions space where the bartender might be more important than the quest giver",
    ],
    gameActions: [
      "the world-building is happening through charisma and room tone",
      "you want to talk to everybody before you chase the next clue",
      "the score makes conversation feel as playable as combat",
      "the game suddenly remembers texture can carry stakes",
    ],
    filmTitles: [
      "Velvet Camera Glide",
      "Tailored Suit Montage",
      "Late-Night Club Scene",
      "The Room Gets Better Instantly",
    ],
    filmShots: [
      "lamplight on glassware and one person entering like the scene was waiting for them",
      "a tracking shot that trusts posture as much as dialogue",
      "slow pans across people who know how to own silence",
      "clothes, room tone, and chemistry doing all the exposition",
    ],
    filmTurns: [
      "charisma becomes the plot engine",
      "the movie finally relaxes and gets sexier because of it",
      "everyone talks like they know exactly how much space they take up",
      "the scene gets better the less it rushes",
    ],
    tvTitles: [
      "Bottle Episode Heat",
      "Late-Night Ensemble Scene",
      "Chemistry Returns Instantly",
      "After-Hours Dialogue Flex",
    ],
    tvSetups: [
      "the bottle episode where everybody ends up in one room and the writing has to earn it",
      "the late-night scene that lets old chemistry wake back up",
      "the episode where side characters suddenly become fascinating because the groove says so",
      "the sequence where timing matters more than plot speed",
    ],
    tvTurns: [
      "the dialogue gets sharply better the second the music arrives",
      "the show finally lets charm carry weight",
      "the scene is all subtext and perfect posture",
      "the writers are counting on rhythm to make the room feel crowded in the right way",
    ],
    listenFor: [
      "groove as scene direction",
      "little harmonic turns that feel expensive",
      "how warmth in the pocket does more than loudness ever could",
      "space left open for the bass and the vocal to flirt with each other",
      "arrangements that feel tailored instead of stacked",
    ],
    studios: ["Atlus", "Ryu Ga Gotoku Studio", "Supergiant Games", "Arkane"],
    bossFightModes: [
      "the boss theme for somebody who is absolutely going to monologue before attacking",
      "the fight that stays cool while everybody else panics",
      "the encounter where elegance is part of the threat model",
      "less panic sprint, more immaculate pressure",
    ],
    needleDropScenes: [
      "the scene where one entrance changes the whole room temperature",
      "the cocktail-hour conversation that is secretly about power",
      "the montage where charisma becomes evidence",
      "the slow walk through a room full of future complications",
    ],
    endCreditsMoods: [
      "smoky, poised, and too composed to call itself sad",
      "the kind of ending that closes a tab instead of slamming a door",
      "all the lights are low, but the self-respect is still dressed up",
      "warm enough to linger, sharp enough to remember",
    ],
  },
  {
    key: "heavy",
    match: /\b(?:metal|industrial|hardcore|noise rock|noise|grunge)\b/i,
    texture: "impact, abrasion, and controlled panic",
    bridgeFocus: "physical texture",
    recommendationTraits: [
      "pressure and release",
      "hostile propulsion",
      "grim momentum",
    ],
    gameTitles: [
      "Lock-In Boss Intro",
      "Machine Room Ambush",
      "Health Bar Warning Theme",
      "No More Tutorials",
    ],
    gameLocations: [
      "the room where the doors seal and the UI starts flashing",
      "the first boss arena that teaches you respect the hard way",
      "a machine floor full of sparks, smoke, and terrible options",
      "the section where the game stops being polite about consequences",
    ],
    gameActions: [
      "survival suddenly sounds physical",
      "every dodge feels half strategy, half spite",
      "the game wants you tense enough to enjoy losing once",
      "impact becomes the whole point of the room",
    ],
    filmTitles: [
      "Machine Room Panic",
      "Alarm Light Sequence",
      "Concrete Tunnel Breakdown",
      "Final Act Escalation",
    ],
    filmShots: [
      "sparks, alarms, and somebody choosing violence over patience",
      "a concrete corridor that sounds like it wants blood",
      "warning lights cutting through smoke and bad odds",
      "handheld panic and metal surfaces that look ready to bite back",
    ],
    filmTurns: [
      "subtlety has already left the building",
      "the protagonist has stopped pretending there is a gentle option",
      "the scene wants force more than polish",
      "panic and catharsis have started sharing a heartbeat",
    ],
    tvTitles: [
      "Season Finale Escalation",
      "Everything Is Worse Now",
      "Cold Open With Sirens",
      "The Episode That Breaks Restraint",
    ],
    tvSetups: [
      "the episode where a season's worth of dread finally cashes out",
      "the cold open that starts already mid-crisis",
      "the finale where the show decides restraint had a good run",
      "the scene where the stakes stop being theoretical all at once",
    ],
    tvTurns: [
      "the whole episode sounds like the walls are sweating",
      "the show wants consequence, not elegance",
      "repetition starts reading as threat instead of mood",
      "every cut feels like the next bad idea arriving early",
    ],
    listenFor: [
      "impact over prettiness",
      "texture that feels physical, not decorative",
      "the moment repetition turns from hypnotic to menacing",
      "how distortion changes the size of the room",
      "drums that sound like blunt force punctuation",
    ],
    studios: ["FromSoftware", "id Software", "MachineGames", "Remedy"],
    bossFightModes: [
      "the kind of boss music that makes your shoulders rise before the first hit",
      "pure second-phase energy",
      "the fight that teaches you the arena itself is an enemy",
      "less duel, more industrial accident with lore",
    ],
    needleDropScenes: [
      "the point where patience ends and consequence begins",
      "the sequence where containment very clearly fails",
      "the walk toward something everybody knows is a terrible idea",
      "the scene where a character chooses damage on purpose",
    ],
    endCreditsMoods: [
      "wrung out, scorched, and weirdly clear-eyed",
      "alive enough to keep moving, not healed enough to smile",
      "the aftermath where adrenaline is still holding the pen",
      "less victory lap, more smoldering inventory of what survived",
    ],
  },
  {
    key: "folk",
    match:
      /\b(?:folk|country|americana|singer-songwriter|singer songwriter|bluegrass)\b/i,
    texture: "grain, memory, and hand-made detail",
    bridgeFocus: "room sound and narrative detail",
    recommendationTraits: [
      "plainspoken ache",
      "road-worn warmth",
      "human-scale storytelling",
    ],
    gameTitles: [
      "Road Map Interlude",
      "Campfire Save Point",
      "Between-Towns Travel Music",
      "Quiet Side Quest",
    ],
    gameLocations: [
      "the long drive between towns when the map finally quiets down",
      "a campfire save point where the landscape does half the talking",
      "the trail segment that makes distance feel earned instead of padded",
      "the slower travel section where the game trusts the road to set the mood",
    ],
    gameActions: [
      "you notice the weather before the quest log",
      "the world feels inhabited because the details sound lived in",
      "the side quest matters because somebody's kitchen table matters",
      "the quiet makes every tiny decision feel more honest",
    ],
    filmTitles: [
      "Dusty Daylight Montage",
      "Back Road Character Study",
      "Morning After The Storm",
      "Kitchen Table Scene",
    ],
    filmShots: [
      "back roads, dry light, and one honest face carrying too much",
      "hands fixing something simple while the scene says something larger",
      "morning light on rooms that have heard this argument before",
      "coffee steam, old wood, and grief trying not to announce itself",
    ],
    filmTurns: [
      "the movie wants truth more than drama",
      "the scene hurts because it refuses spectacle",
      "small details are doing the emotional heavy lifting",
      "restraint is the whole point and the whole weapon",
    ],
    tvTitles: [
      "Small-Town Character Beat",
      "Porch Scene With History",
      "Episode Quietly Breaks You",
      "The Good Writing One",
    ],
    tvSetups: [
      "the scene where somebody says almost nothing and tells you their whole deal anyway",
      "the porch conversation that finally makes the family history legible",
      "the episode where the town itself starts sounding like a character",
      "the sequence where one practical task turns into confession by accident",
    ],
    tvTurns: [
      "the writing trusts still hands and specific objects",
      "the silence is not empty, just crowded",
      "every line feels like it knows what it costs",
      "the show gets more intimate by getting more precise",
    ],
    listenFor: [
      "narrative detail hiding in the phrasing",
      "how room sound and string noise make the world feel inhabited",
      "melodies that land like memory instead of spectacle",
      "tiny pauses that feel like somebody reconsidering the truth",
      "how the arrangement leaves space for human texture to stay visible",
    ],
    studios: ["Naughty Dog", "Campo Santo", "Santa Monica Studio", "Annapurna Interactive"],
    bossFightModes: [
      "the boss theme for a fight you wish did not have to happen",
      "the encounter where the emotional stakes land before the combat does",
      "less \"epic showdown,\" more \"this is going to leave a mark\"",
      "the kind of battle music that makes mercy feel mechanically relevant",
    ],
    needleDropScenes: [
      "the drive away from home that already feels like memory",
      "the porch scene after everybody else has gone inside",
      "the montage where practical chores become emotional evidence",
      "the shot of somebody holding it together because there are dishes to do",
    ],
    endCreditsMoods: [
      "tender, spent, and still trying to be useful",
      "sad in a way that keeps the lights on",
      "the sort of ending that folds the chair back up before it cries",
      "gentle, weathered, and not finished with you by morning",
    ],
  },
  {
    key: "electronic",
    match:
      /\b(?:electronic|electronica|house|techno|idm|synthpop|synth-pop|dance)\b/i,
    texture: "sleek motion and emotional circuitry",
    bridgeFocus: "repetition with purpose",
    recommendationTraits: [
      "kinetic shimmer",
      "clean propulsion",
      "digital atmosphere with feelings intact",
    ],
    gameTitles: [
      "Night Drive Checkpoint",
      "Skyline Loading Screen",
      "Velocity Tutorial",
      "Future City Traverse",
    ],
    gameLocations: [
      "the stretch where the skyline turns electric and the UI goes minimal",
      "a neon transit line that makes speed feel elegant instead of frantic",
      "the chapter where the city finally looks as synthetic as it sounds",
      "the traversal segment that turns movement into trance",
    ],
    gameActions: [
      "repetition starts sounding like architecture",
      "the motion feels clean but never cold",
      "you stop noticing the controls and start noticing the air",
      "the game remembers sleekness can still have a pulse",
    ],
    filmTitles: [
      "Club To Dawn Transition",
      "Chrome Corridor Montage",
      "Future City Intro",
      "Afterparty To Aftermath",
    ],
    filmShots: [
      "chrome surfaces, passing lights, and faces lit by machines and poor choices",
      "the glamorous hour tipping into the haunted morning after",
      "glass towers and one character walking like they invented the night",
      "a transition montage where the city seems more awake than the people in it",
    ],
    filmTurns: [
      "the movie gets more interesting the second glamour starts curdling",
      "sleekness becomes a feeling rather than a finish",
      "the scene wants momentum without panic",
      "the frame looks expensive because the timing does",
    ],
    tvTitles: [
      "Future City Cold Open",
      "Pilot In Glass And Neon",
      "Techno-Moral Ambiguity",
      "Night Shift Sci-Fi Intro",
    ],
    tvSetups: [
      "the cold open that teaches you the city before it teaches you the plot",
      "the pilot scene where glass, transit, and distance become world-building",
      "the sequence that makes the setting feel large, clean, and morally suspect",
      "the opener where the show tells you everybody here lives by a system",
    ],
    tvTurns: [
      "the world feels elegant enough to be dangerous",
      "the pacing stays precise without turning sterile",
      "the scene wants cool surfaces and human static underneath",
      "you learn more from motion than dialogue",
    ],
    listenFor: [
      "which sounds move the body and which ones tint the air",
      "how repetition builds setting rather than just momentum",
      "the point where sleekness starts feeling emotional",
      "tiny high-end details reading like camera moves",
      "the balance between pulse and atmosphere",
    ],
    studios: ["Remedy", "CD Projekt Red", "Kojima Productions", "Supergiant Games"],
    bossFightModes: [
      "the fight theme for a boss who owns too much glass",
      "the encounter where the arena looks cleaner than the odds",
      "the soundtrack for a duel lit mostly by UI",
      "more chrome pressure than brute force",
    ],
    needleDropScenes: [
      "the moment the party starts looking like a system failure",
      "the walk through a city that feels both glamorous and extractive",
      "the montage where speed turns into self-inventory",
      "the first shot after midnight becomes tomorrow",
    ],
    endCreditsMoods: [
      "charged, elegant, and just a little haunted by the comedown",
      "the kind of ending that glows longer than it comforts",
      "clean lines, open tabs, unresolved emotions",
      "still pulsing after the lights technically came on",
    ],
  },
];

const DEFAULT_PROFILE = {
  key: "default",
  texture: "tone, motion, and scene-setting detail",
  bridgeFocus: "texture over generic backdrop energy",
  recommendationTraits: [
    "cinematic texture",
    "clear atmosphere",
    "strong scene-writing energy",
  ],
  gameTitles: [
    "Exploration Mode Cue",
    "Map Unfolding Moment",
    "Traverse Theme",
    "The Game Finally Breathes",
  ],
  gameLocations: [
    "the stretch where the game stops explaining itself and just lets you roam",
    "an open area that wants observation before optimization",
    "the travel section where the world-building finally gets first billing",
    "the part of the level that feels more lived in than goal-driven",
  ],
  gameActions: [
    "you start noticing details instead of mechanics",
    "the mood becomes more useful than the objective marker",
    "exploration sounds like attention rather than filler",
    "the world gets more persuasive than the checklist",
  ],
  filmTitles: [
    "Character Study Montage",
    "Atmosphere Takes The Wheel",
    "Scene Work Over Plot Work",
    "The Camera Gets Interested",
  ],
  filmShots: [
    "a scene where texture is carrying more than exposition",
    "the kind of montage that trusts faces, rooms, and timing",
    "a sequence that wants mood to be legible before information is",
    "camera language doing the emotional work the script leaves unsaid",
  ],
  filmTurns: [
    "the movie trusts tone enough to leave some space open",
    "the scene wants feeling without over-writing it",
    "the frame is doing more than the plot summary",
    "the mood lands because nobody rushes it",
  ],
  tvTitles: [
    "Pilot World-Building Cue",
    "Episode Tone Setter",
    "Cold Open With Context",
    "Scene That Teaches You The Show",
  ],
  tvSetups: [
    "the pilot scene where a show sketches the world quickly",
    "the sequence that teaches you who feels cool and who feels out of place",
    "the episode opener that uses tone as world-building",
    "the moment a show quietly decides what kind of feelings count here",
  ],
  tvTurns: [
    "the tone arrives before the explanation does",
    "the setting becomes legible through pacing",
    "the show gets specific without getting noisy",
    "the music tells you what the script is saving for later",
  ],
  listenFor: [
    "the texture setting the mood before the melody does",
    "how the arrangement tells you where the energy wants to sit",
    "what makes this feel cinematic instead of merely well-made",
    "where repetition starts acting like scene direction",
    "how small details widen the emotional frame",
  ],
  studios: ["Remedy", "Annapurna Interactive", "Campo Santo", "Supergiant Games"],
  bossFightModes: [
    "the encounter where atmosphere becomes a mechanic",
    "the fight that sounds bigger because the room gets specific",
    "less pure action, more story pressure with a health bar",
    "the boss cue that makes the setting part of the threat",
  ],
  needleDropScenes: [
    "the scene where the movie chooses tone over explanation and wins",
    "the transition that turns mood into plot",
    "the walk that suddenly feels like character development",
    "the shot where the room starts carrying memory on purpose",
  ],
  endCreditsMoods: [
    "still processing, but in a good-looking way",
    "a little wrecked, a little wiser, definitely still listening",
    "not fully resolved, which is part of the charm",
    "the mood that keeps talking after the credits arrive",
  ],
};

const DECADE_FLAVORS = [
  {
    maxYear: 1979,
    vibe: "That pre-digital grain gives it a tactile, hand-held feel.",
    sceneNote: "The older recording grain keeps the whole scene feeling lived in.",
  },
  {
    maxYear: 1989,
    vibe: "The eighties gloss keeps it dramatic without sanding off the personality.",
    sceneNote: "That era gloss makes even the quiet parts feel staged in a good way.",
  },
  {
    maxYear: 1999,
    vibe: "The nineties texture keeps it direct, roomy, and a little bruised.",
    sceneNote: "The nineties roominess gives the scene somewhere to breathe.",
  },
  {
    maxYear: 2009,
    vibe: "The millennial polish keeps it sharp enough for montage work without turning sterile.",
    sceneNote: "That millennial sheen makes the pacing feel clipped and purposeful.",
  },
  {
    maxYear: Infinity,
    vibe: "The modern detail lets tiny production choices read like camera moves.",
    sceneNote: "The modern detail makes the scene feel lit from the inside out.",
  },
];

const MEDIUM_ICONS = {
  game: "\uD83C\uDFAE",
  film: "\uD83C\uDFAC",
  tv: "\uD83D\uDCFA",
};

const GAME_CODAS = [
  "You can practically see the autosave icon blinking in the corner.",
  "It sounds like the part of the level players remember more vividly than the tutorial writers expected.",
  "It is the kind of cue that makes wandering feel smarter than following orders.",
  "The best version of the scene is the one where the player slows down just enough to notice the world.",
];

const FILM_CODAS = [
  "The camera would not need to push hard; the mood is already doing it.",
  "It works best when the scene trusts posture and timing more than speeches.",
  "The whole thing lands because the frame can afford to linger.",
  "This is pure \"let the room finish the sentence\" material.",
];

const TV_CODAS = [
  "You would know what kind of show it is within thirty seconds.",
  "This is the sort of cue that makes an episode feel authored instead of merely assembled.",
  "The edit would get sharper the second this drops in.",
  "It gives the scene enough personality to do character work before the dialogue catches up.",
];

const EXTRA_ANGLES = [
  {
    key: "boss-fight",
    label: "Boss Fight Energy",
    build(album, profile, decadeFlavor) {
      const seed = getAlbumSeed(album, "boss-fight");
      return {
        key: "boss-fight",
        label: "Boss Fight Energy",
        title: pick(
          [
            "This boss definitely has a second phase",
            "Danger with production design",
            "A fight you lose once on principle",
            "Health bar reveal music",
          ],
          seed,
          1,
        ),
        body: `${capitalize(profile.bossFightModes, seed, 2)}. ${decadeFlavor.sceneNote}`,
      };
    },
  },
  {
    key: "needle-drop",
    label: "Needle Drop Scene",
    build(album, profile) {
      const seed = getAlbumSeed(album, "needle-drop");
      return {
        key: "needle-drop",
        label: "Needle Drop Scene",
        title: pick(
          [
            "This is where the movie gets honest",
            "The perfect cut-to-montage cue",
            "A scene nobody should talk over",
            "The walk-out song for consequences",
          ],
          seed,
          1,
        ),
        body: `Use it for ${pick(profile.needleDropScenes, seed, 2)}.`,
      };
    },
  },
  {
    key: "cold-open",
    label: "Prestige TV Cold Open",
    build(album, profile) {
      const seed = getAlbumSeed(album, "cold-open");
      return {
        key: "cold-open",
        label: "Prestige TV Cold Open",
        title: pick(
          [
            "Open on the city before the plot",
            "Episode starts with vibes and a problem",
            "Character first, exposition later",
            "A cold open that trusts the audience",
          ],
          seed,
          1,
        ),
        body: `This works for ${pick(profile.tvSetups, seed, 2)}, especially when ${pick(profile.tvTurns, seed, 3)}.`,
      };
    },
  },
  {
    key: "studio-match",
    label: "Best Used By",
    build(album, profile) {
      const seed = getAlbumSeed(album, "studio-match");
      const studio = pick(profile.studios, seed, 1);
      return {
        key: "studio-match",
        label: "Best Used By",
        title: studio,
        body: `${studio} could use this when the world design needs ${pick(profile.recommendationTraits, seed, 2)} without flattening the personality.`,
      };
    },
  },
  {
    key: "end-credits",
    label: "End Credits Mood",
    build(album, profile) {
      const seed = getAlbumSeed(album, "end-credits");
      return {
        key: "end-credits",
        label: "End Credits Mood",
        title: pick(
          [
            "Roll credits while the feeling is still warm",
            "The credits should arrive before you recover",
            "Leave the last image hanging",
            "Perfect for the \"nobody is fine yet\" crawl",
          ],
          seed,
          1,
        ),
        body: `${capitalize(profile.endCreditsMoods, seed, 2)}.`,
      };
    },
  },
];

function hashString(input) {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function getAlbumSeed(album, salt = "") {
  return hashString(
    `${album.title}|${album.artist}|${album.genre}|${album.year}|${salt}`,
  );
}

function pick(items, seed, salt = 0) {
  return items[hashString(`${seed}:${salt}`) % items.length];
}

function pickDistinct(items, seed, count, salt = 0) {
  return [...items]
    .map((item, index) => ({
      item,
      score: hashString(`${seed}:${salt}:${index}`),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map((entry) => entry.item);
}

function capitalize(items, seed, salt = 0) {
  const value = pick(items, seed, salt);
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getProfileForGenre(genre) {
  return (
    SOUNDTRACK_PROFILES.find((profile) => profile.match.test(genre)) ||
    DEFAULT_PROFILE
  );
}

function getDecadeFlavor(year) {
  return (
    DECADE_FLAVORS.find((entry) => year <= entry.maxYear) ||
    DECADE_FLAVORS[DECADE_FLAVORS.length - 1]
  );
}

function getDecadeLabel(year) {
  return `${Math.floor(year / 10) * 10}s`;
}

function getGenreSegments(genre) {
  return String(genre || "")
    .split(/[\/,&]+/)
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean);
}

function scoreRecommendation(baseAlbum, candidate) {
  if (
    candidate.title === baseAlbum.title &&
    candidate.artist === baseAlbum.artist
  ) {
    return -Infinity;
  }

  const baseSegments = getGenreSegments(baseAlbum.genre);
  const candidateSegments = getGenreSegments(candidate.genre);
  const sharedSegments = baseSegments.filter((segment) =>
    candidateSegments.includes(segment),
  ).length;
  const sameProfileKey =
    getProfileForGenre(baseAlbum.genre).key ===
    getProfileForGenre(candidate.genre).key;
  const yearDistance = Math.abs(baseAlbum.year - candidate.year);

  let score = sharedSegments * 7;

  if (candidate.genre === baseAlbum.genre) {
    score += 3;
  }

  if (sameProfileKey) {
    score += 4;
  }

  if (yearDistance <= 3) {
    score += 4;
  } else if (yearDistance <= 8) {
    score += 3;
  } else if (yearDistance <= 15) {
    score += 2;
  } else if (yearDistance <= 25) {
    score += 1;
  }

  if (candidate.artist === baseAlbum.artist) {
    score += 1;
  }

  if (candidate.recognizable) {
    score += 1;
  }

  return score;
}

function buildRecommendationReason(baseAlbum, candidate, profile) {
  const baseSegments = getGenreSegments(baseAlbum.genre);
  const candidateSegments = getGenreSegments(candidate.genre);
  const sharedSegment = baseSegments.find((segment) =>
    candidateSegments.includes(segment),
  );
  const sameProfileKey =
    getProfileForGenre(baseAlbum.genre).key ===
    getProfileForGenre(candidate.genre).key;
  const yearDistance = Math.abs(baseAlbum.year - candidate.year);
  const decadeMatch = getDecadeLabel(baseAlbum.year) === getDecadeLabel(candidate.year);
  const seed = getAlbumSeed(candidate, `reason:${baseAlbum.title}`);
  const trait = pick(profile.recommendationTraits, seed, 1);

  if (candidate.artist === baseAlbum.artist) {
    return `Same artist, different angle. It keeps the ${trait} while changing the framing.`;
  }

  if (sharedSegment && yearDistance <= 8) {
    return `Shares the ${sharedSegment} backbone and lives in similar air. Good next move if you want ${trait} without replaying the same record.`;
  }

  if (sharedSegment) {
    return `Shares the ${sharedSegment} pull, but bends it a little differently. Good if you want more ${trait}.`;
  }

  if (sameProfileKey) {
    return `Lives in the same broad lane, but with a different cut of ${trait}. Good next move when you want kinship, not a duplicate.`;
  }

  if (decadeMatch) {
    return `Comes from the same ${getDecadeLabel(baseAlbum.year)} neighborhood, with a fresh angle on the same broad mood.`;
  }

  return `Not a clone, just a good adjacent turn. It keeps the ${trait} and changes the scenery.`;
}

function getRecommendations(album, profile) {
  const ranked = ALBUMS.map((candidate) => ({
    album: candidate,
    score: scoreRecommendation(album, candidate),
  }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Math.abs(album.year - a.album.year) - Math.abs(album.year - b.album.year) ||
        a.album.title.localeCompare(b.album.title),
    );

  const picks = [];
  const usedArtists = new Set([album.artist.toLowerCase()]);

  for (const entry of ranked) {
    const candidateArtist = entry.album.artist.toLowerCase();
    if (usedArtists.has(candidateArtist)) {
      continue;
    }
    picks.push(entry.album);
    usedArtists.add(candidateArtist);
    if (picks.length === 3) break;
  }

  if (picks.length < 3) {
    for (const entry of ranked) {
      if (picks.some((pickAlbum) => pickAlbum.title === entry.album.title)) {
        continue;
      }
      picks.push(entry.album);
      if (picks.length === 3) break;
    }
  }

  return picks.map((recommendation) => ({
    title: recommendation.title,
    artist: recommendation.artist,
    year: recommendation.year,
    cover: recommendation.cover,
    href: getListenUrl(recommendation),
    cta: recommendation.youtubeId ? "Play on YouTube" : "Search YouTube",
    reason: buildRecommendationReason(album, recommendation, profile),
  }));
}

function buildGameCard(album, profile, decadeFlavor) {
  const seed = getAlbumSeed(album, "game");

  return {
    key: "game",
    icon: MEDIUM_ICONS.game,
    label: "Game",
    title: pick(profile.gameTitles, seed, 1),
    body: `If ${album.title} scored ${pick(profile.gameLocations, seed, 2)}, it would be the part where ${pick(profile.gameActions, seed, 3)}. ${pick(GAME_CODAS, seed, 4)} ${decadeFlavor.sceneNote}`,
  };
}

function buildFilmCard(album, profile, decadeFlavor) {
  const seed = getAlbumSeed(album, "film");

  return {
    key: "film",
    icon: MEDIUM_ICONS.film,
    label: "Film",
    title: pick(profile.filmTitles, seed, 1),
    body: `${album.title} works for ${pick(profile.filmShots, seed, 2)}, especially when ${pick(profile.filmTurns, seed, 3)}. ${pick(FILM_CODAS, seed, 4)} ${decadeFlavor.sceneNote}`,
  };
}

function buildTvCard(album, profile, decadeFlavor) {
  const seed = getAlbumSeed(album, "tv");

  return {
    key: "tv",
    icon: MEDIUM_ICONS.tv,
    label: "TV",
    title: pick(profile.tvTitles, seed, 1),
    body: `Use it for ${pick(profile.tvSetups, seed, 2)}, when ${pick(profile.tvTurns, seed, 3)}. ${pick(TV_CODAS, seed, 4)} ${decadeFlavor.sceneNote}`,
  };
}

function buildExtraAngles(album, profile, decadeFlavor) {
  const seed = getAlbumSeed(album, "angles");

  return pickDistinct(EXTRA_ANGLES, seed, 2, 1).map((angle) =>
    angle.build(album, profile, decadeFlavor),
  );
}

export function buildSoundtrackCorner(album) {
  const profile = getProfileForGenre(album.genre);
  const decadeFlavor = getDecadeFlavor(album.year);
  const decadeLabel = getDecadeLabel(album.year);
  const seed = getAlbumSeed(album, "listen-for");

  return {
    title: "Soundtrack Corner",
    kicker: `${album.title} as game / film / TV cue music`,
    intro: `${album.title} by ${album.artist} feels built for scene work. It has ${profile.texture}. ${decadeFlavor.vibe}`,
    listenNow: {
      label: album.youtubeId ? "Spin today's album" : "Search today's album",
      href: getListenUrl(album),
    },
    cards: [
      buildGameCard(album, profile, decadeFlavor),
      buildFilmCard(album, profile, decadeFlavor),
      buildTvCard(album, profile, decadeFlavor),
    ],
    bridgeNote: `${album.genre} from the ${decadeLabel} lands best on screen when the ${profile.bridgeFocus} and ${profile.texture} stay louder than generic background mood.`,
    extraAnglesHeading: "Two more angles",
    extraAngles: buildExtraAngles(album, profile, decadeFlavor),
    listenForHeading: "Listen for",
    listenFor: pickDistinct(profile.listenFor, seed, 3, 2),
    recommendationsHeading: "Listen next",
    recommendationsIntro: "If today's album clicked, go here next.",
    recommendations: getRecommendations(album, profile),
  };
}
