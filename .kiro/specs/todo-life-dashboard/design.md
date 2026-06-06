# To-Do List Life Dashboard - Technical Design

## Overview

The To-Do List Life Dashboard is a single-page application (SPA) built with vanilla HTML, CSS, and JavaScript. It serves as a personal productivity hub combining time awareness, task management, and quick website access. The architecture emphasizes modular component design, efficient state management through Local Storage, and responsive UI that works seamlessly across desktop, tablet, and mobile devices.

### Design Goals

1. **No Framework Dependencies**: Pure vanilla JavaScript for maximum performance and minimal bundle size
2. **Modular Architecture**: Clear separation of concerns with independent, testable modules
3. **Local Storage Persistence**: All user data (tasks, preferences, theme) persists across sessions
4. **Real-time Updates**: Seamless UI updates without page reloads
5. **Responsive Design**: Single codebase adapts to all screen sizes
6. **Accessible**: WCAG 2.1 AA compliance with semantic HTML and keyboard navigation

---

## Architecture

### System Components

The dashboard consists of six core components working in concert:

```
┌─────────────────────────────────────────────────────┐
│              UI Controller                           │
│  (Orchestrates UI rendering and event handling)    │
└─────────────┬───────────────────────────────────────┘
              │
    ┌─────────┼─────────┬──────────┬───────────┐
    │         │         │          │           │
    ▼         ▼         ▼          ▼           ▼
┌───────┐ ┌──────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Clock │ │Focus │ │To-Do   │ │Quick   │ │Storage │
│Mgr    │ │Timer │ │Manager │ │Link    │ │Engine  │
│       │ │      │ │        │ │Manager │ │        │
└───────┘ └──────┘ └────────┘ └────────┘ └────────┘
```

#### 1. Clock Manager
**Responsibility**: Manages current time/date display and time-based greetings

**Key Functions**:
- `getCurrentTime()` → Returns `{hours, minutes, seconds, date, dayOfWeek}`
- `getGreeting(hours)` → Returns greeting text based on hour range
- `startTimeUpdater()` → Initiates minute-level time updates
- `formatTime(hours, minutes)` → Returns formatted time string
- `formatDate(date)` → Returns formatted date string

**Update Cycle**: 
- Polls every 60 seconds to check if minute has changed
- Triggers UI update only when minute changes (efficiency)
- Updates greeting when crossing time boundary (05:00, 12:00, 18:00, 22:00)

#### 2. Focus Timer Manager
**Responsibility**: Manages Pomodoro-style timer functionality

**Key Functions**:
- `initialize(customDuration)` → Sets up timer with custom or default (25 minutes)
- `start()` → Begins countdown from current value
- `pause()` → Temporarily stops countdown
- `resume()` → Continues from paused time
- `reset()` → Returns to default duration
- `setCustomDuration(minutes)` → Validates and sets new default
- `tick()` → Decrements by 1 second (called by interval)
- `getDisplayValue()` → Returns formatted "MM:SS" string
- `getState()` → Returns {time, state: 'idle'|'running'|'paused'}

**State Machine**:
```
         start()
    ┌──────────────┐
    │     IDLE     │
    │ (25:00)      │
    └──────────────┘
           ▲  │
         reset pause()
           │  │
           │  ▼
        ┌──────────────┐
        │   RUNNING    │
        │ (decrements) │
        └──────┬───────┘
               │ pause()
               ▼
        ┌──────────────┐
    ┌──▶│   PAUSED     │
    │   │              │
    │   └──────────────┘
    │    resume()  ▲
    │       │      │ start()
    └───────┘      │
           └───────┘

Completion flow: RUNNING → (reaches 00:00) → trigger notification → IDLE
```

**Timer Completion Notification**:
- Visual feedback: CSS animation + color change
- Audible feedback: Web Audio API beep or HTML5 `<audio>` element
- Both must complete before resetting (idempotency safeguard)

#### 3. To-Do Manager
**Responsibility**: CRUD operations for tasks and list management

**Key Functions**:
- `addTask(title)` → Returns `{id, title, completed, createdAt}` or throws validation error
- `editTask(id, newTitle)` → Updates title, throws if duplicate
- `deleteTask(id)` → Removes task, returns removed count
- `toggleComplete(id)` → Flips completion status
- `getAllTasks()` → Returns all tasks in current sort order
- `sortTasks(criteria)` → Applies sort: 'completion'|'date'|'alphabetical'
- `validateTitle(title)` → Returns `{valid, error}` object
- `checkDuplicate(title, excludeId)` → Returns boolean (case-insensitive)

