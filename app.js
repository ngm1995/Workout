import { EX, DAYS, ROTATION, SEED } from './data.js';
import * as L from './logic.js';

const KEY = 'workout-log-v1';
const app = document.getElementById('app');
const modalRoot = document.getElementById('modal');
const restbar = document.getElementById('restbar');
const toastEl = document.getElementById('toast');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (n) => Math.round(n * 100) / 100;

// ================= state =================

function seedState() {
  const workouts = SEED.map((d) => {
    const start = new Date(d.date).getTime();
    let seq = 0;
    return {
      id: L.newId(), day: d.day, start, end: null, status: 'done', imported: true,
      cursor: 0, swaps: {}, drafts: {}, seq: d.entries.length, note: '',
      entries: d.entries.map(([exId, sets]) => ({
        slot: DAYS[d.day].slots.findIndex((s) => s.ex === exId),
        exId, name: EX[exId].name, note: '', order: ++seq, target: null,
        sets: sets.map(([w, r]) => ({ w, r, at: start })),
      })),
    };
  });
  return { v: 1, workouts, activeId: null, lastBackup: null };
}

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.workouts)) return s;
    }
  } catch (e) { /* fall through */ }
  const s = seedState();
  write(s);
  return s;
}

function write(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch (e) {
    toast("Couldn't save — storage is full or blocked", 4000);
    return false;
  }
}

let S = loadState();
let savedTimer = null;
function save() {
  if (write(S)) {
    const el = document.querySelector('[data-saved]');
    if (el) {
      el.classList.add('on');
      clearTimeout(savedTimer);
      savedTimer = setTimeout(() => el.classList.remove('on'), 1200);
    }
  }
}
let noteTimer = null;
function saveSoon() {
  clearTimeout(noteTimer);
  noteTimer = setTimeout(save, 400);
}

if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

const active = () => S.workouts.find((w) => w.id === S.activeId && w.status === 'active') || null;
const byId = (id) => S.workouts.find((w) => w.id === id);

let view = active() ? { name: 'workout' } : { name: 'home' };
const ui = { cuesOpen: false };
let rest = null;

// ================= helpers =================

function daysAgo(ts) {
  const a = new Date(ts); a.setHours(0, 0, 0, 0);
  const b = new Date(); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
}
function rel(ts) {
  const d = daysAgo(ts);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d} days ago`;
  return L.dateLabel(ts);
}
function mmss(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(s).padStart(2, '0')}`;
}

function ctx(w, i) {
  const slot = DAYS[w.day].slots[i];
  const ex = L.slotEx(w.day, i, w.swaps[i]);
  const entry = w.entries.find((e) => e.slot === i && e.exId === ex.id) || null;
  const last = L.lastSession(S.workouts, ex.id, w.id);
  const sug = L.suggest(ex, last ? last.e.sets : null);
  const target = entry && entry.target ? entry.target : { w: sug.w, reps: sug.reps };
  const done = entry ? entry.sets : [];
  const key = `${i}:${ex.id}`;
  const d = w.drafts[key];
  const idx = done.length;
  const defW = done.length ? done[done.length - 1].w : (target.w ?? 0);
  const defR = target.reps[Math.min(idx, target.reps.length - 1)];
  return { slot, ex, entry, last, sug, target, done, key, idx, draft: { w: d?.w ?? defW, r: d?.r ?? defR } };
}

function getEntry(w, slot, exId, name) {
  let e = w.entries.find((x) => x.slot === slot && x.exId === exId);
  if (!e) {
    e = { slot, exId, name, sets: [], note: '', order: null, target: null };
    w.entries.push(e);
  }
  return e;
}

function chipClass(ex, target, s, i) {
  const tr = target.reps[Math.min(i, target.reps.length - 1)];
  const tw = target.w ?? s.w;
  if (s.w > tw) return 'hit';
  if (s.w < tw) return 'miss';
  return s.r >= tr || s.r >= ex.hi ? 'hit' : 'miss';
}

// ================= views =================

function render() {
  const fn = VIEWS[view.name] || VIEWS.home;
  app.innerHTML = fn();
  document.body.dataset.view = view.name;
  renderRest();
  tick();
  keepAwake(view.name === 'workout' && !!active());
}

function go(v) {
  view = v;
  render();
  window.scrollTo(0, 0);
}

