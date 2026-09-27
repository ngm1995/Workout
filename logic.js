// Pure logic: progression targets, formatting, review text. No DOM in here.
import { EX, DAYS, ROTATION, REST_STRAIGHT, REST_SUPERSET } from './data.js';

const round = (x, step) => Math.round(x / step) * step;
const clean = (n) => Math.round(n * 100) / 100;

// The exercise actually being done in a slot (original, or a swap).
export function effectiveEx(slotExId, altId) {
  const base = EX[slotExId];
  if (!altId) return { id: slotExId, ...base };
  if (EX[altId]) return { id: altId, ...EX[altId], sets: base.sets, swappedFrom: slotExId };
  const alt = base.alts.find((a) => a.id === altId) || { id: altId, name: altId };
  return {
    ...base,
    ...alt,
    id: altId,
    start: null,
    startNote: 'First time on this one — pick a weight.',
    cues: [],
    alts: [],
    focus: '',
    swappedFrom: slotExId,
  };
}

export function unitLabel(ex) {
  if (ex.load === 'side') return 'lb/side';
  if (ex.load === 'each') return 'lb each';
  if (ex.load === 'bw') return 'added lb';
  return 'lb';
}

export function fmtW(ex, w) {
  if (w == null) return '—';
  if (ex.load === 'bw') return w > 0 ? `BW+${clean(w)}` : 'BW';
  return `${clean(w)}`;
}

export function fmtSet(ex, s) {
  return `${fmtW(ex, s.w)}×${clean(s.r)}`;
}

export function repsLabel(ex) {
  return ex.perSide ? 'reps/side' : 'reps';
}

// Double progression, per Program v2:
//  - every planned set hit the top of the range → add weight, aim for the bottom of the range
//  - averaged well under the range (3+ reps short) → drop weight, aim for the bottom
//  - otherwise → same weight, beat each set by 1 rep (capped at the top)
export function suggest(ex, lastSets) {
  const n = ex.sets;
  const fill = (v) => Array(n).fill(v);

  if (!lastSets || !lastSets.length) {
    const w = ex.start ?? null;
    return {
      w, reps: fill(ex.lo), kind: 'start',
      reason: ex.startNote || (w == null ? 'No history yet — pick a starting weight.' : 'No history yet — starting point from the program.'),
    };
  }

  const W = Math.max(...lastSets.map((s) => s.w));
  const work = lastSets.filter((s) => s.w === W);
  const wtxt = `${fmtW(ex, W)}${ex.load === 'bw' ? '' : ' ' + unitLabel(ex)}`;

  const allTop = work.length >= n && work.slice(0, n).every((s) => s.r >= ex.hi);
  if (allTop) {
    if (!ex.inc) {
      return {
        w: W, reps: fill(ex.hi), kind: 'max',
        reason: `Hit ${ex.hi} on every set. Stay at ${ex.hi} and make it harder: 3 sec lowering, pause at the top.`,
      };
    }
    const newW = W === 0 && ex.firstLoad ? ex.firstLoad : clean(W + ex.inc);
    return {
      w: newW, reps: fill(ex.lo), kind: 'up',
      reason: `Hit ${ex.hi} on all ${n} sets at ${wtxt} → go up to ${fmtW(ex, newW)}. Aim for ${ex.lo}+.`,
    };
  }

  const avg = work.reduce((a, s) => a + s.r, 0) / work.length;
  const deficit = ex.lo - avg;
  if (deficit > 3 && W > 0) {
    const pct = Math.min(0.3, deficit * 0.03);
    let newW = round(W * (1 - pct), ex.fine || ex.step);
    if (newW > W - ex.step) newW = W - ex.step;
    newW = Math.max(0, clean(newW));
    return {
      w: newW, reps: fill(ex.lo), kind: 'down',
      reason: `Averaged ${clean(avg)} reps at ${wtxt} — well under ${ex.lo}. Drop to ${fmtW(ex, newW)} and own the ${ex.lo}–${ex.hi} range.`,
    };
  }

  const reps = [];
  for (let i = 0; i < n; i++) {
    if (work[i]) reps.push(Math.min(ex.hi, clean(work[i].r + 1)));
    else reps.push(reps[i - 1]);
  }
  return {
    w: W, reps, kind: 'hold',
    reason: `Same weight. Beat last time by 1 rep per set (max ${ex.hi}). Hit ${ex.hi} on every set and the weight goes up.`,
  };
}