**Task Data Structure**:
```javascript
{
  id: "uuid-v4-string",
  title: "Buy groceries",
  completed: false,
  createdAt: 1705329600000,  // milliseconds
  updatedAt: 1705329600000
}
```

**Validation Rules**:
- Title: Non-empty, max 200 chars, trimmed
- Duplicate: Case-insensitive comparison
- Empty input: Rejected silently or with error message

#### 4. Quick Link Manager
**Responsibility**: CRUD operations for favorite website shortcuts

**Key Functions**:
- `addLink(name, url)` → Returns `{id, name, url}` or throws validation error
- `editLink(id, name, url)` → Updates link details
- `deleteLink(id)` → Removes link
- `getAllLinks()` → Returns all links
- `validateUrl(url)` → Returns `{valid, error}` object
- `openLink(id)` → Opens URL in new tab

**Link Data Structure**:
```javascript
{
  id: "uuid-v4-string",
  name: "GitHub",
  url: "https://github.com",
  createdAt: 1705329600000
}
```

**URL Validation**:
- Must start with `http://` or `https://`
- Must be valid according to URL constructor
- Example: `https://example.com` ✓, `github.com` ✗

#### 5. Storage Engine
**Responsibility**: Abstracts Local Storage with JSON serialization/deserialization

**Key Functions**:
- `save(key, data)` → Serializes and stores data
- `load(key)` → Deserializes and retrieves data
- `remove(key)` → Deletes key
- `clear()` → Removes all dashboard data (not browser storage)
- `isAvailable()` → Returns boolean if Local Storage is accessible
- `getCurrentSize()` → Returns approximate storage usage in bytes

**Storage Schema**:
```javascript
{
  "dashboard:tasks": [
    {id, title, completed, createdAt, updatedAt},
    // ... more tasks
  ],
  "dashboard:quickLinks": [
    {id, name, url, createdAt},
    // ... more links
  ],
  "dashboard:userName": "Alex",
  "dashboard:timerDuration": 25,
  "dashboard:sortPreference": "completion",
  "dashboard:theme": "light",
  "dashboard:lastSync": 1705329600000
}
```

**Error Handling**:
- Quota exceeded: Log warning, fallback to in-memory data
- Corrupted data: Attempt JSON.parse with try-catch, use defaults on failure
- Unavailable: Flag stored in memory, operations continue with in-memory fallback

#### 6. UI Controller
**Responsibility**: Orchestrates DOM rendering, event handling, and user interactions

**Key Functions**:
- `initialize()` → Loads data and renders all components
- `render()` → Full re-render of dashboard
- `renderTimeDisplay(time)` → Updates clock display
- `renderGreeting(greeting, userName)` → Updates greeting text
- `renderTimer(displayValue, state)` → Updates timer display and buttons
- `renderTaskList(tasks)` → Renders all tasks with actions
- `renderQuickLinks(links)` → Renders link buttons
- `addEventListeners()` → Attaches all event handlers
- `updateTheme(themeName)` → Applies CSS class to root element

**DOM Structure** (Semantic HTML):
```html
<div id="dashboard" class="dashboard" data-theme="light">
  <!-- Header: Time & Greeting -->
  <header class="header">
    <div id="timeDisplay" class="time-display">10:30 Monday, Jan 15, 2024</div>
    <h1 id="greeting" class="greeting">Good Morning, Alex</h1>
  </header>

  <!-- Timer Section -->
  <section class="timer-section">
    <div id="timerDisplay" class="timer-display">25:00</div>
    <div class="timer-controls">
      <button id="btnStart" class="btn-timer">Start</button>
      <button id="btnStop" class="btn-timer" disabled>Stop</button>
      <button id="btnReset" class="btn-timer">Reset</button>
    </div>
  </section>

  <!-- To-Do List Section -->
  <section class="todo-section">
    <h2>Tasks</h2>
    <div class="todo-controls">
      <input id="taskInput" type="text" placeholder="Add a new task...">
      <button id="btnAddTask" class="btn-primary">Add</button>
      <select id="sortSelect" class="sort-select">
        <option value="completion">By Completion</option>
        <option value="date">By Date Created</option>
        <option value="alphabetical">Alphabetically</option>
      </select>
    </div>
    <ul id="taskList" class="task-list">
      <!-- Rendered tasks here -->
    </ul>
  </section>

  <!-- Quick Links Section -->
  <section class="quick-links-section">
    <h2>Quick Links</h2>
    <div class="quick-link-form">
      <input id="linkNameInput" type="text" placeholder="Link name">
      <input id="linkUrlInput" type="url" placeholder="https://example.com">
      <button id="btnAddLink" class="btn-primary">Add Link</button>
    </div>
    <div id="linkContainer" class="link-container">
      <!-- Rendered links here -->
    </div>
  </section>

  <!-- Settings -->
  <footer class="footer">
    <button id="btnTheme" class="btn-secondary">Toggle Theme</button>
    <button id="btnEditName" class="btn-secondary">Edit Name</button>
    <button id="btnCustomTimer" class="btn-secondary">Timer Duration</button>
  </footer>
</div>
```