const VIEWS = {
  home() {
    const a = active();
    const next = L.nextDay(S.workouts);
    const lastDoneOf = (day) => S.workouts.filter((w) => w.day === day && w.status === 'done').sort((x, y) => y.start - x.start)[0];
    let restHint = '';
    if (next.last) {
      const d = daysAgo(next.last.start);
      if (d >= 3) restHint = `<span class="warn">${d - 1} rest days — today's a training day.</span>`;
    }
    const backupDue = S.workouts.filter((w) => !w.imported).length >= 4 && (!S.lastBackup || daysAgo(S.lastBackup) >= 14);

    return `
      <header class="top">
        <div>
          <div class="eyebrow">${esc(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))}</div>
          <h1>Workout</h1>
        </div>
        <button class="iconbtn" data-act="go" data-to="settings" aria-label="Settings">${ICON.gear}</button>
      </header>

      ${a ? `
        <section class="resume">
          <div>
            <div class="eyebrow">In progress</div>
            <div class="resume-title">${esc(DAYS[a.day].name)}</div>
            <div class="muted">Started ${esc(L.timeLabel(a.start))} · ${L.totalSets(a)} set${L.totalSets(a) === 1 ? '' : 's'} logged</div>
          </div>
          <div class="resume-actions">
            <button class="btn primary" data-act="resume">Resume</button>
            <button class="btn ghost small" data-act="discard">Discard</button>
          </div>
        </section>` : ''}

      <button class="hero ${a ? 'dim' : ''}" data-act="start" data-day="${next.day}">
        <span class="eyebrow">Up next</span>
        <span class="hero-title">${esc(DAYS[next.day].name)}</span>
        <span class="hero-sub">${esc(DAYS[next.day].focus)}${next.last ? ` · last session ${esc(DAYS[next.last.day].name)}, ${esc(rel(next.last.start))}` : ''}</span>
        ${restHint}
        <span class="hero-go">Start ${ICON.arrow}</span>
      </button>

      <div class="section-label">Or pick a day</div>
      <div class="daygrid">
        ${ROTATION.map((d) => {
          const l = lastDoneOf(d);
          return `
          <button class="daybtn ${d === next.day ? 'is-next' : ''}" data-act="start" data-day="${d}">
            <span class="daybtn-name">${esc(DAYS[d].name)}</span>
            <span class="daybtn-focus">${esc(DAYS[d].focus)}</span>
            <span class="daybtn-last">${l ? (l.imported ? 'from program' : esc(rel(l.start))) : 'not yet'}</span>
          </button>`;
        }).join('')}
      </div>

      <button class="rowlink" data-act="go" data-to="history">
        <span>${ICON.list} History</span>
        <span class="muted">${S.workouts.filter((w) => w.status === 'done').length} workouts ${ICON.chev}</span>
      </button>
      ${backupDue ? `<button class="rowlink subtle" data-act="go" data-to="settings"><span>${ICON.save} Back up your log</span><span class="muted">${S.lastBackup ? 'last ' + esc(rel(S.lastBackup)) : 'never backed up'} ${ICON.chev}</span></button>` : ''}
    `;
  },

  workout() {
    const w = active();
    if (!w) { view = { name: 'home' }; return VIEWS.home(); }
    const day = DAYS[w.day];
    const i = Math.min(w.cursor || 0, day.slots.length - 1);
    const c = ctx(w, i);
    const { ex, slot, entry, last, sug, target, done, draft } = c;
    const n = ex.sets;
    const label = L.slotLabel(w.day, i);
    const p = L.partnerIndex(w.day, i);
    const eIdx = entry ? w.entries.indexOf(entry) : -1;
    const allDone = done.length >= n;
    const orig = EX[slot.ex];

    const chips = [];
    for (let k = 0; k < n; k++) {
      const s = done[k];
      const tr = target.reps[Math.min(k, target.reps.length - 1)];
      if (s) {
        chips.push(`<button class="chip done ${chipClass(ex, target, s, k)}" data-act="editset" data-wid="${w.id}" data-e="${eIdx}" data-s="${k}">
          <span class="chip-n">Set ${k + 1}</span><span class="chip-v">${esc(L.fmtSet(ex, s))}</span></button>`);
      } else {
        chips.push(`<div class="chip todo ${k === done.length ? 'next' : ''}">
          <span class="chip-n">Set ${k + 1}</span><span class="chip-v">${esc(L.fmtW(ex, target.w))}×${clean(tr)}</span></div>`);
      }
    }
    for (let k = n; k < done.length; k++) {
      const s = done[k];
      chips.push(`<button class="chip done extra ${chipClass(ex, target, s, k)}" data-act="editset" data-wid="${w.id}" data-e="${eIdx}" data-s="${k}">
        <span class="chip-n">Extra</span><span class="chip-v">${esc(L.fmtSet(ex, s))}</span></button>`);
    }

    const kindIcon = { up: '▲', down: '▼', hold: '→', start: '•', max: '★' }[sug.kind];
    const cues = ex.cues && ex.cues.length ? ex : orig;
    const alts = orig.alts.filter((a) => a.id !== ex.id);

    return `
      <header class="wtop">
        <button class="navbtn" data-act="go" data-to="home">${ICON.back} Home</button>
        <div class="wtitle">
          <b>${esc(day.name)}</b>
          <span><span data-elapsed>0:00</span> <span class="saved" data-saved>✓ saved</span></span>
        </div>
        <button class="navbtn accent" data-act="finish">Finish</button>
      </header>

      <nav class="dots">
        ${day.slots.map((s, j) => {
          const cj = w.entries.filter((e) => e.slot === j).reduce((a, e) => a + e.sets.length, 0);
          const nj = L.slotEx(w.day, j, w.swaps[j]).sets;
          return `<button class="dot ${j === i ? 'cur' : ''} ${cj >= nj ? 'full' : cj ? 'part' : ''}" data-act="jump" data-i="${j}" aria-label="${esc(EX[s.ex].name)}">${esc(L.slotLabel(w.day, j))}</button>`;
        }).join('')}
      </nav>

      <section class="excard" data-swipe>
        <div class="exmeta">
          <span>Exercise ${esc(label)}</span>
          ${slot.ss ? `<span class="tag ss">Superset</span>` : ''}
          ${ex.lFirst ? `<span class="tag">Left first</span>` : ''}
        </div>
        <h2 class="exname">${esc(ex.name)}</h2>
        ${ex.swappedFrom ? `<div class="swapnote">Sub for ${esc(orig.name)} · <button class="linkbtn" data-act="unswap">switch back</button></div>` : ''}
        <div class="rx">${n} × ${ex.lo === ex.hi ? ex.lo : `${ex.lo}–${ex.hi}`}${ex.perSide ? '/side' : ''} · rest ${L.restFor(slot)}s${slot.ss ? ' · alternate' : ''}</div>
        ${slot.ramp && !ex.swappedFrom && !done.length ? `<div class="ramp">Warm-up, don't log: ${esc(slot.ramp)}</div>` : ''}

        <div class="target-label">Target · ${esc(L.fmtW(ex, target.w))} ${ex.load === 'bw' ? '' : esc(L.unitLabel(ex))}</div>
        <div class="chips" style="grid-template-columns: repeat(${Math.min(4, Math.max(3, n))}, minmax(0, 1fr))">${chips.join('')}</div>
      </section>

      <section class="entry">
        <div class="entry-head">
          <span>${allDone ? 'All sets done' : `Set ${done.length + 1} of ${n}`}</span>
          ${allDone ? '<span class="muted">log more if you did extra</span>' : ''}
        </div>
        ${stepper('w', draft.w, ex, 'draft')}
        ${stepper('r', draft.r, ex, 'draft')}
        <button class="logbtn ${allDone ? 'secondary' : ''}" data-act="log">
          ${allDone ? 'Log extra set' : 'Log set'} <span>${esc(L.fmtW(ex, draft.w))} × ${clean(draft.r)}</span>
        </button>
        ${p >= 0 ? `<button class="btn ghost wide" data-act="jump" data-i="${p}">Superset → ${esc(L.slotLabel(w.day, p))} ${esc(L.slotEx(w.day, p, w.swaps[p]).name)} ${ICON.chev}</button>` : ''}
      </section>

      <section class="lasttime">
        <div class="reason k-${sug.kind}"><span>${kindIcon}</span><span>${esc(sug.reason)}</span></div>
        <div class="section-label">Last time</div>
        ${last ? `<div><span class="muted">${esc(last.w.imported ? 'From Program v2' : L.dateLabel(last.w.start))} ·</span> ${last.e.sets.map((s) => esc(L.fmtSet(ex, s))).join(' · ')}</div>
          ${last.e.note ? `<div class="lastnote">“${esc(last.e.note)}”</div>` : ''}` : `<div class="muted">No history for this exercise yet.</div>`}
      </section>

      <section class="notebox">
        <label class="section-label" for="note">Notes for your review</label>
        <textarea id="note" rows="2" data-note data-wid="${w.id}" data-slot="${i}" data-exid="${esc(ex.id)}" data-name="${esc(ex.name)}" placeholder="How it felt, pain, machine settings…">${esc(entry ? entry.note : '')}</textarea>
      </section>

      <details class="cues" data-cues ${ui.cuesOpen ? 'open' : ''}>
        <summary><span>Cues & alternates</span>${ICON.chevDown}</summary>
        <div class="cues-body">
          ${cues.focus ? `<p class="focus"><b>Focus:</b> ${esc(cues.focus)}</p>` : ''}
          ${cues !== ex ? `<p class="muted small">Cues from ${esc(orig.name)} — same idea applies.</p>` : ''}
          <ul>${cues.cues.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>
          <div class="section-label">Machine taken? Swap to</div>
          <div class="alts">
            ${ex.swappedFrom ? `<button class="alt" data-act="unswap"><span>${esc(orig.name)}</span><span class="alt-use">Back to original</span></button>` : ''}
            ${alts.map((a) => `<button class="alt" data-act="swap" data-alt="${esc(a.id)}"><span>${esc(EX[a.id] ? EX[a.id].name : a.name)}</span><span class="alt-use">Use</span></button>`).join('')}
          </div>
        </div>
      </details>

      <div class="pager-space"></div>
      <footer class="pager">
        <button class="pgbtn" data-act="prev" ${i === 0 ? 'disabled' : ''}>
          ${ICON.back}<span class="pg-text"><small>Prev</small><span class="pg-name">${i > 0 ? esc(L.slotEx(w.day, i - 1, w.swaps[i - 1]).name) : '—'}</span></span>
        </button>
        ${i < day.slots.length - 1
          ? `<button class="pgbtn right" data-act="next"><span class="pg-text"><small>Next</small><span class="pg-name">${esc(L.slotEx(w.day, i + 1, w.swaps[i + 1]).name)}</span></span>${ICON.fwd}</button>`
          : `<button class="pgbtn right finish" data-act="finish"><span class="pg-text"><small>Last one</small><span class="pg-name">Finish workout</span></span>${ICON.fwd}</button>`}
      </footer>
    `;
  },

  review() {
    const w = byId(view.id);
    if (!w) return VIEWS.home();
    return `
      <header class="top">
        <div>
          <div class="eyebrow">Workout saved</div>
          <h1>${esc(DAYS[w.day].name)}</h1>
        </div>
      </header>
      <div class="stats">
        <div><b>${L.totalSets(w)}</b><span>sets</span></div>
        <div><b>${w.entries.filter((e) => e.sets.length).length}</b><span>exercises</span></div>
        <div><b>${L.durationMin(w)}</b><span>min</span></div>
      </div>
      <section class="notebox">
        <label class="section-label" for="snote">Session note (optional)</label>
        <textarea id="snote" rows="2" data-snote data-wid="${w.id}" placeholder="Energy, sleep, anything off today…">${esc(w.note || '')}</textarea>
      </section>
      <button class="logbtn" data-act="copy" data-wid="${w.id}">${ICON.copy} Copy for review</button>
      <pre class="reviewtext" data-reviewtext>${esc(L.reviewText(w))}</pre>
      <button class="btn ghost wide" data-act="go" data-to="home">Done</button>
    `;
  },

  history() {
    const list = [...S.workouts].sort((a, b) => b.start - a.start);
    return `
      <header class="top">
        <button class="navbtn" data-act="go" data-to="home">${ICON.back} Home</button>
      </header>
      <h1 class="pagetitle">History</h1>
      ${list.length ? `<div class="hlist">${list.map((w) => `
        <button class="hrow" data-act="go" data-to="detail" data-id="${w.id}">
          <span class="hrow-main">
            <b>${esc(DAYS[w.day].name)}</b>
            <span class="muted">${w.imported ? 'Imported from Program v2' : esc(L.dateLabel(w.start, { year: daysAgo(w.start) > 300 ? 'numeric' : undefined }))}</span>
          </span>
          <span class="hrow-side">
            ${w.status === 'active' ? '<span class="tag live">In progress</span>' : `<span class="muted">${L.totalSets(w)} sets${w.imported ? '' : ` · ${L.durationMin(w)} min`}</span>`}
            ${ICON.chev}
          </span>
        </button>`).join('')}</div>` : '<p class="muted">Nothing logged yet.</p>'}
    `;
  },

  detail() {
    const w = byId(view.id);
    if (!w) { view = { name: 'history' }; return VIEWS.history(); }
    const entries = w.entries.filter((e) => e.sets.length).sort((a, b) => a.order - b.order);
    return `
      <header class="top">
        <button class="navbtn" data-act="go" data-to="history">${ICON.back} History</button>
        <span class="saved" data-saved>✓ saved</span>
      </header>
      <h1 class="pagetitle">${esc(DAYS[w.day].name)}</h1>
      <p class="muted sub">${w.imported ? 'Imported from Program v2 “Last” numbers' : `${esc(L.dateLabel(w.start, { year: 'numeric' }))} · ${esc(L.timeLabel(w.start))} · ${L.durationMin(w)} min`}</p>

      ${w.status === 'active' ? `<button class="logbtn" data-act="resume">Open in logger</button>` : `<button class="logbtn" data-act="copy" data-wid="${w.id}">${ICON.copy} Copy for review</button>`}
      <p class="muted small hint">Tap a set to edit or delete it. Exercises are in the order you did them.</p>

      ${entries.map((e, k) => {
        const ex = L.slotEx(w.day, e.slot, e.exId);
        const target = e.target || { w: null, reps: [ex.hi] };
        const eIdx = w.entries.indexOf(e);
        return `
        <section class="dentry">
          <div class="dentry-head"><span class="num">${k + 1}</span><b>${esc(e.name)}</b><span class="muted small">${esc(L.unitLabel(ex))}</span></div>
          <div class="chips">${e.sets.map((s, j) => `<button class="chip done ${e.target ? chipClass(ex, target, s, j) : ''}" data-act="editset" data-wid="${w.id}" data-e="${eIdx}" data-s="${j}"><span class="chip-n">Set ${j + 1}</span><span class="chip-v">${esc(L.fmtSet(ex, s))}</span></button>`).join('')}</div>
          <textarea rows="1" data-note data-wid="${w.id}" data-slot="${e.slot}" data-exid="${esc(e.exId)}" data-name="${esc(e.name)}" placeholder="Add a note…">${esc(e.note)}</textarea>
        </section>`;
      }).join('') || '<p class="muted">No sets in this workout.</p>'}

      <section class="notebox">
        <label class="section-label">Session note</label>
        <textarea rows="2" data-snote data-wid="${w.id}" placeholder="Anything about the whole session…">${esc(w.note || '')}</textarea>
      </section>

      <button class="btn danger wide" data-act="delworkout" data-wid="${w.id}">${ICON.trash} Delete this workout</button>
    `;
  },

  settings() {
    const real = S.workouts.filter((w) => !w.imported);
    return `
      <header class="top">
        <button class="navbtn" data-act="go" data-to="home">${ICON.back} Home</button>
      </header>
      <h1 class="pagetitle">Backup & settings</h1>

      <section class="panel">
        <div class="section-label">Backup</div>
        <p>Your log lives only on this phone. If you delete the app from your home screen, it's gone — so export a backup now and then.</p>
        <p class="muted small">Last backup: ${S.lastBackup ? esc(L.dateLabel(S.lastBackup, { year: 'numeric' })) : 'never'} · ${real.length} logged workouts</p>
        <button class="logbtn" data-act="export">${ICON.save} Export backup</button>
        <button class="btn ghost wide" data-act="import">Restore from backup file</button>
        <input type="file" id="importFile" accept="application/json,.json" hidden>
      </section>

      <section class="panel">
        <div class="section-label">Install on your iPhone</div>
        <ol class="small">
          <li>Open this page in <b>Safari</b>.</li>
          <li>Tap the <b>Share</b> button, then <b>Add to Home Screen</b>.</li>
          <li>Open it from the home screen icon. It works offline after that.</li>
        </ol>
      </section>

      <section class="panel">
        <div class="section-label">Danger zone</div>
        <button class="btn danger wide" data-act="wipe">${ICON.trash} Delete all data</button>
      </section>
      <p class="muted small center">Program v2 · Upper / Lower</p>
    `;
  },
};

function stepper(field, value, ex, scope) {
  const isW = field === 'w';
  const big = isW ? ex.step : 1;
  const fine = isW ? ex.fine : null;
  const shown = isW ? L.fmtW(ex, value) : clean(value);
  const unit = isW ? (ex.load === 'bw' ? (value > 0 ? 'lb added' : 'bodyweight') : L.unitLabel(ex)) : L.repsLabel(ex);
  return `
    <div class="stepper">
      <button class="st-btn" data-act="adj" data-scope="${scope}" data-f="${field}" data-d="${-big}" aria-label="minus ${big}">−${isW ? big : ''}</button>
      <button class="st-val" data-act="type" data-scope="${scope}" data-f="${field}">
        <span class="st-num">${esc(shown)}</span><span class="st-unit">${esc(unit)}</span>
      </button>
      <button class="st-btn" data-act="adj" data-scope="${scope}" data-f="${field}" data-d="${big}" aria-label="plus ${big}">+${isW ? big : ''}</button>
      ${fine ? `<div class="st-fine">
        <button data-act="adj" data-scope="${scope}" data-f="${field}" data-d="${-fine}">−${fine}</button>
        <button data-act="adj" data-scope="${scope}" data-f="${field}" data-d="${fine}">+${fine}</button>
      </div>` : ''}
    </div>`;
}

// ================= actions =================

function startDay(day) {
  const cur = active();
  const begin = () => {
    const w = { id: L.newId(), day, start: Date.now(), end: null, status: 'active', cursor: 0, swaps: {}, drafts: {}, entries: [], seq: 0, note: '' };
    S.workouts.push(w);
    S.activeId = w.id;
    rest = null;
    save();
    go({ name: 'workout' });
  };
  if (!cur) return begin();
  if (cur.day === day) return go({ name: 'workout' });
  const sets = L.totalSets(cur);
  confirmBox({
    title: `${DAYS[cur.day].name} is still open`,
    body: sets ? `It has ${sets} set${sets === 1 ? '' : 's'} logged. Finish it and start ${DAYS[day].name}?` : `It has no sets. Discard it and start ${DAYS[day].name}?`,
    ok: sets ? 'Finish & start' : 'Discard & start',
    danger: !sets,
  }).then((yes) => {
    if (!yes) return;
    if (sets) { cur.status = 'done'; cur.end = Date.now(); }
    else S.workouts = S.workouts.filter((x) => x !== cur);
    S.activeId = null;
    begin();
  });
}

function logSet() {
  const w = active();
  const i = w.cursor;
  const c = ctx(w, i);
  if (c.ex.load !== 'bw' && !(c.draft.w > 0)) return toast('Set the weight first');
  if (!(c.draft.r > 0)) return toast('Reps need to be more than 0');
  const e = getEntry(w, i, c.ex.id, c.ex.name);
  if (e.order == null) e.order = ++w.seq;
  if (!e.target) e.target = { w: c.target.w ?? c.draft.w, reps: c.target.reps };
  e.sets.push({ w: c.draft.w, r: c.draft.r, at: Date.now() });
  delete w.drafts[c.key];
  save();
  startRest(i);
  render();
  const btn = document.querySelector('.logbtn');
  if (btn) { btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 400); }
}

function adjust(el) {
  const f = el.dataset.f;
  const d = parseFloat(el.dataset.d);
  if (el.dataset.scope === 'modal') {
    modalState[f] = Math.max(0, clean((modalState[f] || 0) + d));
    return renderEditModal();
  }
  const w = active();
  const c = ctx(w, w.cursor);
  const next = { ...c.draft };
  next[f] = Math.max(0, clean((next[f] || 0) + d));
  if (f === 'r' && next.r < 0.5) next.r = 0.5;
  w.drafts[c.key] = next;
  save();
  render();
}

function typeValue(el) {
  const f = el.dataset.f;
  const scope = el.dataset.scope;
  let cur, ex;
  if (scope === 'modal') { cur = modalState[f]; ex = modalState.ex; }
  else { const w = active(); const c = ctx(w, w.cursor); cur = c.draft[f]; ex = c.ex; }
  const back = scope === 'modal' ? { ...modalState } : null;
  const title = f === 'w' ? `Weight (${ex.load === 'bw' ? 'added lb, 0 = bodyweight' : L.unitLabel(ex)})` : `Reps (${L.repsLabel(ex)})`;
  openModal(`
    <h3>${esc(title)}</h3>
    <input id="numIn" class="numin" type="text" inputmode="decimal" value="${esc(clean(cur ?? 0))}" autocomplete="off">
    <div class="mactions">
      <button class="btn ghost" data-act="cancel">Cancel</button>
      <button class="btn primary" data-act="ok">Set</button>
    </div>`, (act) => {
    if (act === 'cancel') { closeModal(); if (back) { modalState = back; renderEditModal(); } return; }
    if (act === 'ok') {
      const v = parseFloat(document.getElementById('numIn').value.replace(',', '.'));
      if (isNaN(v) || v < 0) return toast('Enter a number');
      closeModal();
      if (back) { modalState = { ...back, [f]: clean(v) }; renderEditModal(); return; }
      const w = active(); const c = ctx(w, w.cursor);
      w.drafts[c.key] = { ...c.draft, [f]: clean(v) };
      save();
      render();
    }
  });
  const inp = document.getElementById('numIn');
  inp.focus();
  inp.select();
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') modalHandler('ok'); });
}

// ----- edit / delete a logged set -----
let modalState = null;
function editSet(el) {
  const w = byId(el.dataset.wid);
  const e = w.entries[+el.dataset.e];
  const k = +el.dataset.s;
  const s = e.sets[k];
  modalState = { wid: w.id, e: +el.dataset.e, k, w: s.w, r: s.r, ex: L.slotEx(w.day, e.slot, e.exId) };
  renderEditModal();
}
function renderEditModal() {
  const m = modalState;
  const w = byId(m.wid);
  const e = w.entries[m.e];
  openModal(`
    <h3>Edit set ${m.k + 1}</h3>
    <p class="muted small">${esc(e.name)}</p>
    ${stepper('w', m.w, m.ex, 'modal')}
    ${stepper('r', m.r, m.ex, 'modal')}
    <div class="mactions">
      <button class="btn ghost" data-act="cancel">Cancel</button>
      <button class="btn primary" data-act="save">Save</button>
    </div>
    <button class="btn danger wide" data-act="delete">${ICON.trash} Delete this set</button>
  `, (act, el) => {
    if (act === 'adj') return adjust(el);
    if (act === 'type') return typeValue(el);
    if (act === 'cancel') return closeModal();
    if (act === 'save') {
      if (!(m.r > 0)) return toast('Reps need to be more than 0');
      e.sets[m.k] = { ...e.sets[m.k], w: m.w, r: m.r };
      closeModal(); save(); render();
    }
    if (act === 'delete') {
      confirmBox({ title: 'Delete this set?', body: `${e.name}: set ${m.k + 1}, ${L.fmtSet(m.ex, e.sets[m.k])}. This can't be undone.`, ok: 'Delete set', danger: true })
        .then((yes) => {
          if (!yes) return;
          e.sets.splice(m.k, 1);
          if (!e.sets.length) {
            if (e.note && e.note.trim()) { e.order = null; e.target = null; }
            else w.entries.splice(m.e, 1);
          }
          save(); render(); toast('Set deleted');
        });
    }
  });
}

