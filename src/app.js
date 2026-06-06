/**
 * ============================================================================
 * To-Do List Life Dashboard - Core Application Logic
 * ============================================================================
 * 
 * This file contains all business logic for the dashboard:
 * - Time/Clock Manager (time display, greeting, updates)
 * - Focus Timer Manager (countdown, state management)
 * - To-Do Manager (CRUD, validation, sorting)
 * - Quick Link Manager (CRUD, URL validation)
 * - Storage Engine (Local Storage persistence)
 * - UI Controller (DOM rendering, event handling)
 * 
 * No external dependencies - pure vanilla JavaScript
 * ============================================================================
 */

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique UUID v4 identifier
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Pad a number with leading zero if needed
 */
function padZero(num) {
  return num.toString().padStart(2, '0');
}

/**
 * Format seconds into MM:SS display format
 */
function formatMMSS(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${padZero(minutes)}:${padZero(seconds)}`;
}

/**
 * Show notification toast message
 */
function showNotification(message, type = 'info', duration = 3000) {
  const container = document.getElementById('notificationContainer');
  if (!container) return;

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.setAttribute('role', 'status');
  notification.setAttribute('aria-live', 'polite');

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  notification.innerHTML = `
    <span class="notification-icon">${iconMap[type] || '•'}</span>
    <div class="notification-content">${message}</div>
    <button class="notification-close" aria-label="Close notification">&times;</button>
  `;

  notification.querySelector('.notification-close').addEventListener('click', () => {
    notification.remove();
  });

  container.appendChild(notification);

  if (duration > 0) {
    setTimeout(() => {
      notification.remove();
    }, duration);
  }

  return notification;
}

/**
 * Show a modal dialog with title, message, and confirm/cancel buttons
 */
async function showModal(title, message, confirmText = 'Confirm', cancelText = 'Cancel') {
  return new Promise((resolve) => {
    const template = document.getElementById('modalTemplate');
    if (!template) {
      resolve(false);
      return;
    }

    const modal = template.content.cloneNode(true);
    const dialog = modal.querySelector('.modal-dialog');

    modal.querySelector('#modalTitle').textContent = title;
    modal.querySelector('#modalBody').innerHTML = message;
    modal.querySelector('.btn-confirm').textContent = confirmText;
    modal.querySelector('.btn-cancel').textContent = cancelText;

    const overlay = modal.querySelector('.modal-overlay');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        resolve(false);
      }
    });

    modal.querySelector('.modal-close').addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(false);
    });

    modal.querySelector('.btn-confirm').addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(true);
    });

    modal.querySelector('.btn-cancel').addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(false);
    });

    document.body.appendChild(overlay);
  });
}

/**
 * Show a modal with an input field
 */
async function showInputModal(title, placeholder = '', defaultValue = '') {
  return new Promise((resolve) => {
    const template = document.getElementById('modalTemplate');
    if (!template) {
      resolve(null);
      return;
    }

    const modal = template.content.cloneNode(true);
    modal.querySelector('#modalTitle').textContent = title;
    modal.querySelector('#modalBody').innerHTML = `
      <input type="text" placeholder="${placeholder}" value="${defaultValue}" class="modal-input" autofocus />
    `;

    const overlay = modal.querySelector('.modal-overlay');
    const input = modal.querySelector('.modal-input');
    const confirmBtn = modal.querySelector('.btn-confirm');
    const cancelBtn = modal.querySelector('.btn-cancel');

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        resolve(null);
      }
    });

    modal.querySelector('.modal-close').addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(null);
    });

    confirmBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(input.value);
    });

    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(null);
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.body.removeChild(overlay);
        resolve(input.value);
      }
    });

    document.body.appendChild(overlay);
  });
}

// ============================================================================
// CLOCK MANAGER - Time display and greeting management
// ============================================================================

const ClockManager = (() => {
  let updateIntervalId = null;
  let listeners = [];

  const GREETING_PERIODS = {
    morning: { start: 5, end: 11, text: 'Good Morning' },
    afternoon: { start: 12, end: 17, text: 'Good Afternoon' },
    evening: { start: 18, end: 21, text: 'Good Evening' },
    night: { start: 22, end: 4, text: 'Good Night' }
  };

  function getCurrentHour() {
    return new Date().getHours();
  }

  function getGreeting(hours) {
    if (hours >= GREETING_PERIODS.morning.start && hours <= GREETING_PERIODS.morning.end) {
      return GREETING_PERIODS.morning.text;
    }
    if (hours >= GREETING_PERIODS.afternoon.start && hours <= GREETING_PERIODS.afternoon.end) {
      return GREETING_PERIODS.afternoon.text;
    }
    if (hours >= GREETING_PERIODS.evening.start && hours <= GREETING_PERIODS.evening.end) {
      return GREETING_PERIODS.evening.text;
    }
    // Night (22-4)
    return GREETING_PERIODS.night.text;
  }

  function formatTime(hours, minutes) {
    return `${padZero(hours)}:${padZero(minutes)}`;
  }

  function formatDate(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const dayNum = date.getDate();
    const year = date.getFullYear();

    return `${dayName}, ${monthName} ${dayNum}, ${year}`;
  }

  function getCurrentTime() {
    const now = new Date();
    return {
      hours: now.getHours(),
      minutes: now.getMinutes(),
      seconds: now.getSeconds(),
      date: now,
      dayOfWeek: now.getDay()
    };
  }

  function notifyListeners() {
    listeners.forEach(callback => callback());
  }

  function addListener(callback) {
    listeners.push(callback);
  }

  function startTimeUpdater() {
    // Update every second, but notify listeners only on minute change
    let lastMinute = getCurrentTime().minutes;

    if (updateIntervalId) clearInterval(updateIntervalId);

    updateIntervalId = setInterval(() => {
      const current = getCurrentTime();
      if (current.minutes !== lastMinute) {
        lastMinute = current.minutes;
        notifyListeners();
      }
    }, 1000);
  }

  function stopTimeUpdater() {
    if (updateIntervalId) {
      clearInterval(updateIntervalId);
      updateIntervalId = null;
    }
  }

  return {
    getCurrentTime,
    getGreeting,
    formatTime,
    formatDate,
    startTimeUpdater,
    stopTimeUpdater,
    addListener
  };
})();

// ============================================================================
// FOCUS TIMER MANAGER - Pomodoro timer management
// ============================================================================

const FocusTimer = (() => {
  let currentTime = 25 * 60; // 25 minutes in seconds
  let defaultDuration = 25 * 60;
  let isRunning = false;
  let isPaused = false;
  let intervalId = null;
  let listeners = [];

  function initialize(customDuration) {
    const minutes = parseInt(customDuration, 10);
    if (isNaN(minutes) || minutes <= 0 || minutes > 60) {
      return { valid: false, error: 'Duration must be between 1 and 60 minutes' };
    }
    defaultDuration = minutes * 60;
    currentTime = defaultDuration;
    isRunning = false;
    isPaused = false;
    notifyListeners();
    return { valid: true };
  }

  function start() {
    if (currentTime <= 0) {
      return { valid: false, error: 'Timer must be greater than 0' };
    }

    if (isRunning) {
      return { valid: false, error: 'Timer is already running' };
    }

    isRunning = true;
    isPaused = false;

    if (intervalId) clearInterval(intervalId);

    intervalId = setInterval(() => {
      tick();
    }, 1000);

    notifyListeners();
    return { valid: true };
  }

  function pause() {
    if (!isRunning) {
      return { valid: false, error: 'Timer is not running' };
    }

    isRunning = false;
    isPaused = true;

    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    notifyListeners();
    return { valid: true };
  }

  function resume() {
    if (isRunning || currentTime <= 0) {
      return { valid: false, error: 'Cannot resume' };
    }

    isRunning = true;
    isPaused = false;

    if (intervalId) clearInterval(intervalId);

    intervalId = setInterval(() => {
      tick();
    }, 1000);

    notifyListeners();
    return { valid: true };
  }

  function reset() {
    isRunning = false;
    isPaused = false;

    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    currentTime = defaultDuration;
    notifyListeners();
    return { valid: true };
  }

  function tick() {
    if (currentTime > 0) {
      currentTime--;
    }

    if (currentTime === 0) {
      isRunning = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      notifyListeners('completed');
      return;
    }

    notifyListeners();
  }

  function getCurrentTime() {
    return currentTime;
  }

  function getDisplayValue() {
    return formatMMSS(currentTime);
  }

  function getState() {
    return {
      time: currentTime,
      state: isRunning ? 'running' : isPaused ? 'paused' : 'idle'
    };
  }

  function addListener(callback) {
    listeners.push(callback);
  }

  function notifyListeners(event = 'update') {
    listeners.forEach(callback => callback(event));
  }

  function cleanup() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  return {
    initialize,
    start,
    pause,
    resume,
    reset,
    getCurrentTime,
    getDisplayValue,
    getState,
    addListener,
    cleanup
  };
})();

// ============================================================================
// TO-DO MANAGER - Task CRUD operations
// ============================================================================

const ToDoManager = (() => {
  let tasks = [];
  let sortCriteria = 'completion';
  let listeners = [];

  function validateTitle(title) {
    if (!title || typeof title !== 'string') {
      return { valid: false, error: 'Title must be a non-empty string' };
    }

    const trimmed = title.trim();

    if (trimmed.length === 0) {
      return { valid: false, error: 'Title cannot be empty or whitespace only' };
    }

    if (trimmed.length > 200) {
      return { valid: false, error: 'Title cannot exceed 200 characters' };
    }

    return { valid: true, value: trimmed };
  }

  function checkDuplicate(title, excludeId = null) {
    const normalized = title.toLowerCase().trim();
    return tasks.some(task => 
      task.id !== excludeId && task.title.toLowerCase() === normalized
    );
  }

  function addTask(title) {
    const validation = validateTitle(title);
    if (!validation.valid) {
      return { valid: false, error: validation.error };
    }

    if (checkDuplicate(validation.value)) {
      return { valid: false, error: `Task "${validation.value}" already exists` };
    }

    const task = {
      id: generateUUID(),
      title: validation.value,
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    tasks.push(task);
    notifyListeners();
    return { valid: true, task };
  }

  function editTask(id, newTitle) {
    const validation = validateTitle(newTitle);
    if (!validation.valid) {
      return { valid: false, error: validation.error };
    }

    if (checkDuplicate(validation.value, id)) {
      return { valid: false, error: `Task "${validation.value}" already exists` };
    }

    const task = tasks.find(t => t.id === id);
    if (!task) {
      return { valid: false, error: 'Task not found' };
    }

    task.title = validation.value;
    task.updatedAt = Date.now();
    notifyListeners();
    return { valid: true, task };
  }

  function deleteTask(id) {
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) {
      return { valid: false, error: 'Task not found' };
    }

    tasks.splice(index, 1);
    notifyListeners();
    return { valid: true, removed: 1 };
  }

  function toggleComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) {
      return { valid: false, error: 'Task not found' };
    }

    task.completed = !task.completed;
    task.updatedAt = Date.now();
    notifyListeners();
    return { valid: true, task };
  }

  function sortTasks(criteria) {
    sortCriteria = criteria;

    if (criteria === 'completion') {
      // Incomplete first, then complete
      tasks.sort((a, b) => {
        if (a.completed === b.completed) {
          return b.createdAt - a.createdAt; // Most recent first
        }
        return a.completed ? 1 : -1;
      });
    } else if (criteria === 'date') {
      // Most recent first
      tasks.sort((a, b) => b.createdAt - a.createdAt);
    } else if (criteria === 'alphabetical') {
      // A-Z, case-insensitive
      tasks.sort((a, b) => 
        a.title.toLowerCase().localeCompare(b.title.toLowerCase())
      );
    }

    notifyListeners();
    return { valid: true };
  }

  function getTasks() {
    return [...tasks];
  }

  function setTasks(newTasks) {
    tasks = [...newTasks];
    sortTasks(sortCriteria);
    notifyListeners();
  }

  function getSortCriteria() {
    return sortCriteria;
  }

  function addListener(callback) {
    listeners.push(callback);
  }

  function notifyListeners() {
    listeners.forEach(callback => callback());
  }

  return {
    addTask,
    editTask,
    deleteTask,
    toggleComplete,
    getTasks,
    setTasks,
    sortTasks,
    getSortCriteria,
    addListener
  };
})();

// ============================================================================
// QUICK LINK MANAGER - Quick links CRUD operations
// ============================================================================

const QuickLinkManager = (() => {
  let links = [];
  let listeners = [];

  function validateUrl(url) {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: 'URL must be a non-empty string' };
    }

    const trimmed = url.trim();

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return { valid: false, error: 'URL must start with http:// or https://' };
    }

    try {
      new URL(trimmed);
      return { valid: true, value: trimmed };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  function validateName(name) {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Name must be a non-empty string' };
    }

    const trimmed = name.trim();

    if (trimmed.length === 0) {
      return { valid: false, error: 'Name cannot be empty' };
    }

    if (trimmed.length > 100) {
      return { valid: false, error: 'Name cannot exceed 100 characters' };
    }

    return { valid: true, value: trimmed };
  }

  function addLink(name, url) {
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      return { valid: false, error: nameValidation.error };
    }

    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      return { valid: false, error: urlValidation.error };
    }

    const link = {
      id: generateUUID(),
      name: nameValidation.value,
      url: urlValidation.value,
      createdAt: Date.now()
    };

    links.push(link);
    notifyListeners();
    return { valid: true, link };
  }

  function editLink(id, name, url) {
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      return { valid: false, error: nameValidation.error };
    }

    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      return { valid: false, error: urlValidation.error };
    }

    const link = links.find(l => l.id === id);
    if (!link) {
      return { valid: false, error: 'Link not found' };
    }

    link.name = nameValidation.value;
    link.url = urlValidation.value;
    notifyListeners();
    return { valid: true, link };
  }

  function deleteLink(id) {
    const index = links.findIndex(l => l.id === id);
    if (index === -1) {
      return { valid: false, error: 'Link not found' };
    }

    links.splice(index, 1);
    notifyListeners();
    return { valid: true };
  }

  function getLinks() {
    return [...links];
  }

  function setLinks(newLinks) {
    links = [...newLinks];
    notifyListeners();
  }

  function addListener(callback) {
    listeners.push(callback);
  }

  function notifyListeners() {
    listeners.forEach(callback => callback());
  }

  return {
    addLink,
    editLink,
    deleteLink,
    getLinks,
    setLinks,
    addListener
  };
})();

// ============================================================================
// STORAGE ENGINE - Local Storage persistence
// ============================================================================

const StorageEngine = (() => {
  const PREFIX = 'dashboard:';
  let isAvailable = false;

  function checkAvailability() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      isAvailable = true;
      return true;
    } catch {
      isAvailable = false;
      console.warn('Local Storage unavailable - using in-memory storage only');
      return false;
    }
  }

  function save(key, data) {
    if (!isAvailable) {
      checkAvailability();
    }

    if (isAvailable) {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(data));
      } catch (e) {
        if (e.name === 'QuotaExceededError') {
          console.warn('Local Storage quota exceeded');
          showNotification('Storage quota exceeded - data may not persist', 'warning');
        }
      }
    }
  }

  function load(key) {
    if (!isAvailable) {
      checkAvailability();
    }

    if (isAvailable) {
      try {
        const data = localStorage.getItem(PREFIX + key);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        console.error('Failed to parse stored data:', e);
        return null;
      }
    }

    return null;
  }

  function remove(key) {
    if (isAvailable) {
      localStorage.removeItem(PREFIX + key);
    }
  }

  function clear() {
    if (isAvailable) {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  return {
    checkAvailability,
    save,
    load,
    remove,
    clear,
    isAvailable: () => isAvailable
  };
})();

// ============================================================================
// UI CONTROLLER - DOM rendering and event handling
// ============================================================================

const UIController = (() => {
  let currentUserName = '';

  // ---- TIME & GREETING ----

  function renderTimeDisplay(time) {
    const timeDisplay = document.getElementById('timeDisplay');
    if (!timeDisplay) return;

    const formatted = `${ClockManager.formatTime(time.hours, time.minutes)} ${ClockManager.formatDate(time.date)}`;
    timeDisplay.textContent = formatted;
  }

  function renderGreeting() {
    const greetingEl = document.getElementById('greeting');
    if (!greetingEl) return;

    const time = ClockManager.getCurrentTime();
    const greeting = ClockManager.getGreeting(time.hours);
    const displayName = currentUserName ? `, ${currentUserName}` : '';

    greetingEl.textContent = `${greeting}${displayName}`;
  }

  // ---- TIMER ----

  function renderTimer(displayValue, state) {
    const timerDisplay = document.getElementById('timerDisplay');
    const timerState = document.getElementById('timerState');
    const btnStart = document.getElementById('btnStart');
    const btnStop = document.getElementById('btnStop');
    const btnReset = document.getElementById('btnReset');

    if (!timerDisplay) return;

    timerDisplay.textContent = displayValue;

    if (timerState) {
      timerState.textContent = state === 'running' ? '⏱️ Running...' : state === 'paused' ? '⏸️ Paused' : '';
    }

    if (btnStart && btnStop) {
      btnStart.disabled = state === 'running';
      btnStop.disabled = state !== 'running';
    }
  }

  function playTimerCompletionSound() {
    // Play a simple beep using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // Hz
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.error('Failed to play timer completion sound:', e);
    }
  }

  async function handleTimerCompletion() {
    // Visual feedback
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
      timerDisplay.classList.add('completed');
      setTimeout(() => {
        timerDisplay.classList.remove('completed');
      }, 2000);
    }

    // Audible feedback
    playTimerCompletionSound();

    // Notification
    showNotification('Focus session complete! Time for a break.', 'success', 4000);

    // Reset timer after feedback
    setTimeout(() => {
      FocusTimer.reset();
      renderTimer(FocusTimer.getDisplayValue(), FocusTimer.getState().state);
    }, 2000);
  }

  // ---- TASKS ----

  function renderTaskList(tasks) {
    const taskList = document.getElementById('taskList');
    const placeholder = document.getElementById('noTasksPlaceholder');

    if (!taskList) return;

    taskList.innerHTML = '';

    if (tasks.length === 0) {
      if (placeholder) placeholder.style.display = 'block';
      return;
    }

    if (placeholder) placeholder.style.display = 'none';

    const fragment = document.createDocumentFragment();

    tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item ${task.completed ? 'completed' : ''}`;
      li.dataset.taskId = task.id;

      const createdDate = new Date(task.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });

      li.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
               aria-label="Mark task as ${task.completed ? 'incomplete' : 'complete'}">
        <div class="task-content">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-date">Created: ${createdDate}</div>
        </div>
        <div class="task-actions">
          <button class="btn-icon edit" aria-label="Edit task" title="Edit">✎</button>
          <button class="btn-icon delete" aria-label="Delete task" title="Delete">🗑</button>
        </div>
      `;

      // Checkbox toggle
      li.querySelector('.task-checkbox').addEventListener('change', () => {
        const result = ToDoManager.toggleComplete(task.id);
        if (!result.valid) {
          showNotification(result.error, 'error');
        }
      });

      // Edit button
      li.querySelector('.btn-icon.edit').addEventListener('click', () => {
        handleEditTask(task);
      });

      // Delete button
      li.querySelector('.btn-icon.delete').addEventListener('click', () => {
        handleDeleteTask(task.id, task.title);
      });

      fragment.appendChild(li);
    });

    taskList.appendChild(fragment);
  }

  async function handleEditTask(task) {
    const newTitle = await showInputModal('Edit Task', 'Enter new task title', task.title);
    if (newTitle !== null && newTitle.trim() !== '') {
      const result = ToDoManager.editTask(task.id, newTitle);
      if (!result.valid) {
        showNotification(result.error, 'warning');
      }
    }
  }

  async function handleDeleteTask(taskId, taskTitle) {
    const confirmed = await showModal(
      'Delete Task',
      `Are you sure you want to delete "${escapeHtml(taskTitle)}"?`,
      'Delete',
      'Cancel'
    );

    if (confirmed) {
      const result = ToDoManager.deleteTask(taskId);
      if (result.valid) {
        showNotification(`Task deleted`, 'success');
      } else {
        showNotification(result.error, 'error');
      }
    }
  }

  // ---- QUICK LINKS ----

  function renderQuickLinks(links) {
    const container = document.getElementById('linkContainer');
    const placeholder = document.getElementById('noLinksPlaceholder');

    if (!container) return;

    container.innerHTML = '';

    if (links.length === 0) {
      if (placeholder) placeholder.style.display = 'block';
      return;
    }

    if (placeholder) placeholder.style.display = 'none';

    const fragment = document.createDocumentFragment();

    links.forEach(link => {
      const div = document.createElement('div');
      div.className = 'quick-link';
      div.dataset.linkId = link.id;

      div.innerHTML = `
        <div class="link-name" title="${escapeHtml(link.url)}">${escapeHtml(link.name)}</div>
        <div class="link-actions">
          <button class="btn-icon open" aria-label="Open link" title="Open">↗</button>
          <button class="btn-icon edit" aria-label="Edit link" title="Edit">✎</button>
          <button class="btn-icon delete" aria-label="Delete link" title="Delete">🗑</button>
        </div>
      `;

      // Open link
      div.querySelector('.btn-icon.open').addEventListener('click', () => {
        window.open(link.url, '_blank', 'noopener,noreferrer');
      });

      // Edit link
      div.querySelector('.btn-icon.edit').addEventListener('click', () => {
        handleEditLink(link);
      });

      // Delete link
      div.querySelector('.btn-icon.delete').addEventListener('click', () => {
        handleDeleteLink(link.id, link.name);
      });

      fragment.appendChild(div);
    });

    container.appendChild(fragment);
  }

  async function handleEditLink(link) {
    // Show a modal with two inputs: name and URL
    const template = document.getElementById('modalTemplate');
    if (!template) return;

    const modal = template.content.cloneNode(true);
    modal.querySelector('#modalTitle').textContent = 'Edit Quick Link';
    modal.querySelector('#modalBody').innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <input type="text" class="edit-link-name" placeholder="Link name" value="${escapeHtml(link.name)}" />
        <input type="url" class="edit-link-url" placeholder="https://example.com" value="${escapeHtml(link.url)}" />
      </div>
    `;

    const overlay = modal.querySelector('.modal-overlay');
    const nameInput = modal.querySelector('.edit-link-name');
    const urlInput = modal.querySelector('.edit-link-url');
    const confirmBtn = modal.querySelector('.btn-confirm');
    const cancelBtn = modal.querySelector('.btn-cancel');

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });

    modal.querySelector('.modal-close').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    confirmBtn.addEventListener('click', () => {
      const newName = nameInput.value;
      const newUrl = urlInput.value;
      const result = QuickLinkManager.editLink(link.id, newName, newUrl);

      if (result.valid) {
        document.body.removeChild(overlay);
        showNotification('Link updated', 'success');
      } else {
        showNotification(result.error, 'warning');
      }
    });

    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    document.body.appendChild(overlay);
  }

  async function handleDeleteLink(linkId, linkName) {
    const confirmed = await showModal(
      'Delete Quick Link',
      `Are you sure you want to delete "${escapeHtml(linkName)}"?`,
      'Delete',
      'Cancel'
    );

    if (confirmed) {
      const result = QuickLinkManager.deleteLink(linkId);
      if (result.valid) {
        showNotification('Link deleted', 'success');
      } else {
        showNotification(result.error, 'error');
      }
    }
  }

  // ---- THEME ----

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('dashboard').setAttribute('data-theme', theme);
    StorageEngine.save('theme', theme);
  }

  function getTheme() {
    const saved = StorageEngine.load('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    document.getElementById('dashboard').setAttribute('data-theme', saved);
    return saved;
  }

  // ---- NAME MANAGEMENT ----

  async function handleEditName() {
    const newName = await showInputModal('Edit Your Name', 'Enter your name', currentUserName);
    if (newName !== null) {
      currentUserName = newName.trim();
      StorageEngine.save('userName', currentUserName);
      renderGreeting();
      if (currentUserName) {
        showNotification(`Hello, ${currentUserName}!`, 'success');
      }
    }
  }

  // ---- CUSTOM TIMER ----

  async function handleCustomTimer() {
    const newDuration = await showInputModal('Set Timer Duration', 'Enter duration in minutes (1-60)', '25');
    if (newDuration !== null && newDuration.trim() !== '') {
      const result = FocusTimer.initialize(newDuration);
      if (result.valid) {
        StorageEngine.save('timerDuration', parseInt(newDuration, 10));
        renderTimer(FocusTimer.getDisplayValue(), FocusTimer.getState().state);
        showNotification(`Timer set to ${newDuration} minutes`, 'success');
      } else {
        showNotification(result.error, 'warning');
      }
    }
  }

  // ---- EVENT LISTENERS ----

  function addEventListeners() {
    // Task input
    const taskInput = document.getElementById('taskInput');
    const btnAddTask = document.getElementById('btnAddTask');

    if (btnAddTask) {
      btnAddTask.addEventListener('click', () => {
        const title = taskInput?.value || '';
        if (title.trim() === '') {
          showNotification('Please enter a task', 'warning');
          return;
        }

        const result = ToDoManager.addTask(title);
        if (result.valid) {
          if (taskInput) taskInput.value = '';
          showNotification('Task added', 'success');
        } else {
          showNotification(result.error, 'warning');
        }
      });

      if (taskInput) {
        taskInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            btnAddTask.click();
          }
        });
      }
    }

    // Sort tasks
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        const result = ToDoManager.sortTasks(e.target.value);
        if (result.valid) {
          renderTaskList(ToDoManager.getTasks());
        }
      });
    }

    // Quick link form
    const linkNameInput = document.getElementById('linkNameInput');
    const linkUrlInput = document.getElementById('linkUrlInput');
    const btnAddLink = document.getElementById('btnAddLink');

    if (btnAddLink) {
      btnAddLink.addEventListener('click', () => {
        const name = linkNameInput?.value || '';
        const url = linkUrlInput?.value || '';

        if (name.trim() === '' || url.trim() === '') {
          showNotification('Please enter both name and URL', 'warning');
          return;
        }

        const result = QuickLinkManager.addLink(name, url);
        if (result.valid) {
          if (linkNameInput) linkNameInput.value = '';
          if (linkUrlInput) linkUrlInput.value = '';
          showNotification('Link added', 'success');
        } else {
          showNotification(result.error, 'warning');
        }
      });

      if (linkUrlInput) {
        linkUrlInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            btnAddLink.click();
          }
        });
      }
    }

    // Timer controls
    const btnStart = document.getElementById('btnStart');
    const btnStop = document.getElementById('btnStop');
    const btnReset = document.getElementById('btnReset');

    if (btnStart) {
      btnStart.addEventListener('click', () => {
        const result = FocusTimer.start();
        if (!result.valid) {
          showNotification(result.error, 'warning');
        }
      });
    }

    if (btnStop) {
      btnStop.addEventListener('click', () => {
        const state = FocusTimer.getState().state;
        if (state === 'running') {
          FocusTimer.pause();
        } else if (state === 'paused') {
          FocusTimer.resume();
        }
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        FocusTimer.reset();
      });
    }

    // Theme toggle
    const btnTheme = document.getElementById('btnTheme');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = current === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
      });
    }

    // Edit name
    const btnEditName = document.getElementById('btnEditName');
    if (btnEditName) {
      btnEditName.addEventListener('click', handleEditName);
    }

    // Custom timer
    const btnCustomTimer = document.getElementById('btnCustomTimer');
    if (btnCustomTimer) {
      btnCustomTimer.addEventListener('click', handleCustomTimer);
    }
  }

  // ---- INITIALIZATION ----

  function initialize() {
    // Load preferences
    currentUserName = StorageEngine.load('userName') || '';
    const savedTheme = StorageEngine.load('theme') || 'light';
    const savedTimerDuration = StorageEngine.load('timerDuration') || 25;
    const savedSortCriteria = StorageEngine.load('sortCriteria') || 'completion';

    // Load tasks
    const savedTasks = StorageEngine.load('tasks') || [];
    ToDoManager.setTasks(savedTasks);

    // Load quick links
    const savedLinks = StorageEngine.load('quickLinks') || [];
    QuickLinkManager.setLinks(savedLinks);

    // Initialize timer
    FocusTimer.initialize(savedTimerDuration);

    // Apply theme
    applyTheme(savedTheme);

    // Render initial state
    const time = ClockManager.getCurrentTime();
    renderTimeDisplay(time);
    renderGreeting();
    renderTimer(FocusTimer.getDisplayValue(), FocusTimer.getState().state);
    renderTaskList(ToDoManager.getTasks());
    renderQuickLinks(QuickLinkManager.getLinks());

    // Set sort dropdown
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.value = savedSortCriteria;
      ToDoManager.sortTasks(savedSortCriteria);
    }

    // Add event listeners
    addEventListeners();

    // Start clock updater
    ClockManager.startTimeUpdater();
    ClockManager.addListener(() => {
      const currentTime = ClockManager.getCurrentTime();
      renderTimeDisplay(currentTime);
      renderGreeting();
    });

    // Add timer listener
    FocusTimer.addListener((event) => {
      if (event === 'completed') {
        handleTimerCompletion();
      } else {
        renderTimer(FocusTimer.getDisplayValue(), FocusTimer.getState().state);
      }
    });

    // Add task listener
    ToDoManager.addListener(() => {
      renderTaskList(ToDoManager.getTasks());
      StorageEngine.save('tasks', ToDoManager.getTasks());
      StorageEngine.save('sortCriteria', ToDoManager.getSortCriteria());
    });

    // Add quick link listener
    QuickLinkManager.addListener(() => {
      renderQuickLinks(QuickLinkManager.getLinks());
      StorageEngine.save('quickLinks', QuickLinkManager.getLinks());
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      ClockManager.stopTimeUpdater();
      FocusTimer.cleanup();
    });

    showNotification('Dashboard loaded', 'info', 1500);
  }

  return {
    initialize
  };
})();

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// APPLICATION INITIALIZATION
// ============================================================================

// Export modules for testing (ES6 modules)
export {
  ClockManager,
  FocusTimer,
  ToDoManager,
  QuickLinkManager,
  StorageEngine,
  UIController,
  generateUUID,
  padZero,
  formatMMSS,
  escapeHtml
};

document.addEventListener('DOMContentLoaded', () => {
  StorageEngine.checkAvailability();
  UIController.initialize();
});
