// Achievement system: track actions, unlock on goal, show toast
const ACH = (function () {
  const STATS_KEY = 'bw_ach_stats';
  const DONE_KEY = 'bw_ach_done';
  const DEFAULT_STATS = {
    mined: 0, placed: 0, crafted: 0, workbench: 0, wood: 0,
    harvest: 0, eaten: 0, diamond: 0, obsidian: 0, swim: 0, fly: 0, night: 0,
  };
  let stats = Object.assign({}, DEFAULT_STATS);
  let done = {};
  let saveTimer = null;

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STATS_KEY) || 'null');
      if (s && typeof s === 'object') stats = Object.assign({}, DEFAULT_STATS, s);
    } catch (e) {}
    try {
      const d = JSON.parse(localStorage.getItem(DONE_KEY) || 'null');
      if (d && typeof d === 'object') done = d;
    } catch (e) {}
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STATS_KEY, JSON.stringify(stats));
        localStorage.setItem(DONE_KEY, JSON.stringify(done));
      } catch (e) {}
    }, 350);
  }

  function unlockedCount() { return ACHIEVEMENTS.filter(a => done[a.id]).length; }
  function progressFor(a) { return Math.min(stats[a.stat] || 0, a.goal); }
  function isDone(a) { return !!done[a.id]; }

  function check() {
    for (const a of ACHIEVEMENTS) {
      if (done[a.id]) continue;
      if ((stats[a.stat] || 0) >= a.goal) {
        done[a.id] = true;
        showToast(a);
        if (typeof updateAchBadge === 'function') updateAchBadge();
        if (typeof refreshAchPanel === 'function') refreshAchPanel();
      }
    }
  }

  function track(kind, amount) {
    if (!(kind in stats)) return;
    stats[kind] += (amount === undefined ? 1 : amount);
    check();
    scheduleSave();
  }
  function flag(kind) {
    if (!(kind in stats) || stats[kind] >= 1) return;
    stats[kind] = 1;
    check();
    scheduleSave();
  }

  function showToast(a) {
    const wrap = document.getElementById('ach-toast-wrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'ach-toast';
    el.innerHTML =
      '<div class="ach-toast-icon">' + a.icon + '</div>' +
      '<div class="ach-toast-text"><div class="ach-toast-title">Achievement Unlocked!</div>' +
      '<div class="ach-toast-name">' + a.name + '</div></div>';
    wrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 400);
    }, 3600);
  }

  function reset() {
    stats = Object.assign({}, DEFAULT_STATS);
    done = {};
    scheduleSave();
  }

  load();
  return {
    track, flag, check, reset,
    unlockedCount,
    total: () => ACHIEVEMENTS.length,
    progressFor, isDone,
  };
})();

let achPanelOpen = false;
function updateAchBadge() {
  const badge = document.getElementById('ach-count');
  if (badge) badge.textContent = ACH.unlockedCount() + '/' + ACH.total();
}
function refreshAchPanel() {
  if (achPanelOpen) renderAchPanel();
}
function renderAchPanel() {
  const list = document.getElementById('ach-list');
  if (!list) return;
  list.innerHTML = '';
  for (const a of ACHIEVEMENTS) {
    const done = ACH.isDone(a);
    const prog = ACH.progressFor(a);
    const li = document.createElement('li');
    li.className = 'ach-entry' + (done ? ' done' : '');
    const icon = document.createElement('div');
    icon.className = 'ach-entry-icon';
    icon.textContent = done ? a.icon : '🔒';
    const info = document.createElement('div');
    info.className = 'ach-entry-info';
    const name = document.createElement('div');
    name.className = 'ach-entry-name';
    name.textContent = a.name;
    const desc = document.createElement('div');
    desc.className = 'ach-entry-desc';
    desc.textContent = a.desc;
    info.appendChild(name);
    info.appendChild(desc);
    if (!done && a.goal > 1) {
      const barWrap = document.createElement('div');
      barWrap.className = 'ach-bar';
      const fill = document.createElement('div');
      fill.className = 'ach-bar-fill';
      fill.style.width = ((prog / a.goal) * 100).toFixed(0) + '%';
      barWrap.appendChild(fill);
      const txt = document.createElement('span');
      txt.className = 'ach-bar-txt';
      txt.textContent = prog + ' / ' + a.goal;
      barWrap.appendChild(txt);
      info.appendChild(barWrap);
    }
    li.appendChild(icon);
    li.appendChild(info);
    if (done) {
      const chk = document.createElement('span');
      chk.className = 'ach-check';
      chk.textContent = '✓';
      li.appendChild(chk);
    }
    list.appendChild(li);
  }
  const sum = document.getElementById('ach-summary');
  if (sum) {
    const u = ACH.unlockedCount(), t = ACH.total();
    sum.textContent = `${u} / ${t} unlocked (${Math.round((u / t) * 100)}%)`;
  }
}
function setAchPanel(open) {
  achPanelOpen = open;
  const ov = document.getElementById('ach-overlay');
  if (!ov) return;
  ov.style.display = open ? 'flex' : 'none';
  if (open) renderAchPanel();
}
function initAchievementsUI() {
  updateAchBadge();
  const openBtn = document.getElementById('btn-achievements');
  if (openBtn) openBtn.addEventListener('click', (e) => { e.stopPropagation(); setAchPanel(true); });
  const closeBtn = document.getElementById('btn-ach-close');
  if (closeBtn) closeBtn.addEventListener('click', () => setAchPanel(false));
  const ov = document.getElementById('ach-overlay');
  if (ov) ov.addEventListener('click', (e) => { if (e.target.id === 'ach-overlay') setAchPanel(false); });
}