function finish() {
  const w = active();
  const sets = L.totalSets(w);
  if (!sets) {
    return confirmBox({ title: 'No sets logged', body: `Discard this ${DAYS[w.day].name} workout?`, ok: 'Discard', danger: true }).then((yes) => {
      if (!yes) return;
      S.workouts = S.workouts.filter((x) => x !== w);
      S.activeId = null; rest = null; save(); go({ name: 'home' });
    });
  }
  const left = DAYS[w.day].slots.filter((s, j) => !w.entries.some((e) => e.slot === j && e.sets.length)).length;
  confirmBox({
    title: `Finish ${DAYS[w.day].name}?`,
    body: `${sets} set${sets === 1 ? '' : 's'} logged${left ? `, ${left} exercise${left > 1 ? 's' : ''} not started` : ''}. You can still edit it from History.`,
    ok: 'Finish', danger: false,
  }).then((yes) => {
    if (!yes) return;
    w.status = 'done';
    w.end = Date.now();
    w.drafts = {};
    S.activeId = null;
    rest = null;
    save();
    go({ name: 'review', id: w.id });
  });
}

async function copyReview(wid) {
  const text = L.reviewText(byId(wid));
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied — paste it to Claude');
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    ta.remove();
    toast(ok ? 'Copied — paste it to Claude' : 'Copy failed — select the text and copy it');
  }
}