---

## Data Models

### Task
```javascript
class Task {
  constructor(title) {
    this.id = generateUUID();
    this.title = title.trim();
    this.completed = false;
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
  }

  markComplete() {
    this.completed = true;
    this.updatedAt = Date.now();
  }

  markIncomplete() {
    this.completed = false;
    this.updatedAt = Date.now();
  }

  update(newTitle) {
    this.title = newTitle.trim();
    this.updatedAt = Date.now();
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      completed: this.completed,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromJSON(json) {
    const task = new Task(json.title);
    task.id = json.id;
    task.completed = json.completed;
    task.createdAt = json.createdAt;
    task.updatedAt = json.updatedAt;
    return task;
  }
}
```

### QuickLink
```javascript
class QuickLink {
  constructor(name, url) {
    this.id = generateUUID();
    this.name = name.trim();
    this.url = this.validateAndFormatUrl(url);
    this.createdAt = Date.now();
  }

  validateAndFormatUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.href;
    } catch {
      throw new Error(`Invalid URL: ${url}`);
    }
  }

  update(name, url) {
    this.name = name.trim();
    this.url = this.validateAndFormatUrl(url);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      url: this.url,
      createdAt: this.createdAt
    };
  }

  static fromJSON(json) {
    const link = new QuickLink(json.name, json.url);
    link.id = json.id;
    link.createdAt = json.createdAt;
    return link;
  }
}
```

### UserPreferences
```javascript
class UserPreferences {
  constructor() {
    this.name = "";
    this.timerDuration = 25; // minutes
    this.sortPreference = "completion";
    this.theme = "light";
    this.use24HourFormat = false;
  }

  toJSON() {
    return {
      name: this.name,
      timerDuration: this.timerDuration,
      sortPreference: this.sortPreference,
      theme: this.theme,
      use24HourFormat: this.use24HourFormat
    };
  }

  static fromJSON(json) {
    const prefs = new UserPreferences();
    Object.assign(prefs, json);
    return prefs;
  }
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Time Update Frequency

*For any* dashboard session, when one minute passes, the time display shall update exactly once, and the greeting shall update only when crossing a time boundary (05:00, 12:00, 18:00, 22:00).

**Validates: Requirements 1.5, 1.6, 2.5**

### Property 2: Greeting Mapping

*For any* hour value (0-23), the returned greeting shall correspond to the correct time range: hours 5-11 return "Good Morning", hours 12-17 return "Good Afternoon", hours 18-21 return "Good Evening", hours 22-4 return "Good Night".

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 3: Name Greeting Round-Trip

*For any* custom name string, storing it, clearing the page, and retrieving it shall produce the identical name in the greeting display.

**Validates: Requirements 3.2, 3.3, 3.4**

### Property 4: Timer Countdown Invariant

*For any* positive starting time value N, starting the timer and allowing it to run shall decrement the displayed value by exactly 1 every second until reaching 00:00, and the total elapsed time shall equal N seconds.

**Validates: Requirements 5.2, 5.3, 5.6**

### Property 5: Pause and Resume Idempotence

*For any* running timer at time T, pausing it, resuming it, pausing it again, and resuming it again shall result in the same remaining time as if the timer had never been paused.

**Validates: Requirement 6.2, 6.4**

### Property 6: Reset to Default

*For any* timer state (running, paused, or idle) and any current remaining time value, clicking Reset shall return the timer display to the default configured duration (25:00 or custom value).

**Validates: Requirement 7.1**

### Property 7: Timer Duration Round-Trip

*For any* valid positive integer duration D entered as a custom timer duration, storing it, loading the page, and starting a new session shall initialize the timer to D:00.

**Validates: Requirement 8.3, 8.4**

### Property 8: Task Addition Grows List

*For any* task list of size N and any valid non-empty task title, adding the task shall result in a list of size N+1 containing all original tasks plus the new task.

**Validates: Requirement 10.2, 10.3**

### Property 9: Empty Task Rejection

*For any* input that is empty or contains only whitespace, attempting to add it as a task shall not increase the list size, and the list shall remain unchanged.

**Validates: Requirement 10.6**

### Property 10: Duplicate Task Prevention

*For any* task list and any task title that exists in that list (case-insensitive), attempting to add a new task with that same title shall not increase the list size.

**Validates: Requirement 11.1, 11.5**

### Property 11: Task Completion Toggle Idempotence

*For any* task, toggling its completion status twice shall return it to its original completion status, and the task list size shall remain constant.

**Validates: Requirement 13.1, 13.5**

### Property 12: Completion Status Persistence

*For any* task marked as complete, storing the tasks, reloading the page, and retrieving the tasks shall preserve the completion status.

**Validates: Requirement 13.6**

### Property 13: Task Edit Round-Trip

*For any* task with original title T1, editing it to title T2, storing, reloading, and retrieving shall preserve T2 as the task's title.

**Validates: Requirement 14.3**

### Property 14: Task Deletion Reduces Count

*For any* task list of size N, deleting a single task shall result in a list of size N-1, and all other tasks shall remain unchanged.

**Validates: Requirement 15.2**

### Property 15: Sorted List Completeness

*For any* task list sorted by any criteria (completion, date, alphabetical), the sorted list shall contain the same tasks as the original, with no tasks added or removed.

**Validates: Requirement 16.2**

### Property 16: Quick Link Addition

*For any* valid quick link with name and valid URL, adding it shall increase the quick link list size by 1 and make the link clickable from the dashboard.

**Validates: Requirement 17.3, 17.4**

### Property 17: Quick Link URL Validation

*For any* URL string that does not start with `http://` or `https://` or fails URL parsing, attempting to add it as a quick link shall not increase the list size.

