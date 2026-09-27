// Program v2 — Upper / Lower. Everything the app knows about the program lives here.
//
// Exercise fields
//   sets, lo, hi   planned sets and rep range
//   load           'side' (plate-loaded, per side) | 'each' (dumbbells, per hand)
//                  | 'stack' (pin/plates, total) | 'bw' (bodyweight; weight = added load)
//   step, fine     big / small +- button increments
//   inc            weight added when every set hits the top of the range (0 = never add)
//   firstLoad      bodyweight moves: first added load once BW is maxed
//   perSide        reps are counted per leg / per arm
//   lFirst         left side first
//   start          starting weight when there's no history (null = find it)
//   startNote      shown when there's no history
//   focus, cues    shown in the collapsible "Cues & alternates" panel
//   alts           swaps for when the machine is taken

export const EX = {
  // ---------------- UPPER ----------------
  chest_press_iso: {
    name: 'Iso-lateral chest press', sets: 3, lo: 8, hi: 12, load: 'side', step: 5, fine: 2.5, inc: 5, start: 45,
    focus: 'Chest, not front delts. Own the stretch at the bottom.',
    cues: [
      'Set the seat so the handles line up with mid-chest.',
      'Pin shoulder blades back and down before the first rep and keep them there.',
      'Press slightly in toward the midline — think "squeeze the chest," not "push the handles."',
      '2–3 sec down to a full stretch; stop just short of lockout.',
    ],
    alts: [
      { id: 'alt_machine_chest_press', name: 'Chest press machine (pin-loaded)', load: 'stack' },
      { id: 'alt_smith_flat_press', name: 'Smith machine flat press', load: 'stack' },
      { id: 'alt_cable_chest_press', name: 'Cable chest press', load: 'stack' },
    ],
  },
  lat_raise_machine: {
    name: 'Machine lateral raise', sets: 4, lo: 12, hi: 15, load: 'stack', step: 5, fine: 2.5, inc: 2.5, start: null,
    startNote: 'No clean numbers yet (machine was broken last time, topped out at 25). Find a weight you can do 12–15 with.',
    focus: 'Side delts only. Width comes from these.',
    cues: [
      'Pads just above the elbows; lead with the elbows, not the hands.',
      'Raise to shoulder height — no higher.',
      'Shoulders down, no shrugging. If traps take over, the weight is too heavy.',
      '1 sec pause at the top, 2–3 sec down.',
    ],
    alts: [
      { id: 'cable_lat_raise', name: 'Cable lateral raise (one arm)', perSide: true },
      { id: 'alt_db_lat_raise', name: 'DB lateral raise', load: 'each' },
      { id: 'alt_leanaway_db_raise', name: 'Lean-away DB lateral raise', load: 'each', perSide: true },
    ],
  },
  tbar_row_cs: {
    name: 'Chest-supported T-bar row', sets: 4, lo: 10, hi: 12, load: 'stack', step: 5, fine: 2.5, inc: 5, start: 70,
    focus: 'Mid-back thickness. Pull with the elbows.',
    cues: [
      'Chest glued to the pad for every rep.',
      'Drive the elbows toward your hips; squeeze the shoulder blades together for 1 sec.',
      'Let the shoulder blades spread at the bottom for a full stretch — without rounding off the pad.',
      "No heaving. If the chest lifts, it's too heavy.",
    ],
    alts: [
      { id: 'alt_seated_cable_row', name: 'Seated cable row', load: 'stack' },
      { id: 'alt_cs_db_row', name: 'Chest-supported DB row (incline bench)', load: 'each' },
      { id: 'alt_iso_row', name: 'Iso-lateral row machine', load: 'side' },
    ],
  },
  incline_fly_iso: {
    name: 'Iso-lateral incline fly', sets: 3, lo: 12, hi: 15, load: 'side', step: 5, fine: 2.5, inc: 5, start: 40,
    focus: 'Upper chest. Slow on the stretch.',
    cues: [
      'Soft bend in the elbows — lock that angle and keep it the whole set.',
      '3 sec on the way out; feel the stretch across the upper chest.',
      'Bring the hands up and together like hugging a tree. Squeeze 1 sec.',
      "It's a fly, not a press — if the elbows bend and straighten, drop the weight.",
    ],
    alts: [
      { id: 'alt_low_high_cable_fly', name: 'Low-to-high cable fly', load: 'stack' },
      { id: 'alt_incline_db_fly', name: 'Incline DB fly (light)', load: 'each' },
      { id: 'alt_pec_deck_upper', name: 'Pec deck (seat low)', load: 'stack' },
    ],
  },
  rear_delt_fly: {
    name: 'Rear delt fly (machine)', sets: 3, lo: 12, hi: 15, load: 'stack', step: 5, fine: 2.5, inc: 2.5, start: 40,
    startNote: 'Last time: 30–40, one arm at a time.',
    focus: 'Rear delts. Drive with the elbows.',
    cues: [
      'Chest on the pad, arms long with a slight bend.',
      'Drive the elbows out and back in a wide arc.',
      "Don't pinch the shoulder blades hard — that turns it into a back exercise.",
      'Pause at the back, slow return; don\'t let the stack touch.',
    ],
    alts: [
      { id: 'alt_cable_reverse_fly', name: 'Cable reverse fly (crossed cables)', load: 'stack' },
      { id: 'alt_face_pull', name: 'Face pull (rope)', load: 'stack' },
      { id: 'alt_bent_db_reverse_fly', name: 'Bent-over DB reverse fly', load: 'each' },
    ],
  },
  db_curl: {
    name: 'DB curl', sets: 3, lo: 10, hi: 12, load: 'each', step: 5, fine: 2.5, inc: 5, start: 25,
    startNote: 'Last time: 25s, worst set 8/arm. Hit 10 on all sets before going up.',
    focus: 'Biceps. Full range, no swinging.',
    cues: [
      'Elbows pinned to your sides — they should not drift forward.',
      'Turn the pinkies up (supinate) as you curl; squeeze at the top.',
      '2–3 sec down to a full straight arm.',
      'If you have to swing, the set is over.',
    ],
    alts: [
      { id: 'alt_cable_curl', name: 'Cable curl', load: 'stack' },
      { id: 'alt_ez_curl', name: 'EZ-bar curl', load: 'stack' },
      { id: 'alt_preacher_machine', name: 'Preacher curl machine', load: 'stack' },
    ],
  },
  tricep_pressdown: {
    name: 'Tricep pressdown (rope)', sets: 3, lo: 10, hi: 12, load: 'stack', step: 5, fine: 2.5, inc: 5, start: 40,
    startNote: 'Last time: rope, 40–50.',
    focus: 'Triceps. Full lockout every rep.',
    cues: [
      'Elbows pinned at your sides; only the forearms move.',
      'Spread the rope apart at the bottom and fully lock out.',
      'Slight forward lean, chest up.',
      'Control back up to about 90° — don\'t let the stack yank your hands up.',
    ],
    alts: [
      { id: 'alt_vbar_pressdown', name: 'V-bar / straight-bar pressdown', load: 'stack' },
      { id: 'alt_single_arm_pressdown', name: 'Single-arm cable pressdown', load: 'stack', perSide: true },
      { id: 'alt_dip_machine', name: 'Dip machine', load: 'stack' },
    ],
  },
  captains_chair: {
    name: "Captain's chair", sets: 2, lo: 12, hi: 15, load: 'bw', step: 5, fine: 2.5, inc: 0, start: 0,
    focus: 'Lower abs. Curl the pelvis, don\'t just lift the legs.',
    cues: [
      'Back flat against the pad the whole time.',
      'Bring the knees up AND tuck the tailbone — the curl is the rep.',
      'No swinging. Pause at the top.',
      '2–3 sec down.',
    ],
    alts: [
      { id: 'alt_hanging_knee_raise', name: 'Hanging knee raise', load: 'bw' },
      { id: 'alt_cable_crunch', name: 'Cable crunch', load: 'stack' },
      { id: 'alt_reverse_crunch', name: 'Reverse crunch (bench)', load: 'bw' },
    ],
  },
  pullup: {
    name: 'Pull-ups', sets: 3, lo: 6, hi: 8, load: 'bw', step: 5, fine: 2.5, inc: 5, firstLoad: 5, start: 0,
    focus: 'Lats. Every rep from a dead hang. Half reps count as .5.',
    cues: [
      'Start from a full dead hang every rep.',
      'Drive the elbows down toward your back pockets.',
      'Chest up to the bar; chin over is the minimum.',
      '2 sec lowering. No kipping.',
    ],
    alts: [
      { id: 'alt_assisted_pullup', name: 'Assisted pull-up machine', load: 'stack' },
      { id: 'alt_heavy_pulldown', name: 'Lat pulldown (heavy, 6–8)', load: 'stack' },
      { id: 'alt_negative_pullup', name: 'Negative pull-ups (5 sec down)', load: 'bw' },
    ],
  },
  shoulder_press_iso: {
    name: 'Iso-lateral shoulder press', sets: 3, lo: 8, hi: 12, load: 'side', step: 5, fine: 2.5, inc: 5, start: 55,
    focus: 'Front and side delts. Ribs down.',
    cues: [
      'Back flat against the pad; brace, ribs down — no arching.',
      'Start with the handles around chin/ear level.',
      'Press up and slightly in; stop just short of lockout.',
      'Control the way down to full depth.',
    ],
    alts: [
      { id: 'alt_seated_db_press', name: 'Seated DB shoulder press', load: 'each' },
      { id: 'alt_smith_ohp', name: 'Smith seated press', load: 'stack' },
      { id: 'alt_shoulder_press_machine', name: 'Shoulder press machine (pin-loaded)', load: 'stack' },
    ],
  },
  lat_pulldown: {
    name: 'Lat pulldown', sets: 3, lo: 10, hi: 12, load: 'stack', step: 5, fine: 2.5, inc: 5, start: 100,
    focus: 'Lat width. Full stretch at the top.',
    cues: [
      'Thighs locked under the pad; slight lean back.',
      'Pull the bar to the upper chest, elbows down and back.',
      'Squeeze the lats 1 sec at the bottom.',
      'Let the arms go fully long at the top — feel the lats stretch.',
    ],
    alts: [
      { id: 'alt_iso_pulldown', name: 'Iso-lateral pulldown', load: 'side' },
      { id: 'alt_single_arm_pulldown', name: 'Single-arm cable pulldown', load: 'stack', perSide: true },
      { id: 'alt_assisted_pullup', name: 'Assisted pull-up machine', load: 'stack' },
    ],
  },
  chest_fly_machine: {
    name: 'Chest fly machine', sets: 3, lo: 12, hi: 15, load: 'stack', step: 5, fine: 2.5, inc: 5, start: 100,
    focus: 'Chest squeeze. Slow stretch.',
    cues: [
      'Seat height so the handles are at mid-chest.',
      'Chest up, shoulders back and down; slight bend in the elbows.',
      'Bring the hands together and squeeze 1 sec.',
      'Slow on the way back; stop at a good stretch, not a shoulder yank.',
    ],
    alts: [
      { id: 'alt_cable_fly', name: 'Cable fly (mid height)', load: 'stack' },
      { id: 'alt_db_fly', name: 'Flat DB fly', load: 'each' },
      { id: 'alt_pec_deck', name: 'Pec deck', load: 'stack' },
    ],
  },
  overhead_cable_ext: {
    name: 'Overhead cable extension', sets: 3, lo: 10, hi: 12, load: 'stack', step: 5, fine: 2.5, inc: 5, start: 30,
    focus: 'Long head of the triceps. Deep stretch behind the head.',
    cues: [
      'Face away from the stack; staggered stance, brace.',
      'Elbows point forward and stay close to the head.',
      'Let the hands drop deep behind the head for the stretch.',
      'Extend to full lockout; keep the ribs down.',
    ],
    alts: [
      { id: 'alt_overhead_db_ext', name: 'Overhead DB extension (two hands)', load: 'each' },
      { id: 'alt_skull_crusher', name: 'EZ-bar skull crusher', load: 'stack' },
      { id: 'alt_single_arm_oh_ext', name: 'Single-arm overhead cable extension', load: 'stack', perSide: true },
    ],
  },

  // ---------------- LOWER ----------------
  leg_press: {
    name: 'Leg press', sets: 4, lo: 10, hi: 15, load: 'stack', step: 10, fine: 5, inc: 10, start: 145,
    focus: 'Quads. Deep and controlled.',
    cues: [
      'Feet shoulder-width, middle of the platform (a bit lower = more quad).',
      'Lower until the knees are deep — stop right before the lower back peels off the pad.',
      'Press through the whole foot; knees track over the toes.',
      "Don't lock the knees at the top.",
    ],
    alts: [
      { id: 'alt_hack_squat', name: 'Hack squat', load: 'side' },
      { id: 'alt_smith_squat', name: 'Smith machine squat', load: 'stack' },
      { id: 'alt_goblet_squat', name: 'Goblet squat (heels elevated)', load: 'each' },
    ],
  },
  bss: {
    name: 'Bulgarian split squat', sets: 3, lo: 10, hi: 10, load: 'bw', step: 5, fine: 2.5, inc: 5, firstLoad: 15,
    perSide: true, lFirst: true, start: 0,
    focus: 'Quads (front leg). Once 10 is clean on every set, hold 15s.',
    cues: [
      'Front foot far enough out that the heel stays down at the bottom.',
      'Stay fairly upright and let the front knee travel forward — that\'s what loads the quad.',
      'Drop the back knee straight down; don\'t push off the back foot.',
      'Drive up through the whole front foot. Left side first.',
    ],
    alts: [
      { id: 'alt_reverse_lunge_smith', name: 'Smith reverse lunge', load: 'stack', perSide: true },
      { id: 'alt_split_squat', name: 'Split squat (back foot on floor)', load: 'bw', perSide: true },
      { id: 'alt_walking_lunge', name: 'Walking lunge', load: 'each', perSide: true },
    ],
  },
  leg_ext: {
    name: 'Leg extension', sets: 3, lo: 15, hi: 20, load: 'stack', step: 5, fine: 2.5, inc: 5, start: 70,
    focus: 'Quads. Pause at the top.',
    cues: [
      'Line the knee up with the machine\'s pivot; pad on the lower shin.',
      'Hold the handles and pull your hips down into the seat.',
      'Hard 1 sec squeeze at the top, legs straight.',
      '3 sec down. No swinging.',
    ],
    alts: [
      { id: 'alt_single_leg_ext', name: 'Single-leg extension', load: 'stack', perSide: true },
      { id: 'alt_sissy_squat', name: 'Assisted sissy squat', load: 'bw' },
      { id: 'alt_goblet_squat', name: 'Goblet squat (heels elevated)', load: 'each' },
    ],
  },
  lying_leg_curl: {
    name: 'Lying leg curl', sets: 3, lo: 10, hi: 12, load: 'stack', step: 5, fine: 2.5, inc: 5, start: 60,
    focus: 'Hamstrings. Hips stay down.',
    cues: [
      'Hips pressed into the pad the whole set.',
      'Pad just above the heels; pull the toes toward the shins.',
      'Curl all the way; squeeze 1 sec.',
      '3 sec down to almost straight.',
    ],
    alts: [
      { id: 'alt_seated_leg_curl', name: 'Seated leg curl', load: 'stack' },
      { id: 'standing_leg_curl', name: 'Standing leg curl (single leg)', perSide: true },
      { id: 'alt_ball_curl', name: 'Stability-ball hamstring curl', load: 'bw' },
    ],
  },
  abductor: {
    name: 'Abductor', sets: 3, lo: 12, hi: 15, load: 'stack', step: 5, fine: 2.5, inc: 5, start: 80,
    focus: 'Upper glutes / glute med.',
    cues: [
      'Lean the torso slightly forward to bias the glutes.',
      'Push the knees out under control; pause 1 sec wide.',
      "Slow return — don't let the stack slam.",
    ],
    alts: [
      { id: 'alt_cable_abduction', name: 'Cable hip abduction', load: 'stack', perSide: true },
      { id: 'alt_banded_walk', name: 'Banded lateral walk', load: 'bw' },
      { id: 'alt_side_lying_abduction', name: 'Side-lying hip abduction', load: 'bw', perSide: true },
    ],
  },
  calf_raise_sl: {
    name: 'Single-leg calf raise', sets: 4, lo: 12, hi: 15, load: 'bw', step: 5, fine: 2.5, inc: 5, firstLoad: 10,
    perSide: true, lFirst: true, start: 0,
    focus: 'Calves. Full stretch, pause at the top.',
    cues: [
      'Ball of the foot on the edge of a step.',
      'Sink into a full stretch at the bottom and hold 1–2 sec.',
      'Rise all the way up; pause 1 sec.',
      'No bouncing. Hold a rail for balance only.',
    ],
    alts: [
      { id: 'alt_seated_calf', name: 'Seated calf raise', load: 'stack' },
      { id: 'alt_leg_press_calf', name: 'Leg press calf raise', load: 'stack' },
      { id: 'alt_standing_calf_machine', name: 'Standing calf raise machine', load: 'stack' },
    ],
  },
  cable_lat_raise: {
    name: 'Cable lateral raise', sets: 2, lo: 15, hi: 20, load: 'stack', step: 5, fine: 2.5, inc: 2.5, start: 10,
    perSide: true, lFirst: true,
    focus: 'Side delts. Constant tension.',
    cues: [
      'Cable from the low pulley, running behind your body.',
      'Lean away slightly; lead with the elbow.',
      'Raise to shoulder height, no shrug.',
      'Slow down — the lowering is half the set.',
    ],
    alts: [
      { id: 'alt_db_lat_raise', name: 'DB lateral raise', load: 'each' },
      { id: 'lat_raise_machine', name: 'Machine lateral raise', perSide: false },
      { id: 'alt_leanaway_db_raise', name: 'Lean-away DB lateral raise', load: 'each', perSide: true },
    ],
  },
  smith_rdl: {
    name: 'Smith RDL', sets: 4, lo: 8, hi: 10, load: 'side', step: 5, fine: 2.5, inc: 5, start: 45,
    startNote: 'Barbell best: 125 × 10.',
    focus: 'Hamstrings and glutes. Hips back, not down.',
    cues: [
      'Soft knees; push the hips straight back.',
      'Bar stays close to the legs; go down until the hamstrings are fully stretched (around mid-shin).',
      'Neutral spine the whole time — stop where your back would round.',
      'Drive the hips forward to stand; squeeze the glutes, no leaning back.',
    ],
    alts: [
      { id: 'alt_barbell_rdl', name: 'Barbell RDL', load: 'stack' },
      { id: 'alt_db_rdl', name: 'DB RDL', load: 'each' },
      { id: 'alt_45_back_ext', name: '45° back extension (hams bias)', load: 'bw' },
    ],
  },
  hip_thrust_machine: {
    name: 'Hip thrust (machine)', sets: 3, lo: 10, hi: 12, load: 'stack', step: 5, fine: 2.5, inc: 10, start: null,
    startNote: 'Find it — the old machine was 40.',
    focus: 'Glutes. Pause at the top, ribs down, no arching.',
    cues: [
      'Feet planted so the shins are vertical at the top.',
      'Chin tucked, ribs down.',
      'Drive through the heels; tuck the pelvis at the top and pause 1 sec.',
      'The lower back should not arch — the glutes finish the rep.',
    ],
    alts: [
      { id: 'alt_barbell_hip_thrust', name: 'Barbell hip thrust', load: 'stack' },
      { id: 'alt_smith_hip_thrust', name: 'Smith hip thrust', load: 'stack' },
      { id: 'alt_glute_bridge', name: 'Glute bridge (DB/plate)', load: 'stack' },
    ],
  },
  standing_leg_curl: {
    name: 'Standing leg curl', sets: 3, lo: 10, hi: 12, load: 'stack', step: 5, fine: 2.5, inc: 5, start: 30,
    perSide: true, lFirst: true,
    focus: 'Hamstrings, one leg at a time.',
    cues: [
      'Hips against the pad; don\'t let them hike up.',
      'Curl the heel toward the glute; toes pulled up.',
      'Squeeze 1 sec, 3 sec down.',
      'Left side first.',
    ],
    alts: [
      { id: 'lying_leg_curl', name: 'Lying leg curl', perSide: false },
      { id: 'alt_seated_leg_curl', name: 'Seated leg curl', load: 'stack', perSide: false },
      { id: 'alt_cable_leg_curl', name: 'Standing cable leg curl (ankle strap)', load: 'stack', perSide: true },
    ],
  },
  reverse_hyper: {
    name: 'Reverse hyper', sets: 2, lo: 10, hi: 12, load: 'stack', step: 5, fine: 2.5, inc: 5, start: 50,
    focus: 'Glutes and lower back. Controlled, not swung.',
    cues: [
      'Hips right at the edge of the pad; grip the handles.',
      'Lift the legs with the glutes, to about hip height — no hyperextending.',
      'Control the way down; don\'t let momentum swing you into the next rep.',
    ],
    alts: [
      { id: 'alt_45_back_ext_glute', name: '45° back extension (glute bias)', load: 'bw' },
      { id: 'alt_cable_pull_through', name: 'Cable pull-through', load: 'stack' },
      { id: 'alt_glute_bridge', name: 'Glute bridge (DB/plate)', load: 'stack' },
    ],
  },
};