async function exportBackup() {
  const name = `workout-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const json = JSON.stringify(S);
  const file = new File([json], name, { type: 'application/json' });
  const mark = () => { S.lastBackup = Date.now(); save(); render(); };
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); mark(); toast('Backup exported'); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  mark();
  toast('Backup downloaded');
}

function importBackup(file) {
  const r = new FileReader();
  r.onload = () => {
    let data;
    try { data = JSON.parse(r.result); } catch (e) { return toast("That file isn't a backup"); }
    if (!data || !Array.isArray(data.workouts)) return toast("That file isn't a backup");
    const real = data.workouts.filter((w) => !w.imported).length;
    confirmBox({ title: 'Restore this backup?', body: `It has ${real} logged workouts. Everything currently in the app will be replaced.`, ok: 'Replace & restore', danger: true })
      .then((yes) => {
        if (!yes) return;
        S = data; rest = null; save(); go({ name: 'home' }); toast('Backup restored');
      });
  };
  r.readAsText(file);
}

// ================= rest timer =================

let audioCtx = null;
function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { /* no audio */ }
}
function beep() {
  if (!audioCtx) return;
  try {
    [0, 0.22].forEach((t) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.18);
      o.connect(g).connect(audioCtx.destination);
      o.start(audioCtx.currentTime + t);
      o.stop(audioCtx.currentTime + t + 0.2);
    });
  } catch (e) { /* ignore */ }
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

function startRest(i) {
  const w = active();
  const slot = DAYS[w.day].slots[i];
  const secs = L.restFor(slot);
  const p = L.partnerIndex(w.day, i);
  rest = {
    end: Date.now() + secs * 1000, total: secs, doneAt: null, partner: p,
    hint: p >= 0 ? `Next: ${L.slotLabel(w.day, p)} ${L.slotEx(w.day, p, w.swaps[p]).name}` : '',
  };
  unlockAudio();
}

function renderRest() {
  const on = !!rest && view.name === 'workout';
  document.body.classList.toggle('resting', on);
  if (!on) { restbar.hidden = true; restbar.innerHTML = ''; return; }
  restbar.hidden = false;
  restbar.innerHTML = `
    <div class="rest-fill"></div>
    <div class="rest-main">
      <span class="rest-time" data-rest-time></span>
      <span class="rest-hint" data-rest-hint></span>
    </div>
    ${rest.partner >= 0 && active() && active().cursor !== rest.partner ? `<button class="rest-btn" data-act="jump" data-i="${rest.partner}">Go</button>` : ''}
    <button class="rest-btn" data-act="rest-add">+15</button>
    <button class="rest-btn" data-act="rest-skip">${ICON.x}</button>`;
  tick();
}

function tick() {
  const w = active();
  const el = document.querySelector('[data-elapsed]');
  if (el && w) el.textContent = mmss((Date.now() - w.start) / 1000);
  if (!rest) return;
  const left = (rest.end - Date.now()) / 1000;
  if (left <= 0 && !rest.doneAt) {
    rest.doneAt = Date.now();
    beep();
    restbar.classList.add('over');
  }
  if (rest.doneAt && Date.now() - rest.doneAt > 12000) {
    rest = null; restbar.classList.remove('over'); renderRest(); return;
  }
  if (!rest.doneAt) restbar.classList.remove('over');
  const t = restbar.querySelector('[data-rest-time]');
  const h = restbar.querySelector('[data-rest-hint]');
  const fill = restbar.querySelector('.rest-fill');
  if (t) t.textContent = rest.doneAt ? 'Rest over — go' : `Rest ${mmss(left)}`;
  if (h) h.textContent = rest.hint;
  if (fill) fill.style.transform = `scaleX(${rest.doneAt ? 1 : Math.min(1, 1 - left / rest.total)})`;
}
setInterval(tick, 250);

// ================= wake lock =================

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && !wakeLock && 'wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch (e) { /* not supported */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { tick(); keepAwake(view.name === 'workout' && !!active()); }
});

// ================= modal / toast =================

let modalHandler = null;
let modalCancel = null;
function openModal(html, handler, onCancel) {
  modalRoot.innerHTML = `<div class="scrim" data-scrim><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  modalRoot.hidden = false;
  modalHandler = handler;
  modalCancel = onCancel || closeModal;
  document.body.classList.add('modal-open');
}
function closeModal() {
  modalRoot.innerHTML = '';
  modalRoot.hidden = true;
  modalHandler = null;
  document.body.classList.remove('modal-open');
}