**Validates: Requirement 17.2**

### Property 18: Quick Link Edit Round-Trip

*For any* quick link with original URL U1, editing it to URL U2, storing, reloading, and retrieving shall result in the link opening U2 when clicked.

**Validates: Requirement 19.3, 19.5**

### Property 19: Quick Link Deletion

*For any* quick link list of size N, deleting a single link shall result in a list of size N-1, with all other links unchanged and still clickable.

**Validates: Requirement 20.2**

### Property 20: Data Persistence Round-Trip

*For any* user data (tasks, quick links, preferences), storing it to Local Storage, clearing the page cache, and retrieving it shall produce equivalent data structures matching the original.

**Validates: Requirement 21.1, 21.2**

### Property 21: Theme Toggle Idempotence

*For any* theme (light or dark), applying it, reloading the page, applying the opposite theme, reloading again, and reapplying the original theme shall result in the same visual appearance as the first application.

**Validates: Requirement 22.4, 22.5**

---

## Error Handling and Validation

### Input Validation Strategy

All user inputs are validated at the point of entry before being processed:

```javascript
// Task Title Validation
function validateTaskTitle(title) {
  if (!title || typeof title !== 'string') {
    return { valid: false, error: 'Task title must be a non-empty string' };
  }
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Task title cannot be only whitespace' };
  }
  if (trimmed.length > 200) {
    return { valid: false, error: 'Task title cannot exceed 200 characters' };
  }
  return { valid: true, value: trimmed };
}

// URL Validation
function validateUrl(url) {
  try {
    new URL(url);
    return { valid: true, value: url };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

// Timer Duration Validation
function validateTimerDuration(minutes) {
  const num = parseInt(minutes, 10);
  if (isNaN(num)) {
    return { valid: false, error: 'Duration must be a number' };
  }
  if (num <= 0) {
    return { valid: false, error: 'Duration must be greater than 0' };
  }
  if (num > 60) {
    return { valid: false, error: 'Duration cannot exceed 60 minutes' };
  }
  return { valid: true, value: num };
}
```

### Error States and Recovery

```javascript
// Storage Unavailability Handler
const StorageEngine = {
  isAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      console.warn('Local Storage unavailable - using in-memory cache only');
      return false;
    }
  },

  fallback: {
    tasks: [],
    quickLinks: [],
    preferences: new UserPreferences()
  },

  save(key, data) {
    if (this.isAvailable()) {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
        if (e.name === 'QuotaExceededError') {
          console.warn('Local Storage quota exceeded');
          this.showStorageWarning();
        }
      }
    }
    // Update in-memory cache regardless
    this.fallback[key] = data;
  }
};

// Data Corruption Handler
function deserializeWithFallback(json, defaultValue) {
  try {
    return JSON.parse(json);
  } catch (e) {
    console.error('Failed to parse stored data:', e);
    return defaultValue;
  }
}

// Duplicate Prevention with Error Message
function checkAndPreventDuplicate(title, existingTasks) {
  const isDuplicate = existingTasks.some(task => 
    task.title.toLowerCase() === title.toLowerCase()
  );
  
  if (isDuplicate) {
    showNotification({
      type: 'warning',
      message: `Task "${title}" already exists`,
      duration: 3000
    });
    return false;
  }
  return true;
}
```