// ---------- workouts ----------

export function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Most recent workout (other than `excludeId`) that has sets for this exercise.
export function lastSession(workouts, exId, excludeId) {
  let best = null;
  for (const w of workouts) {
    if (w.id === excludeId) continue;
    const e = w.entries.find((en) => en.exId === exId && en.sets.length);
    if (e && (!best || w.start > best.w.start)) best = { w, e };
  }
  return best;
}

export function nextDay(workouts) {
  const done = workouts.filter((w) => w.status === 'done').sort((a, b) => b.start - a.start);
  if (!done.length) return { day: 'UA', last: null };
  const last = done[0];
  const i = ROTATION.indexOf(last.day);
  return { day: ROTATION[(i + 1) % ROTATION.length], last };
}

export function restFor(slot) {
  return slot.ss ? REST_SUPERSET : REST_STRAIGHT;
}

// Program numbering: 1, 2, 3A, 3B, 4 ...
export function slotLabel(day, i) {
  let n = 0;
  let label = '';
  DAYS[day].slots.forEach((s, j) => {
    if (!s.ss || s.ss.endsWith('A')) n++;
    if (j === i) label = s.ss || String(n);
  });
  return label;
}

export function slotEx(day, i, altId) {
  const slot = DAYS[day].slots[i];
  return effectiveEx(slot.ex, altId && altId !== slot.ex ? altId : null);
}

// Superset partner slot index, if any.
export function partnerIndex(day, i) {
  const s = DAYS[day].slots[i];
  if (!s.ss) return -1;
  const want = s.ss.slice(0, -1) + (s.ss.endsWith('A') ? 'B' : 'A');
  return DAYS[day].slots.findIndex((x) => x.ss === want);
}

export function dateLabel(ts, opts = {}) {
  return new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', ...opts });
}

export function timeLabel(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function durationMin(w) {
  const end = w.end || (w.entries.flatMap((e) => e.sets.map((s) => s.at)).sort().pop()) || w.start;
  return Math.max(0, Math.round((end - w.start) / 60000));
}

export function totalSets(w) {
  return w.entries.reduce((a, e) => a + e.sets.length, 0);
}

// Text for pasting into a review with Claude. Exercises in the order they were done.
export function reviewText(w) {
  const day = DAYS[w.day];
  const lines = [];
  const mins = durationMin(w);
  lines.push(`${day.name} — ${dateLabel(w.start, { year: 'numeric' })}${w.imported ? ' (imported from Program v2)' : ` · ${timeLabel(w.start)}${mins ? ` · ${mins} min` : ''}`}`);
  lines.push('');
  const done = w.entries.filter((e) => e.sets.length).sort((a, b) => a.order - b.order);
  done.forEach((e, i) => {
    const ex = slotEx(w.day, e.slot, e.exId);
    const origId = DAYS[w.day].slots[e.slot].ex;
    const sub = e.exId !== origId ? ` (sub for ${EX[origId].name})` : '';
    lines.push(`${i + 1}. ${e.name}${sub} — ${unitLabel(ex)}${ex.perSide ? ', ' + repsLabel(ex) : ''}`);
    if (e.target && e.target.w != null) lines.push(`   Target: ${fmtW(ex, e.target.w)} × ${e.target.reps.join('/')}`);
    lines.push(`   Did: ${e.sets.map((s) => fmtSet(ex, s)).join(', ')}`);
    if (e.note && e.note.trim()) lines.push(`   Note: ${e.note.trim()}`);
  });
  const noteOnly = w.entries.filter((e) => !e.sets.length && e.note && e.note.trim());
  noteOnly.forEach((e) => lines.push(`- ${e.name} (no sets): ${e.note.trim()}`));
  const touched = new Set(w.entries.filter((e) => e.sets.length).map((e) => e.slot));
  const skipped = day.slots.map((s, i) => (touched.has(i) ? null : EX[s.ex].name)).filter(Boolean);
  if (skipped.length && !w.imported) lines.push('', `Skipped: ${skipped.join(', ')}`);
  if (w.note && w.note.trim()) lines.push('', `Session note: ${w.note.trim()}`);
  return lines.join('\n');
}
