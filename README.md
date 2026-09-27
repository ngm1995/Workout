# Workout

Nick's personal workout logger for Program v2 (Upper A → Lower A → Upper B → Lower B).

A web app you install to your iPhone home screen. No accounts or servers. It works offline, and your log is saved on the phone.

**Open it:** https://ngm1995.github.io/Workout/

## Files

- `data.js`: the program. Exercises, rep ranges, weight jumps, cues, alternates, and the "Last:" numbers imported from Program v2. Change the program here.
- `logic.js`: progression rules and the review text.
- `app.js`: the screens.
- `styles.css`, `index.html`: look and layout.
- `sw.js`, `manifest.webmanifest`, `icons/`: offline support and the home-screen icon.

## Progression rule

- Hit the top of the rep range on every planned set: weight goes up (+5 upper, +10 lower compounds, +2.5–5 raises/curls/isolation). Aim for the bottom of the range.
- Averaged 3+ reps under the range: weight comes down, and you aim for the bottom of the range.
- Anything else: same weight, beat each set by 1 rep.