function confirmBox({ title, body, ok = 'Delete', danger = true, requireText = null }) {
  return new Promise((resolve) => {
    openModal(`
      <h3>${esc(title)}</h3>
      <p>${esc(body)}</p>
      ${requireText ? `<p class="muted small">Type <b>${esc(requireText)}</b> to confirm.</p><input id="confirmIn" class="numin" type="text" autocomplete="off" autocapitalize="characters">` : ''}
      <div class="mactions">
        <button class="btn ghost" data-act="no">Cancel</button>
        <button class="btn ${danger ? 'danger' : 'primary'}" data-act="yes">${esc(ok)}</button>
      </div>`, (act) => {
      if (act === 'no') { closeModal(); resolve(false); }
      if (act === 'yes') {
        if (requireText && document.getElementById('confirmIn').value.trim().toUpperCase() !== requireText) return toast(`Type ${requireText} to confirm`);
        closeModal(); resolve(true);
      }
    }, () => { closeModal(); resolve(false); });
  });
}

let toastTimer = null;
function toast(msg, ms = 1800) {
  toastEl.textContent = msg;
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms);
}

// ================= events =================

const ACTS = {
  go: (el) => go({ name: el.dataset.to, id: el.dataset.id }),
  start: (el) => startDay(el.dataset.day),
  resume: () => go({ name: 'workout' }),
  discard: () => {
    const w = active();
    confirmBox({ title: `Discard ${DAYS[w.day].name}?`, body: `${L.totalSets(w)} logged sets will be deleted. This can't be undone.`, ok: 'Discard workout', danger: true })
      .then((yes) => { if (!yes) return; S.workouts = S.workouts.filter((x) => x !== w); S.activeId = null; rest = null; save(); render(); toast('Workout discarded'); });
  },
  jump: (el) => { const w = active(); w.cursor = +el.dataset.i; save(); render(); window.scrollTo(0, 0); },
  prev: () => { const w = active(); if (w.cursor > 0) { w.cursor--; save(); render(); window.scrollTo(0, 0); } },
  next: () => { const w = active(); if (w.cursor < DAYS[w.day].slots.length - 1) { w.cursor++; save(); render(); window.scrollTo(0, 0); } },
  adj: adjust,
  type: typeValue,
  log: logSet,
  editset: editSet,
  swap: (el) => { const w = active(); w.swaps[w.cursor] = el.dataset.alt; save(); render(); window.scrollTo(0, 0); toast('Swapped'); },
  unswap: () => { const w = active(); delete w.swaps[w.cursor]; save(); render(); window.scrollTo(0, 0); },
  finish,
  copy: (el) => copyReview(el.dataset.wid),
  'rest-add': () => {
    if (!rest) return;
    if (rest.doneAt) { rest.end = Date.now() + 15000; rest.doneAt = null; rest.total = 15; }
    else { rest.end += 15000; rest.total += 15; }
    tick();
  },
  'rest-skip': () => { rest = null; restbar.classList.remove('over'); renderRest(); },
  delworkout: (el) => {
    const w = byId(el.dataset.wid);
    confirmBox({
      title: `Delete ${DAYS[w.day].name}?`,
      body: `${w.imported ? 'Imported' : L.dateLabel(w.start)} · ${L.totalSets(w)} sets. This deletes the whole workout and can't be undone.`,
      ok: 'Delete workout', danger: true,
    }).then((yes) => {
      if (!yes) return;
      S.workouts = S.workouts.filter((x) => x !== w);
      if (S.activeId === w.id) { S.activeId = null; rest = null; }
      save(); go({ name: 'history' }); toast('Workout deleted');
    });
  },
  export: exportBackup,
  import: () => document.getElementById('importFile').click(),
  wipe: () => confirmBox({ title: 'Delete everything?', body: 'Every workout, set and note on this phone will be erased.', ok: 'Erase all', danger: true, requireText: 'DELETE' })
    .then((yes) => { if (!yes) return; S = { v: 1, workouts: [], activeId: null, lastBackup: null }; rest = null; save(); go({ name: 'home' }); toast('All data deleted'); }),
};