// Day layouts. ss = superset group label ("4A"), rest in seconds, ramp = warm-up note (not logged).
export const DAYS = {
  UA: {
    name: 'Upper A', focus: 'Chest + delts',
    slots: [
      { ex: 'chest_press_iso', ramp: '25/side × 12' },
      { ex: 'lat_raise_machine' },
      { ex: 'tbar_row_cs' },
      { ex: 'incline_fly_iso' },
      { ex: 'rear_delt_fly' },
      { ex: 'db_curl' },
      { ex: 'tricep_pressdown' },
      { ex: 'captains_chair' },
    ],
  },
  LA: {
    name: 'Lower A', focus: 'Quads',
    slots: [
      { ex: 'leg_press', ramp: 'light × 15, then ~60% × 8' },
      { ex: 'bss' },
      { ex: 'leg_ext', ss: '3A' },
      { ex: 'lying_leg_curl', ss: '3B' },
      { ex: 'abductor', ss: '4A' },
      { ex: 'calf_raise_sl', ss: '4B' },
      { ex: 'cable_lat_raise' },
    ],
  },
  UB: {
    name: 'Upper B', focus: 'Back width + delts',
    slots: [
      { ex: 'pullup', ramp: '15 sec dead hang + light lat pulldown × 12' },
      { ex: 'shoulder_press_iso', ramp: '25/side × 12' },
      { ex: 'lat_raise_machine' },
      { ex: 'lat_pulldown', ss: '4A' },
      { ex: 'chest_fly_machine', ss: '4B' },
      { ex: 'rear_delt_fly', ss: '5A' },
      { ex: 'overhead_cable_ext', ss: '5B' },
      { ex: 'db_curl' },
    ],
  },
  LB: {
    name: 'Lower B', focus: 'Hams + glutes',
    slots: [
      { ex: 'smith_rdl', ramp: 'bar × 12, then ~60% × 8' },
      { ex: 'hip_thrust_machine' },
      { ex: 'standing_leg_curl', ss: '3A' },
      { ex: 'leg_ext', ss: '3B' },
      { ex: 'reverse_hyper', ss: '4A' },
      { ex: 'calf_raise_sl', ss: '4B' },
      { ex: 'cable_lat_raise' },
      { ex: 'captains_chair' },
    ],
  },
};

