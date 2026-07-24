'use strict';

/* ===========================================================
   Трекер привычек — логика на localStorage
   =========================================================== */

const STORAGE_KEY = 'habit_tracker_v1';

const els = {
  form: document.getElementById('addForm'),
  input: document.getElementById('habitInput'),
  hint: document.getElementById('formHint'),
  listPending: document.getElementById('listPending'),
  listDone: document.getElementById('listDone'),
  emptyPending: document.getElementById('emptyPending'),
  emptyDone: document.getElementById('emptyDone'),
  countPending: document.getElementById('countPending'),
  countDone: document.getElementById('countDone'),
  statTotal: document.getElementById('statTotal'),
  statDone: document.getElementById('statDone'),
  statStreak: document.getElementById('statStreak'),
  todayDate: document.getElementById('todayDate'),
};

/* ---------- date helpers ---------- */

function toKey(date) {
  // YYYY-MM-DD in local time, avoids UTC off-by-one issues
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayKey() {
  return toKey(new Date());
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

const MONTHS_RU = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const WEEKDAYS_RU = ['вс','пн','вт','ср','чт','пт','сб'];

function formatCreatedDate(iso) {
  const d = new Date(iso);
  return `с ${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`;
}

function formatToday() {
  const d = new Date();
  return `${WEEKDAYS_RU[d.getDay()]}, ${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;
}

/* ---------- storage ---------- */

function loadHabits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Не удалось прочитать localStorage:', e);
    return [];
  }
}

function saveHabits(habits) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  } catch (e) {
    console.error('Не удалось сохранить в localStorage:', e);
  }
}

let habits = loadHabits();

/* ---------- streak calculation ---------- */

function calcStreak(habit) {
  const done = new Set(habit.completedDates);
  let cursor = new Date();

  // если сегодня ещё не отмечено — цепочка всё ещё жива, если была вчера
  if (!done.has(toKey(cursor))) {
    cursor = addDays(cursor, -1);
  }

  let streak = 0;
  while (done.has(toKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function streakTier(streak) {
  if (streak >= 14) return 3;
  if (streak >= 7) return 2;
  if (streak >= 3) return 1;
  return 0;
}

function last7Days(habit) {
  const done = new Set(habit.completedDates);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const key = toKey(addDays(new Date(), -i));
    days.push(done.has(key));
  }
  return days;
}

/* ---------- CRUD ---------- */

function addHabit(name) {
  const habit = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    createdAt: new Date().toISOString(),
    completedDates: [],
  };
  habits.unshift(habit);
  saveHabits(habits);
  render();
}

function deleteHabit(id) {
  habits = habits.filter(h => h.id !== id);
  saveHabits(habits);
  render();
}

function renameHabit(id, newName) {
  const habit = habits.find(h => h.id === id);
  if (!habit) return;
  const trimmed = newName.trim();
  if (trimmed) habit.name = trimmed;
  saveHabits(habits);
  render();
}

function toggleToday(id) {
  const habit = habits.find(h => h.id === id);
  if (!habit) return;
  const key = todayKey();
  const idx = habit.completedDates.indexOf(key);
  if (idx === -1) {
    habit.completedDates.push(key);
  } else {
    habit.completedDates.splice(idx, 1);
  }
  saveHabits(habits);
  render();
}

/* ---------- rendering ---------- */

function showHint(message) {
  els.hint.textContent = message;
  els.hint.classList.add('show');
  clearTimeout(showHint._t);
  showHint._t = setTimeout(() => els.hint.classList.remove('show'), 2200);
}

function checkIconSvg() {
  return '<svg viewBox="0 0 24 24"><polyline points="5 13 10 18 19 7"></polyline></svg>';
}

function buildCard(habit) {
  const doneToday = habit.completedDates.includes(todayKey());
  const streak = calcStreak(habit);
  const tier = streakTier(streak);
  const days = last7Days(habit);

  const card = document.createElement('div');
  card.className = 'habit-card' + (doneToday ? ' is-done' : '');
  card.dataset.id = habit.id;
  card.dataset.tier = String(tier);
  card.style.setProperty('--tier-glow', String(tier / 3));

  const dotsHtml = days.map(d => `<span class="day-dot${d ? ' filled' : ''}"></span>`).join('');
  const streakWord = pluralDays(streak);

  card.innerHTML = `
    <button class="check-btn" aria-label="Отметить выполнение сегодня" aria-pressed="${doneToday}">
      ${checkIconSvg()}
    </button>
    <div class="habit-info">
      <div class="habit-name-row">
        <span class="habit-name">${escapeHtml(habit.name)}</span>
      </div>
      <div class="habit-meta">
        <span class="habit-created">${formatCreatedDate(habit.createdAt)}</span>
        <span class="habit-streak"><span class="flame">🔥</span>${streak} ${streakWord}</span>
      </div>
      <div class="habit-progress" title="Последние 7 дней">${dotsHtml}</div>
    </div>
    <div class="habit-actions">
      <button class="icon-btn edit-btn" aria-label="Переименовать">✎</button>
      <button class="icon-btn delete-btn" aria-label="Удалить">🗑</button>
    </div>
  `;

  return card;
}

function pluralDays(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'дней';
  if (mod10 === 1) return 'день';
  if (mod10 >= 2 && mod10 <= 4) return 'дня';
  return 'дней';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function render() {
  const pending = [];
  const done = [];

  habits.forEach(h => {
    (h.completedDates.includes(todayKey()) ? done : pending).push(h);
  });

  pending.sort((a, b) => calcStreak(b) - calcStreak(a));
  done.sort((a, b) => calcStreak(b) - calcStreak(a));

  els.listPending.innerHTML = '';
  els.listDone.innerHTML = '';
  pending.forEach(h => els.listPending.appendChild(buildCard(h)));
  done.forEach(h => els.listDone.appendChild(buildCard(h)));

  els.emptyPending.classList.toggle('show', pending.length === 0);
  els.emptyDone.classList.toggle('show', done.length === 0);

  els.countPending.textContent = String(pending.length);
  els.countDone.textContent = String(done.length);

  els.statTotal.textContent = String(habits.length);
  els.statDone.textContent = String(done.length);
  const bestStreak = habits.reduce((max, h) => Math.max(max, calcStreak(h)), 0);
  els.statStreak.textContent = String(bestStreak);
}

/* ---------- inline edit / delete confirm ---------- */

function startEdit(card, habit) {
  const info = card.querySelector('.habit-name-row');
  info.innerHTML = `<input type="text" class="habit-name-input" maxlength="60" value="${escapeHtml(habit.name)}">`;
  const input = info.querySelector('input');
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);

  const commit = () => renameHabit(habit.id, input.value || habit.name);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') render();
  });
  input.addEventListener('blur', commit);
}

function startDeleteConfirm(card, habit) {
  const actions = card.querySelector('.habit-actions');
  actions.innerHTML = `
    <div class="confirm-row">
      Удалить?
      <button class="confirm-btn confirm-yes">Да</button>
      <button class="confirm-btn confirm-no">Нет</button>
    </div>
  `;
  actions.querySelector('.confirm-yes').addEventListener('click', () => {
    card.classList.add('is-leaving');
    setTimeout(() => deleteHabit(habit.id), 220);
  });
  actions.querySelector('.confirm-no').addEventListener('click', render);
}

/* ---------- events ---------- */

els.form.addEventListener('submit', e => {
  e.preventDefault();
  const value = els.input.value.trim();
  if (!value) {
    showHint('Введи название привычки');
    return;
  }
  if (value.length > 60) {
    showHint('Слишком длинное название');
    return;
  }
  addHabit(value);
  els.input.value = '';
  els.input.focus();
});

document.addEventListener('click', e => {
  const card = e.target.closest('.habit-card');
  if (!card) return;
  const id = card.dataset.id;
  const habit = habits.find(h => h.id === id);
  if (!habit) return;

  if (e.target.closest('.check-btn')) {
    toggleToday(id);
  } else if (e.target.closest('.edit-btn')) {
    startEdit(card, habit);
  } else if (e.target.closest('.delete-btn')) {
    startDeleteConfirm(card, habit);
  }
});

/* ---------- init ---------- */

els.todayDate.textContent = formatToday();
render();