document.addEventListener('click', (e) => {
  if (modalRoot.contains(e.target)) {
    if (e.target.hasAttribute('data-scrim')) return modalCancel && modalCancel();
    const el = e.target.closest('[data-act]');
    if (el && modalHandler) modalHandler(el.dataset.act, el);
    return;
  }
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACTS[el.dataset.act];
  if (fn) fn(el, e);
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.matches('[data-note]')) {
    const w = byId(t.dataset.wid);
    if (!w) return;
    const en = getEntry(w, +t.dataset.slot, t.dataset.exid, t.dataset.name);
    en.note = t.value;
    if (!en.sets.length && !en.note.trim()) w.entries = w.entries.filter((x) => x !== en);
    saveSoon();
  } else if (t.matches('[data-snote]')) {
    const w = byId(t.dataset.wid);
    if (!w) return;
    w.note = t.value;
    saveSoon();
    const pre = document.querySelector('[data-reviewtext]');
    if (pre) pre.textContent = L.reviewText(w);
  }
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'importFile' && e.target.files[0]) importBackup(e.target.files[0]);
});

document.addEventListener('toggle', (e) => {
  if (e.target.matches && e.target.matches('[data-cues]')) ui.cuesOpen = e.target.open;
}, true);

// Swipe left/right on the exercise card to change exercise.
let touch = null;
document.addEventListener('touchstart', (e) => {
  const card = e.target.closest('[data-swipe]');
  touch = card && e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
}, { passive: true });
document.addEventListener('touchend', (e) => {
  if (!touch || view.name !== 'workout') return;
  const dx = e.changedTouches[0].clientX - touch.x;
  const dy = e.changedTouches[0].clientY - touch.y;
  touch = null;
  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) (dx < 0 ? ACTS.next : ACTS.prev)();
}, { passive: true });

window.addEventListener('pagehide', () => write(S));

// ================= icons =================

const I = (d, extra = '') => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
const ICON = {
  back: I('<path d="M15 18l-6-6 6-6"/>'),
  fwd: I('<path d="M9 18l6-6-6-6"/>'),
  chev: I('<path d="M9 18l6-6-6-6"/>', 'class="ic-sm"'),
  chevDown: I('<path d="M6 9l6 6 6-6"/>', 'class="ic-sm chev-down"'),
  arrow: I('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  gear: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>'),
  list: I('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  copy: I('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>'),
  trash: I('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
  save: I('<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
  x: I('<path d="M18 6L6 18M6 6l12 12"/>'),
};

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