export const ROTATION = ['UA', 'LA', 'UB', 'LB'];
export const REST_STRAIGHT = 90;
export const REST_SUPERSET = 60;

// "Last:" numbers from Program v2, so recommendations work from day one.
// Only clean numbers are imported; everything else starts from the program weight.
export const SEED = [
  {
    day: 'LA', date: '2026-09-20T18:00:00', entries: [
      ['leg_press', [[145, 10], [145, 12]]],
      ['bss', [[0, 10], [0, 8], [0, 8]]],
      ['leg_ext', [[70, 12], [70, 9]]],
      ['lying_leg_curl', [[60, 10]]],
      ['abductor', [[80, 10], [80, 10], [80, 10]]],
    ],
  },
  {
    day: 'UB', date: '2026-09-21T18:00:00', entries: [
      ['pullup', [[0, 5], [0, 4], [0, 3.5]]],
      ['shoulder_press_iso', [[55, 12], [55, 12], [55, 10]]],
      ['lat_pulldown', [[100, 10], [100, 10], [100, 10]]],
      ['chest_fly_machine', [[100, 9]]],
      ['overhead_cable_ext', [[30, 10]]],
    ],
  },
  {
    day: 'LB', date: '2026-09-22T18:00:00', entries: [
      ['standing_leg_curl', [[30, 12], [30, 12], [30, 12], [30, 12]]],
      ['reverse_hyper', [[50, 10], [50, 10], [50, 10]]],
    ],
  },
  {
    day: 'UA', date: '2026-09-26T18:00:00', entries: [
      ['chest_press_iso', [[45, 12], [60, 10], [60, 8]]],
      ['tbar_row_cs', [[70, 11], [70, 12]]],
      ['incline_fly_iso', [[50, 7], [50, 6], [50, 4]]],
    ],
  },
];
