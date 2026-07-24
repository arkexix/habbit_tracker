const STORAGE_KEY = 'habit_tracker_data';

// Вспомогательные функции
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

// Работа с LocalStorage
function getHabits() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveHabits(habits) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

function addHabit(name) {
  if (!name || !name.trim()) return;
  const habits = getHabits();
  habits.push({
    id: generateId(),
    name: name.trim(),
    createdAt: getTodayString(),
    doneDates: []
  });
  saveHabits(habits);
}

function deleteHabit(id) {
  const habits = getHabits().filter((h) => h.id !== id);
  saveHabits(habits);
}

function toggleHabitForToday(id) {
  const habits = getHabits();
  const habit = habits.find((h) => h.id === id);
  if (!habit) return;

  const today = getTodayString();
  const index = habit.doneDates.indexOf(today);

  if (index === -1) {
    habit.doneDates.push(today);
  } else {
    habit.doneDates.splice(index, 1);
  }
  saveHabits(habits);
}

// Отрисовка UI
function render() {
  const habitInput = document.getElementById('habitInput');
  const habitList = document.getElementById('habitList');
  const emptyState = document.getElementById('emptyState');

  const habits = getHabits();
  const today = getTodayString();

  habitList.innerHTML = '';

  if (habits.length === 0) {
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
  }

  habits.forEach((habit) => {
    const isDoneToday = habit.doneDates.includes(today);

    const li = document.createElement('li');
    if (isDoneToday) li.classList.add('completed');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'habit-checkbox';
    checkbox.checked = isDoneToday;
    checkbox.addEventListener('change', () => {
      toggleHabitForToday(habit.id);
      render();
    });

    const span = document.createElement('span');
    span.className = 'habit-text';
    span.textContent = habit.name;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.addEventListener('click', () => {
      deleteHabit(habit.id);
      render();
    });

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(deleteBtn);
    habitList.appendChild(li);
  });
}

// Инициализация событий
document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('addBtn');
  const habitInput = document.getElementById('habitInput');

  function handleAdd() {
    const text = habitInput.value;
    if (text.trim()) {
      addHabit(text);
      habitInput.value = '';
      render();
    }
  }

  addBtn.addEventListener('click', handleAdd);
  habitInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAdd();
  });

  render();
});