---

## State Management

### Global Application State

```javascript
class AppState {
  constructor() {
    this.tasks = [];
    this.quickLinks = [];
    this.preferences = new UserPreferences();
    this.timerState = {
      currentTime: 25 * 60, // seconds
      isRunning: false,
      isPaused: false,
      intervalId: null
    };
    this.uiState = {
      theme: 'light',
      showEditModal: false,
      editingTaskId: null,
      editingLinkId: null,
      selectedSortMethod: 'completion'
    };
  }

  // Update methods trigger UI re-render
  setTasks(tasks) {
    this.tasks = tasks;
    this.notifyListeners('tasks-updated');
  }

  addListener(event, callback) {
    if (!this._listeners) this._listeners = {};
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  }

  notifyListeners(event) {
    if (this._listeners && this._listeners[event]) {
      this._listeners[event].forEach(cb => cb());
    }
  }
}

const appState = new AppState();
```

### Preventing State Mutations

All state updates follow immutability patterns:

```javascript
// Instead of mutating the state directly:
// ❌ appState.tasks[0].completed = true;

// Use update methods:
// ✅ appState.tasks = appState.tasks.map(task => 
//   task.id === targetId ? {...task, completed: !task.completed} : task
// );
```

---

## Theme System

### CSS Custom Properties (Variables)

```css
:root {
  /* Light Theme (default) */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --accent: #007bff;
  --accent-hover: #0056b3;
  --border: #e0e0e0;
  --success: #28a745;
  --warning: #ffc107;
  --error: #dc3545;
}

[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2a2a2a;
  --text-primary: #ffffff;
  --text-secondary: #aaaaaa;
  --accent: #4da3ff;
  --accent-hover: #2d7acc;
  --border: #444444;
  --success: #4caf50;
  --warning: #ff9800;
  --error: #f44336;
}
```

### Theme Toggle Implementation

```javascript
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  StorageEngine.save('dashboard:theme', newTheme);
  
  // Trigger re-render of theme-dependent components
  appState.notifyListeners('theme-changed');
}

function initializeTheme() {
  const saved = StorageEngine.load('dashboard:theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}
```

---

## Performance Optimization

### 1. DOM Optimization

```javascript
// Batch DOM updates using DocumentFragment
function renderTaskList(tasks) {
  const fragment = document.createDocumentFragment();
  
  tasks.forEach(task => {
    const li = createTaskElement(task);
    fragment.appendChild(li);
  });
  
  const taskList = document.getElementById('taskList');
  taskList.innerHTML = ''; // Clear once
  taskList.appendChild(fragment); // Append all at once
}

// Use event delegation for large lists
document.getElementById('taskList').addEventListener('click', (e) => {
  if (e.target.classList.contains('task-checkbox')) {
    const taskId = e.target.closest('[data-task-id]').dataset.taskId;
    handleTaskToggle(taskId);
  }
});
```

### 2. Timer Efficiency

```javascript
// Only update DOM when value changes
let lastDisplayedTime = null;

function updateTimerDisplay() {
  const displayValue = getDisplayValue(); // e.g., "24:59"
  
  if (displayValue !== lastDisplayedTime) {
    document.getElementById('timerDisplay').textContent = displayValue;
    lastDisplayedTime = displayValue;
  }
}
```

### 3. Storage Debouncing

```javascript
// Debounce storage writes to avoid excessive I/O
const saveDebounce = (() => {
  let timeoutId = null;
  return (key, data) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      StorageEngine.save(key, data);
    }, 500); // Wait 500ms after last change
  };
})();

// Usage:
function handleTaskEdit(id, newTitle) {
  const updated = appState.tasks.map(t => 
    t.id === id ? {...t, title: newTitle} : t
  );
  appState.setTasks(updated);
  saveDebounce('dashboard:tasks', updated);
}
```

### 4. Memory Efficiency

```javascript
// Use WeakMap for object references (automatic garbage collection)
const domCache = new WeakMap();

function getCachedElement(task) {
  if (!domCache.has(task)) {
    domCache.set(task, createTaskElement(task));
  }
  return domCache.get(task);
}

// Clean up intervals on page unload
window.addEventListener('beforeunload', () => {
  if (appState.timerState.intervalId) {
    clearInterval(appState.timerState.intervalId);
  }
});
```

