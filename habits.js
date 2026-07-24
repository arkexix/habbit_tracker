'use strict';
/* ===========================================================
Трекер привычек — учёт времени
=========================================================== */
const STORAGE_KEY = 'habit_time_tracker_v1';
const els = {
  form: document.getElementById('habitForm'),
  nameInput: document.getElementById('habitNameInput'),
  iconInput: document.getElementById('habitIconInput'),
  goalInput: document.getElementById('habitGoalInput'),
  hint: document.getElementById('habitHint'),
  list: document.getElementById('habitsList'),
  empty: document.getElementById('emptyHabits'),
  statToday: document.getElementById('statToday'),
  statWeek: document.getElementById('statWeek'),
  statBestStreak: document.getElementById('statBestStreak'),
  statActiveHabit: document.getElementById('statActiveHabit'),
  overallChart: document.getElementById('overallChart'),
  todayDate: document.getElementById('todayDate'),
};
let habits = loadHabits();
let periodDays = 7;
let editingId = null;
const openDetails = new Set();
/* ---------- date helpers ---------- */
function toKey(date) {
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
function dateFromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
const MONTHS_RU = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];
const MONTHS_SHORT_RU = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];
const WEEKDAYS_RU = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
function formatToday() {
  const d = new Date();
  return `${WEEKDAYS_RU[d.getDay()]}, ${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;
}
function formatDateShort(key) {
  const d = dateFromKey(key);
  return `${d.getDate()} ${MONTHS_SHORT_RU[d.getMonth()]}`;
}
function pluralDays(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'дней';
  if (mod10 === 1) return 'день';
  if (mod10 >= 2 && mod10 <= 4) return 'дня';
  return 'дней';
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
function saveHabits() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  } catch (e) {
    console.error('Не удалось сохранить в localStorage:', e);
  }
}
/* ---------- utils ---------- */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function formatMinutes(totalMinutes) {
  const mins = Math.max(0, Math.round(totalMinutes || 0));
  if (mins === 0) return '0 ч';
  if (mins < 60) return `${mins} мин`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}
function parseHoursToMinutes(raw) {
  const str = String(raw || '').trim().replace(',', '.');
  if (!str) return null;
  let minutes = null;
  if (str.includes(':')) {
    const parts = str.split(':');
    if (parts.length !== 2) return null;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    if (h < 0 || m < 0 || m >= 60) return null;
    minutes = h * 60 + m;
  } else {
    const num = Number(str);
    if (!Number.isFinite(num) || num < 0) return null;
    minutes = Math.round(num * 60);
  }
  if (minutes <= 0 || minutes > 1440) return null;
  return minutes;
}
function parseGoalMinutes(raw) {
  const str = String(raw || '').trim().replace(',', '.');
  if (!str) return null;
  let minutes = null;
  if (str.includes(':')) {
    const parts = str.split(':');
    if (parts.length !== 2) return null;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    if (h < 0 || m < 0 || m >= 60) return null;
    minutes = h * 60 + m;
  } else {
    const num = Number(str);
    if (!Number.isFinite(num) || num <= 0) return null;
    minutes = Math.round(num * 60);
  }
  if (minutes <= 0 || minutes > 1440) return null;
  return minutes;
}
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function showHint(message) {
  els.hint.textContent = message;
  els.hint.classList.add('show');
  clearTimeout(showHint._t);
  showHint._t = setTimeout(() => {
    els.hint.classList.remove('show');
  }, 2200);
}
/* ---------- habit metrics ---------- */
function minutesOnDate(habit, dateKey) {
  return habit.logs.reduce((sum, log) => {
    return log.dateKey === dateKey ? sum + log.minutes : sum;
  }, 0);
}
function lastNDaysKeys(n) {
  const keys = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(toKey(addDays(new Date(), -i)));
  }
  return keys;
}
function minutesForLastNDays(habit, n) {
  const keys = lastNDaysKeys(n);
  return keys.reduce((sum, key) => {
    return sum + minutesOnDate(habit, key);
  }, 0);
}
function totalMinutes(habit) {
  return habit.logs.reduce((sum, log) => sum + log.minutes, 0);
}
function activeDaysCount(habit) {
  return new Set(habit.logs.map((log) => log.dateKey)).size;
}
function calcTimeStreak(habit) {
  const done = new Set(habit.logs.map((log) => log.dateKey));
  let cursor = new Date();
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
function bestDay(habit) {
  const byDate = {};
  habit.logs.forEach((log) => {
    byDate[log.dateKey] = (byDate[log.dateKey] || 0) + log.minutes;
  });
  let best = null;
  Object.entries(byDate).forEach(([dateKey, minutes]) => {
    if (!best || minutes > best.minutes) {
      best = { dateKey, minutes };
    }
  });
  return best;
}
/* ---------- CRUD ---------- */
function addHabit(name, icon, goalMinutes) {
  const habit = {
    id: generateId(),
    name: name.trim(),
    icon: icon.trim(),
    goalMinutes,
    createdAt: new Date().toISOString(),
    logs: [],
  };
  habits.unshift(habit);
  saveHabits();
  render();
}
function deleteHabit(id) {
  habits = habits.filter((h) => h.id !== id);
  openDetails.delete(id);
  if (editingId === id) editingId = null;
  saveHabits();
  render();
}
function addTime(habitId, minutes) {
  const habit = habits.find((h) => h.id === habitId);
  if (!habit) return;
  habit.logs.push({
    id: generateId(),
    dateKey: todayKey(),
    minutes,
    createdAt: new Date().toISOString(),
  });
  saveHabits();
  render();
}
function resetToday(habitId) {
  const habit = habits.find((h) => h.id === habitId);
  if (!habit) return;
  const tKey = todayKey();
  const before = habit.logs.length;
  habit.logs = habit.logs.filter((log) => log.dateKey !== tKey);
  if (habit.logs.length === before) {
    showHint('Нечего сбрасывать');
    return;
  }
  saveHabits();
  render();
}
/* ---------- charts ---------- */
function buildChart(getDayMinutes, n) {
  const keys = lastNDaysKeys(n);
  const values = keys.map(getDayMinutes);
  const hasData = values.some((v) => v > 0);
  if (!hasData) {
    return '<div class="chart-empty">Пока нет данных за этот период</div>';
  }
  const max = Math.max(...values, 1);
  const bars = values
    .map((value, index) => {
      const date = formatDateShort(keys[index]);
      const title = `${date} — ${formatMinutes(value)}`;
      const height = value === 0 ? 2 : Math.max(4, Math.round((value / max) * 100));
      return `
        <div class="chart-bar-wrap" title="${escapeAttr(title)}">
          <div class="chart-bar${value === 0 ? ' zero' : ''}" style="height:${height}%"></div>
        </div>
      `;
    })
    .join('');
  return `<div class="chart">${bars}</div>`;
}
function buildOverallChart() {
  return buildChart((dateKey) => {
    return habits.reduce((sum, habit) => {
      return sum + minutesOnDate(habit, dateKey);
    }, 0);
  }, periodDays);
}
function buildHabitChart(habit) {
  return buildChart((dateKey) => minutesOnDate(habit, dateKey), periodDays);
}
/* ---------- card templates ---------- */
function progressHtml(habit, todayMinutes) {
  if (!habit.goalMinutes) return '';
  const percent = Math.min(
    100,
    Math.round((todayMinutes / habit.goalMinutes) * 100)
  );
  return `<div class="progress-wrap"> <div class="progress-label"> <span>Цель: ${formatMinutes(habit.goalMinutes)}</span> <span>${percent}%</span> </div> <div class="progress-bar"> <div class="progress-fill" style="width:${percent}%"></div> </div> </div>`;
}
function detailsHtml(habit) {
  const total = totalMinutes(habit);
  const activeDays = activeDaysCount(habit);
  const average = activeDays ? Math.round(total / activeDays) : 0;
  const best = bestDay(habit);
  return `
    <div class="detail-grid">
      <div class="detail-item">
        <div class="detail-value">${formatMinutes(total)}</div>
        <div class="detail-label">всего</div>
      </div>
      <div class="detail-item">
        <div class="detail-value">${activeDays}</div>
        <div class="detail-label">активных дней</div>
      </div>
      <div class="detail-item">
        <div class="detail-value">${formatMinutes(average)}</div>
        <div class="detail-label">средняя длительность</div>
      </div>
      <div class="detail-item">
        <div class="detail-value">${best ? formatDateShort(best.dateKey) : '—'}</div>
        <div class="detail-label">
          лучший день${best ? ` · ${formatMinutes(best.minutes)}` : ''}
        </div>
      </div>
    </div>
    ${buildHabitChart(habit)}
  `;
}
function editFormHtml(habit) {
  const goalValue = habit.goalMinutes
    ? String(Math.round((habit.goalMinutes / 60) * 100) / 100)
    : '';
  return `
    <div class="edit-form">
      <div class="edit-row">
        <input
          class="add-input edit-name"
          type="text"
          maxlength="60"
          value="${escapeAttr(habit.name)}"
          aria-label="Название привычки"
        />
        <input
          class="add-input edit-icon"
          type="text"
          maxlength="4"
          value="${escapeAttr(habit.icon || '')}"
          aria-label="Иконка привычки"
        />
        <input
          class="add-input edit-goal"
          type="text"
          inputmode="decimal"
          placeholder="Цель, ч"
          value="${escapeAttr(goalValue)}"
          aria-label="Цель в часах"
        />
      </div>
      <div class="edit-actions">
        <button class="small-btn secondary cancel-edit-btn" type="button">
          Отмена
        </button>
        <button class="small-btn primary save-edit-btn" type="button">
          Сохранить
        </button>
      </div>
    </div>
  `;
}
function buildTimeCard(habit) {
  const card = document.createElement('div');
  card.className =
    'habit-card time-card' +
    (openDetails.has(habit.id) ? ' details-open' : '');
  card.dataset.id = habit.id;
  if (editingId === habit.id) {
    card.innerHTML = editFormHtml(habit);
    return card;
  }
  const tKey = todayKey();
  const todayMinutes = minutesOnDate(habit, tKey);
  const weekMinutes = minutesForLastNDays(habit, 7);
  const streak = calcTimeStreak(habit);
  const goalDone = Boolean(habit.goalMinutes && todayMinutes >= habit.goalMinutes);
  const iconHtml = habit.icon
    ? `<span class="time-icon">${escapeHtml(habit.icon)}</span>`
    : '';
  card.innerHTML = `
    <div class="time-top">
      <div class="time-info">
        <div class="time-title">
          ${iconHtml}
          <span>${escapeHtml(habit.name)}</span>
        </div>
        <div class="time-meta">
          <span>Сегодня: <b>${formatMinutes(todayMinutes)}</b></span>
          <span>Неделя: <b>${formatMinutes(weekMinutes)}</b></span>
          <span>Серия: <b>${streak} ${pluralDays(streak)}</b></span>
          ${goalDone ? '<span class="goal-badge">✓ цель выполнена</span>' : ''}
        </div>
        ${progressHtml(habit, todayMinutes)}
      </div>
      <div class="time-actions">
        <button class="icon-btn details-btn" type="button" aria-label="Подробная статистика">
          📈
        </button>
        <button class="icon-btn edit-btn" type="button" aria-label="Редактировать">
          ✎
        </button>
        <button class="icon-btn delete-btn" type="button" aria-label="Удалить">
          🗑
        </button>
      </div>
    </div>
    <div class="time-controls">
      <button class="quick-btn quick-add" type="button" data-minutes="15">
        +15м
      </button>
      <button class="quick-btn quick-add" type="button" data-minutes="30">
        +30м
      </button>
      <button class="quick-btn quick-add" type="button" data-minutes="60">
        +1ч
      </button>
      <button class="quick-btn quick-add" type="button" data-minutes="120">
        +2ч
      </button>
      <div class="custom-time">
        <input
          class="custom-time-input"
          type="text"
          inputmode="decimal"
          placeholder="Своё время"
          aria-label="Своё время в часах"
        />
        <button class="small-add-btn add-time-btn" type="button">
          OK
        </button>
      </div>
      <div
        class="time-controls-bottom"
        style="flex-basis:100%;display:flex;align-items:center;gap:8px;margin-top:6px;"
      >
        <button class="quick-btn reset-today-btn" type="button">
          Сбросить
        </button>
      </div>
    </div>
    <div class="time-details">
      ${detailsHtml(habit)}
    </div>
  `;
  return card;
}
/* ---------- render ---------- */
function renderStats() {
  const tKey = todayKey();
  const todayTotal = habits.reduce((sum, habit) => {
    return sum + minutesOnDate(habit, tKey);
  }, 0);
  const weekTotal = habits.reduce((sum, habit) => {
    return sum + minutesForLastNDays(habit, 7);
  }, 0);
  const bestStreak = habits.reduce((max, habit) => {
    return Math.max(max, calcTimeStreak(habit));
  }, 0);
  let activeHabit = null;
  habits.forEach((habit) => {
    const week = minutesForLastNDays(habit, 7);
    if (week > 0 && (!activeHabit || week > activeHabit.minutes)) {
      activeHabit = {
        name: habit.name,
        minutes: week,
      };
    }
  });
  if (!activeHabit) {
    habits.forEach((habit) => {
      const total = totalMinutes(habit);
      if (total > 0 && (!activeHabit || total > activeHabit.minutes)) {
        activeHabit = {
          name: habit.name,
          minutes: total,
        };
      }
    });
  }
  els.statToday.textContent = formatMinutes(todayTotal);
  els.statWeek.textContent = formatMinutes(weekTotal);
  els.statBestStreak.textContent = String(bestStreak);
  els.statActiveHabit.textContent = activeHabit ? activeHabit.name : '—';
  els.statActiveHabit.title = activeHabit
    ? `${activeHabit.name} · ${formatMinutes(activeHabit.minutes)}`
    : '';
}
function renderOverallChart() {
  els.overallChart.innerHTML = buildOverallChart();
}
function renderList() {
  els.list.innerHTML = '';
  habits.forEach((habit) => {
    els.list.appendChild(buildTimeCard(habit));
  });
  els.empty.classList.toggle('show', habits.length === 0);
}
function renderPeriodButtons() {
  document.querySelectorAll('.period-btn').forEach((btn) => {
    btn.classList.toggle(
      'active',
      Number(btn.dataset.period) === periodDays
    );
  });
}
function render() {
  renderStats();
  renderOverallChart();
  renderList();
  renderPeriodButtons();
}
/* ---------- inline delete confirm ---------- */
function startDeleteConfirm(card, habit) {
  const actions = card.querySelector('.time-actions');
  actions.innerHTML = `<div class="confirm-row"> Удалить? <button class="confirm-btn confirm-yes" type="button">Да</button> <button class="confirm-btn confirm-no" type="button">Нет</button> </div>`;
  actions.querySelector('.confirm-yes').addEventListener('click', () => {
    card.classList.add('is-leaving');
    setTimeout(() => deleteHabit(habit.id), 220);
  });
  actions.querySelector('.confirm-no').addEventListener('click', render);
}
/* ---------- events ---------- */
els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = els.nameInput.value.trim();
  const icon = els.iconInput.value.trim();
  const goalRaw = els.goalInput.value.trim();
  if (!name) {
    showHint('Введи название привычки');
    return;
  }
  if (name.length > 60) {
    showHint('Слишком длинное название');
    return;
  }
  let goalMinutes = null;
  if (goalRaw) {
    goalMinutes = parseGoalMinutes(goalRaw);
    if (!goalMinutes) {
      showHint('Цель должна быть числом больше 0');
      return;
    }
  }
  addHabit(name, icon, goalMinutes);
  els.nameInput.value = '';
  els.iconInput.value = '';
  els.goalInput.value = '';
  els.nameInput.focus();
});
document.addEventListener('click', (e) => {
  const periodBtn = e.target.closest('.period-btn');
  if (periodBtn) {
    periodDays = Number(periodBtn.dataset.period) || 7;
    render();
    return;
  }
  const card = e.target.closest('.time-card');
  if (!card) return;
  const id = card.dataset.id;
  const habit = habits.find((h) => h.id === id);
  if (!habit) return;
  const quickBtn = e.target.closest('.quick-add');
  if (quickBtn) {
    const minutes = Number(quickBtn.dataset.minutes) || 0;
    if (minutes > 0) addTime(id, minutes);
    return;
  }
  const addTimeBtn = e.target.closest('.add-time-btn');
  if (addTimeBtn) {
    const input = card.querySelector('.custom-time-input');
    const minutes = parseHoursToMinutes(input.value);
    if (!minutes) {
      showHint('Введи время, например: 1.5 или 1:30');
      return;
    }
    addTime(id, minutes);
    return;
  }
  const resetBtn = e.target.closest('.reset-today-btn');
  if (resetBtn) {
    resetToday(id);
    return;
  }
  const detailsBtn = e.target.closest('.details-btn');
  if (detailsBtn) {
    if (openDetails.has(id)) {
      openDetails.delete(id);
    } else {
      openDetails.add(id);
    }
    render();
    return;
  }
  const editBtn = e.target.closest('.edit-btn');
  if (editBtn) {
    editingId = id;
    render();
    return;
  }
  const deleteBtn = e.target.closest('.delete-btn');
  if (deleteBtn) {
    startDeleteConfirm(card, habit);
    return;
  }
  const saveEditBtn = e.target.closest('.save-edit-btn');
  if (saveEditBtn) {
    const name = card.querySelector('.edit-name').value.trim();
    const icon = card.querySelector('.edit-icon').value.trim();
    const goalRaw = card.querySelector('.edit-goal').value.trim();
    if (!name) {
      showHint('Введи название привычки');
      return;
    }
    if (name.length > 60) {
      showHint('Слишком длинное название');
      return;
    }
    let goalMinutes = null;
    if (goalRaw) {
      goalMinutes = parseGoalMinutes(goalRaw);
      if (!goalMinutes) {
        showHint('Цель должна быть числом больше 0');
        return;
      }
    }
    habit.name = name;
    habit.icon = icon;
    habit.goalMinutes = goalMinutes;
    editingId = null;
    saveHabits();
    render();
    return;
  }
  const cancelEditBtn = e.target.closest('.cancel-edit-btn');
  if (cancelEditBtn) {
    editingId = null;
    render();
  }
});
document.addEventListener('keydown', (e) => {
  const target = e.target;
  if (!target || !target.classList) return;
  if (target.classList.contains('custom-time-input') && e.key === 'Enter') {
    e.preventDefault();
    const card = target.closest('.time-card');
    if (!card) return;
    const btn = card.querySelector('.add-time-btn');
    if (btn) btn.click();
  }
  if (
    (target.classList.contains('edit-name') ||
      target.classList.contains('edit-icon') ||
      target.classList.contains('edit-goal')) &&
    e.key === 'Escape'
  ) {
    editingId = null;
    render();
  }
});
/* ---------- init ---------- */
els.todayDate.textContent = formatToday();
render();
