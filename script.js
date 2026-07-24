/**
 * Модуль управления данными трекера привычек (Habit Tracker)
 */

// Ключ для хранения массива привычек в localStorage
const STORAGE_KEY = 'habit_tracker_data';

/**
 * Вспомогательная функция: получает текущую локальную дату в формате "YYYY-MM-DD".
 * @returns {string} Дата в формате ГГГГ-ММ-ДД
 */
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Вспомогательная функция: генерирует уникальный строковый ID.
 * @returns {string} Уникальный идентификатор
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Считывает список привычек из localStorage.
 * @returns {Array<Object>} Массив привычек
 */
export function getHabits() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Ошибка при чтении привычек из localStorage:', error);
    return [];
  }
}

/**
 * Сохраняет массив привычек в localStorage.
 * @param {Array<Object>} habits - Массив привычек
 */
export function saveHabits(habits) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  } catch (error) {
    console.error('Ошибка при сохранении привычек в localStorage:', error);
  }
}

/**
 * Добавляет новую привычку в хранилище.
 * @param {string} name - Название привычки
 * @returns {Object|null} Созданный объект привычки
 */
export function addHabit(name) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    console.warn('Название привычки должно быть непустой строкой');
    return null;
  }

  const habits = getHabits();

  const newHabit = {
    id: generateId(),
    name: name.trim(),
    createdAt: getTodayString(),
    doneDates: []
  };

  habits.push(newHabit);
  saveHabits(habits);

  return newHabit;
}

/**
 * Удаляет привычку по её id.
 * @param {string} id - Уникальный идентификатор привычки
 * @returns {Array<Object>} Обновленный массив привычек
 */
export function deleteHabit(id) {
  const habits = getHabits();
  const updatedHabits = habits.filter((habit) => habit.id !== id);

  saveHabits(updatedHabits);
  return updatedHabits;
}

/**
 * Переключает статус выполнения привычки за сегодняшний день.
 * Если сегодняшняя дата есть в doneDates — удаляет её, иначе — добавляет.
 * @param {string} id - Уникальный идентификатор привычки
 * @returns {Object|null} Обновленный объект привычки или null, если привычка не найдена
 */
export function toggleHabitForToday(id) {
  const habits = getHabits();
  const habit = habits.find((item) => item.id === id);

  if (!habit) {
    console.warn(`Привычка с id "${id}" не найдена`);
    return null;
  }

  const today = getTodayString();
  const dateIndex = habit.doneDates.indexOf(today);

  if (dateIndex === -1) {
    // Отмечаем привычку как выполненную сегодня
    habit.doneDates.push(today);
  } else {
    // Снимаем отметку выполнения за сегодня
    habit.doneDates.splice(dateIndex, 1);
  }

  saveHabits(habits);
  return habit;
}