---

## Testing Strategy

### Property-Based Testing Approach

Property-based tests validate correctness properties using randomized inputs. This dashboard is suitable for PBT because:

1. **Pure Functions**: Data transformation logic (sorting, filtering, validation)
2. **Deterministic Behavior**: Time calculations, timer countdown, data serialization
3. **High-Value Coverage**: Properties catch edge cases systematically

### Unit Test Examples (Property-Based)

```javascript
// Property Test 1: Timer Countdown Invariant
describe('Property: Timer Countdown', () => {
  it('should decrement by exactly 1 second per tick', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 60 }), (startMinutes) => {
        const timer = new FocusTimer(startMinutes * 60);
        const startTime = timer.getCurrentTime();
        
        timer.tick();
        const afterTick = timer.getCurrentTime();
        
        expect(startTime - afterTick).toBe(1);
      }),
      { numRuns: 100 }
    );
  });
});

// Property Test 2: Task Addition Grows List
describe('Property: Task List Growth', () => {
  it('should grow list size by exactly 1 when adding valid task', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({title: fc.string()})),
        fc.string({ minLength: 1 })
      ),
      (existingTasks, newTaskTitle) => {
        const manager = new ToDoManager();
        existingTasks.forEach(t => manager.addTask(t.title));
        const initialSize = manager.getTasks().length;
        
        manager.addTask(newTaskTitle);
        
        expect(manager.getTasks().length).toBe(initialSize + 1);
      }),
      { numRuns: 100 }
    );
  });
});

// Property Test 3: Data Persistence Round-Trip
describe('Property: Storage Round-Trip', () => {
  it('should deserialize to equivalent structure', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string(),
            completed: fc.boolean(),
            createdAt: fc.integer()
          }),
          { minLength: 0, maxLength: 20 }
        )
      ),
      (tasks) => {
        const serialized = JSON.stringify(tasks);
        const deserialized = JSON.parse(serialized);
        
        expect(deserialized).toEqual(tasks);
      }),
      { numRuns: 100 }
    );
  });
});
```

### Integration Test Examples

```javascript
// Integration Test 1: Full Add-Edit-Delete Workflow
describe('Integration: Task CRUD Workflow', () => {
  it('should create, modify, and delete task successfully', () => {
    const manager = new ToDoManager();
    
    // Create
    const task = manager.addTask('Buy groceries');
    expect(manager.getTasks()).toHaveLength(1);
    
    // Edit
    manager.editTask(task.id, 'Buy groceries and cook');
    expect(manager.getTasks()[0].title).toBe('Buy groceries and cook');
    
    // Delete
    manager.deleteTask(task.id);
    expect(manager.getTasks()).toHaveLength(0);
  });
});

// Integration Test 2: Theme Persistence
describe('Integration: Theme Persistence', () => {
  it('should save and restore theme preference', () => {
    const engine = new StorageEngine();
    
    // Save
    engine.save('dashboard:theme', 'dark');
    
    // Restore
    const restored = engine.load('dashboard:theme');
    expect(restored).toBe('dark');
  });
});

// Integration Test 3: Timer Notification
describe('Integration: Timer Completion', () => {
  it('should trigger notification when reaching 00:00', async () => {
    const timer = new FocusTimer(1); // 1 second
    const notificationSpy = jest.fn();
    
    timer.onCompletion = notificationSpy;
    timer.start();
    
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    expect(notificationSpy).toHaveBeenCalled();
    expect(timer.getDisplayValue()).toBe('01:00'); // Reset
  });
});
```

### UI/Visual Regression Tests

```javascript
// Snapshot Test Example
describe('UI: Task List Rendering', () => {
  it('should render task list matching snapshot', () => {
    const tasks = [
      { id: '1', title: 'Task 1', completed: false },
      { id: '2', title: 'Task 2', completed: true }
    ];
    
    const html = renderTaskList(tasks);
    expect(html).toMatchSnapshot();
  });
});
```

### Performance Benchmarks

```javascript
// Benchmark: DOM Update Speed
describe('Performance: DOM Updates', () => {
  it('should update 1000 tasks in less than 100ms', () => {
    const tasks = Array.from({ length: 1000 }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i}`,
      completed: false
    }));
    
    const start = performance.now();
    renderTaskList(tasks);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(100);
  });
});
```

---

## Module File Structure

```
dashboard/
├── index.html                    # Single HTML file
├── src/
│   ├── styles/
│   │   ├── main.css             # Global styles
│   │   ├── components.css       # Component styles
│   │   ├── theme.css            # Theme variables
│   │   └── responsive.css       # Media queries
│   ├── modules/
│   │   ├── clock-manager.js     # Time display logic
│   │   ├── focus-timer.js       # Pomodoro timer logic
│   │   ├── todo-manager.js      # Task CRUD operations
│   │   ├── quick-link-manager.js # Link CRUD operations
│   │   ├── storage-engine.js    # Local Storage abstraction
│   │   ├── ui-controller.js     # DOM rendering & events
│   │   └── app-state.js         # Global state management
│   └── main.js                  # Entry point & initialization
├── tests/
│   ├── unit/
│   │   ├── clock-manager.test.js
│   │   ├── focus-timer.test.js
│   │   ├── todo-manager.test.js
│   │   ├── storage-engine.test.js
│   │   └── ...
│   ├── integration/
│   │   └── full-workflow.test.js
│   └── ui/
│       └── snapshots/
├── .gitignore
├── package.json                 # Dependencies (testing only)
└── README.md
```

---

## API Function Signatures

### Clock Manager

```javascript
interface ClockManager {
  getCurrentTime(): {
    hours: number;
    minutes: number;
    seconds: number;
    date: Date;
    dayOfWeek: string;
  };

  getGreeting(hours: number): string;
  // Returns: "Good Morning" | "Good Afternoon" | "Good Evening" | "Good Night"

  formatTime(hours: number, minutes: number): string;
  // Returns: "10:30" or "22:30" based on 24-hour format

  formatDate(date: Date): string;
  // Returns: "Monday, January 15, 2024"

  startTimeUpdater(callback: (time: string) => void): number;
  // Returns: intervalId for cleanup

  stopTimeUpdater(intervalId: number): void;
}
```

### Focus Timer

```javascript
interface FocusTimer {
  initialize(customDuration?: number): void;
  // Initializes with custom or default 25 minutes

  start(): void;
  // Begins countdown

  pause(): void;
  // Pauses countdown

  resume(): void;
  // Resumes from paused state

  reset(): void;
  // Returns to default duration

  setCustomDuration(minutes: number): { valid: boolean; error?: string };
  // Validates and sets new default

  tick(): void;
  // Called by interval to decrement by 1 second

  getDisplayValue(): string;
  // Returns: "25:00" format

  getState(): {
    currentTime: number;
    isRunning: boolean;
    isPaused: boolean;
  };

  onCompletion: (() => void) | null;
  // Callback when timer reaches 00:00
}
```

### To-Do Manager

```javascript
interface ToDoManager {
  addTask(title: string): Task | null;
  // Returns created Task or null if validation fails

  editTask(id: string, newTitle: string): { success: boolean; error?: string };

  deleteTask(id: string): boolean;

  toggleComplete(id: string): void;

  getTasks(sortBy?: 'completion' | 'date' | 'alphabetical'): Task[];

  sortTasks(criteria: string): void;

  getTaskById(id: string): Task | undefined;

  checkDuplicate(title: string, excludeId?: string): boolean;

  validateTitle(title: string): { valid: boolean; error?: string };

  clear(): void;
  // Removes all tasks
}
```

### Quick Link Manager

```javascript
interface QuickLinkManager {
  addLink(name: string, url: string): QuickLink | null;

  editLink(id: string, name: string, url: string): { success: boolean; error?: string };

  deleteLink(id: string): boolean;

  getLinks(): QuickLink[];

  getLinkById(id: string): QuickLink | undefined;

  openLink(id: string): void;
  // Opens URL in new tab

  validateUrl(url: string): { valid: boolean; error?: string };

  clear(): void;
  // Removes all links
}
```

### Storage Engine

```javascript
interface StorageEngine {
  save(key: string, data: any): void;

  load(key: string): any | null;

  remove(key: string): void;

  clear(): void;
  // Clears all dashboard data

  isAvailable(): boolean;

  getCurrentSize(): number;
  // Returns bytes used

  export(): string;
  // Returns JSON export of all data

  import(json: string): { success: boolean; error?: string };
}
```

### UI Controller

```javascript
interface UIController {
  initialize(): Promise<void>;
  // Loads data and performs initial render

  render(): void;
  // Full dashboard re-render

  renderTimeDisplay(time: string, date: string): void;

  renderGreeting(greeting: string, name?: string): void;

  renderTimer(displayValue: string, state: 'idle' | 'running' | 'paused'): void;

  renderTaskList(tasks: Task[]): void;

  renderQuickLinks(links: QuickLink[]): void;

  updateTheme(theme: 'light' | 'dark'): void;

  showNotification(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;

  showConfirmDialog(message: string): Promise<boolean>;

  addEventListeners(): void;

  enableButton(selector: string): void;

  disableButton(selector: string): void;
}
```

---

## Responsive Design Breakpoints

```css
/* Mobile First Approach */

/* Default: Mobile (< 576px) */
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Tablet (≥ 576px) */
@media (min-width: 576px) {
  .dashboard {
    gap: 2rem;
  }
  
  .section-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }
}

/* Desktop (≥ 992px) */
@media (min-width: 992px) {
  .dashboard {
    max-width: 1200px;
    margin: 0 auto;
    grid-template-columns: 1fr 1fr 1fr;
  }
  
  .timer-section {
    grid-column: 1 / 2;
  }
  
  .todo-section {
    grid-column: 2 / 3;
  }
  
  .quick-links-section {
    grid-column: 3 / 4;
  }
}

/* Large Desktop (≥ 1200px) */
@media (min-width: 1200px) {
  .dashboard {
    max-width: 1400px;
  }
}
```

---

## Local Storage Schema Reference

```javascript
// Complete Local Storage state for reference
{
  "dashboard:tasks": [
    {
      "id": "uuid-1",
      "title": "Buy groceries",
      "completed": false,
      "createdAt": 1705329600000,
      "updatedAt": 1705329600000
    },
    {
      "id": "uuid-2",
      "title": "Finish project",
      "completed": true,
      "createdAt": 1705243200000,
      "updatedAt": 1705329600000
    }
  ],
  "dashboard:quickLinks": [
    {
      "id": "link-1",
      "name": "GitHub",
      "url": "https://github.com",
      "createdAt": 1705329600000
    }
  ],
  "dashboard:userName": "Alex",
  "dashboard:timerDuration": 25,
  "dashboard:sortPreference": "completion",
  "dashboard:theme": "light",
  "dashboard:use24HourFormat": false
}
```

---

## Development Workflow

### Local Development

```bash
# Install testing dependencies only (no build tools needed)
npm install --save-dev jest fast-check

# Run tests
npm test

# Run specific test file
npm test -- clock-manager.test.js

# Run with coverage
npm test -- --coverage

# Watch mode (re-run on file changes)
npm test -- --watch
```

### Build for Production (Optional Minification)

```bash
# For GitHub Pages, static files can be served directly
# Optional: Use npm script to minify CSS/JS
npm run build

# Output: dist/ folder ready for deployment
```

### GitHub Pages Deployment

```bash
# Commit changes
git add .
git commit -m "Feature: Add timer functionality"

# Push to main
git push origin main

# Deploy to GitHub Pages (configured in .github/workflows/)
# or manual: Push to gh-pages branch
git push origin main:gh-pages
```

---

## Accessibility (WCAG 2.1 AA)

### Semantic HTML
- Use `<header>`, `<section>`, `<footer>` for structure
- Use `<button>` for interactive elements, never `<div onclick>`
- Use `<label>` for form inputs
- Use proper heading hierarchy (`<h1>`, `<h2>`, etc.)

### ARIA Attributes
```html
<!-- Timer button states -->
<button id="btnStart" aria-label="Start timer" aria-pressed="false">Start</button>

<!-- Live regions for dynamic updates -->
<div id="timerDisplay" aria-live="polite" aria-atomic="true">25:00</div>

<!-- Task list item -->
<li data-task-id="123">
  <input type="checkbox" id="task-123" aria-label="Mark 'Buy groceries' as complete">
  <label for="task-123">Buy groceries</label>
</li>
```

### Keyboard Navigation
- All interactive elements accessible via Tab key
- Buttons respond to Enter/Space keys
- Escape key closes modals
- Focus visible with outline

### Color Contrast
- All text: minimum 4.5:1 contrast ratio
- Ensure light/dark modes both meet AA standards

---

## Future Enhancements

1. **Recurring Tasks**: Support repeating tasks (daily, weekly)
2. **Task Categories**: Organize tasks with custom categories
3. **Export/Import**: CSV or JSON data export
4. **Sync**: Cloud sync across multiple devices
5. **Mobile App**: React Native version with offline support
6. **Notifications**: Browser push notifications for timer
7. **Analytics**: Track productivity metrics
8. **Collaboration**: Share tasks with others (via link)

---

## Conclusion

This technical design provides a complete roadmap for implementing the To-Do List Life Dashboard with vanilla JavaScript. The modular architecture, comprehensive error handling, and property-based testing strategy ensure the application is robust, maintainable, and performant. The design balances simplicity with functionality, making it suitable for both learning and production use.
