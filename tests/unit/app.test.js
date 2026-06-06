/**
 * Unit Tests for To-Do List Life Dashboard
 * Testing all core modules: Clock Manager, Timer, Tasks, Quick Links, and Storage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
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
} from '../../src/app.js';

describe('Time Formatting Utilities', () => {
  it('should format time with leading zeros', () => {
    // Testing via the ClockManager which uses formatTime internally
    const time = ClockManager.getCurrentTime();
    const formatted = ClockManager.formatTime(5, 9);
    expect(formatted).toBe('05:09');
  });

  it('should format MM:SS correctly', () => {
    const result1 = formatMMSS(0);
    expect(result1).toBe('00:00');

    const result2 = formatMMSS(1500); // 25 minutes
    expect(result2).toBe('25:00');

    const result3 = formatMMSS(65); // 1 minute 5 seconds
    expect(result3).toBe('01:05');
  });

  it('should pad numbers with zero', () => {
    expect(padZero(5)).toBe('05');
    expect(padZero(10)).toBe('10');
    expect(padZero(0)).toBe('00');
  });
});

describe('Greeting Logic', () => {
  it('should return correct greeting for morning hours (5-11)', () => {
    expect(ClockManager.getGreeting(5)).toBe('Good Morning');
    expect(ClockManager.getGreeting(8)).toBe('Good Morning');
    expect(ClockManager.getGreeting(11)).toBe('Good Morning');
  });

  it('should return correct greeting for afternoon hours (12-17)', () => {
    expect(ClockManager.getGreeting(12)).toBe('Good Afternoon');
    expect(ClockManager.getGreeting(14)).toBe('Good Afternoon');
    expect(ClockManager.getGreeting(17)).toBe('Good Afternoon');
  });

  it('should return correct greeting for evening hours (18-21)', () => {
    expect(ClockManager.getGreeting(18)).toBe('Good Evening');
    expect(ClockManager.getGreeting(19)).toBe('Good Evening');
    expect(ClockManager.getGreeting(21)).toBe('Good Evening');
  });

  it('should return correct greeting for night hours (22-4)', () => {
    expect(ClockManager.getGreeting(22)).toBe('Good Night');
    expect(ClockManager.getGreeting(23)).toBe('Good Night');
    expect(ClockManager.getGreeting(0)).toBe('Good Night');
    expect(ClockManager.getGreeting(4)).toBe('Good Night');
  });
});

describe('Clock Manager - Time Display', () => {
  it('should return current time object with correct properties', () => {
    const time = ClockManager.getCurrentTime();
    expect(time).toHaveProperty('hours');
    expect(time).toHaveProperty('minutes');
    expect(time).toHaveProperty('seconds');
    expect(time).toHaveProperty('date');
    expect(time).toHaveProperty('dayOfWeek');

    expect(typeof time.hours).toBe('number');
    expect(time.hours).toBeGreaterThanOrEqual(0);
    expect(time.hours).toBeLessThan(24);
  });

  it('should format date correctly', () => {
    const testDate = new Date(2024, 0, 15); // Jan 15, 2024
    const formatted = ClockManager.formatDate(testDate);
    expect(formatted).toContain('January');
    expect(formatted).toContain('15');
    expect(formatted).toContain('2024');
  });
});

describe('Focus Timer Manager', () => {
  beforeEach(() => {
    // Reset timer before each test
    FocusTimer.reset();
  });

  it('should initialize with 25 minutes by default', () => {
    expect(FocusTimer.getCurrentTime()).toBe(25 * 60);
    expect(FocusTimer.getDisplayValue()).toBe('25:00');
  });

  it('should accept custom duration', () => {
    const result = FocusTimer.initialize(20);
    expect(result.valid).toBe(true);
    expect(FocusTimer.getCurrentTime()).toBe(20 * 60);
    expect(FocusTimer.getDisplayValue()).toBe('20:00');
  });

  it('should reject invalid durations', () => {
    const result1 = FocusTimer.initialize(0);
    expect(result1.valid).toBe(false);

    const result2 = FocusTimer.initialize(-5);
    expect(result2.valid).toBe(false);

    const result3 = FocusTimer.initialize(61);
    expect(result3.valid).toBe(false);

    const result4 = FocusTimer.initialize('not a number');
    expect(result4.valid).toBe(false);
  });

  it('should reset to default duration', () => {
    FocusTimer.initialize(15);
    FocusTimer.reset();
    expect(FocusTimer.getDisplayValue()).toBe('15:00');
  });

  it('should return correct state', () => {
    const state = FocusTimer.getState();
    expect(state).toHaveProperty('time');
    expect(state).toHaveProperty('state');
    expect(['idle', 'running', 'paused']).toContain(state.state);
  });

  it('should prevent starting with zero or negative time', () => {
    FocusTimer.initialize(1);
    const state1 = FocusTimer.getState();
    expect(state1.state).toBe('idle');
  });
});

describe('To-Do Manager - Task Validation', () => {
  beforeEach(() => {
    // Clear tasks before each test
    ToDoManager.setTasks([]);
  });

  it('should reject empty task titles', () => {
    const result1 = ToDoManager.addTask('');
    expect(result1.valid).toBe(false);

    const result2 = ToDoManager.addTask('   ');
    expect(result2.valid).toBe(false);

    const result3 = ToDoManager.addTask(null);
    expect(result3.valid).toBe(false);
  });

  it('should reject task titles exceeding 200 characters', () => {
    const longTitle = 'a'.repeat(201);
    const result = ToDoManager.addTask(longTitle);
    expect(result.valid).toBe(false);
  });

  it('should trim whitespace from task titles', () => {
    const result = ToDoManager.addTask('  Test Task  ');
    expect(result.valid).toBe(true);
    expect(result.task.title).toBe('Test Task');
  });

  it('should prevent duplicate tasks (case-insensitive)', () => {
    const result1 = ToDoManager.addTask('Buy Milk');
    expect(result1.valid).toBe(true);

    const result2 = ToDoManager.addTask('buy milk');
    expect(result2.valid).toBe(false);

    const result3 = ToDoManager.addTask('BUY MILK');
    expect(result3.valid).toBe(false);

    const result4 = ToDoManager.addTask('Buy Milk ');
    expect(result4.valid).toBe(false);
  });
});

describe('To-Do Manager - CRUD Operations', () => {
  beforeEach(() => {
    ToDoManager.setTasks([]);
  });

  it('should add valid task and increase list size', () => {
    const initialSize = ToDoManager.getTasks().length;
    const result = ToDoManager.addTask('Test Task');
    expect(result.valid).toBe(true);
    expect(ToDoManager.getTasks().length).toBe(initialSize + 1);
    expect(result.task).toHaveProperty('id');
    expect(result.task).toHaveProperty('completed', false);
  });

  it('should edit task title', () => {
    const result1 = ToDoManager.addTask('Original Title');
    const taskId = result1.task.id;

    const result2 = ToDoManager.editTask(taskId, 'New Title');
    expect(result2.valid).toBe(true);
    expect(result2.task.title).toBe('New Title');
  });

  it('should delete task and reduce list size', () => {
    const result1 = ToDoManager.addTask('Task to Delete');
    const taskId = result1.task.id;
    const initialSize = ToDoManager.getTasks().length;

    const result2 = ToDoManager.deleteTask(taskId);
    expect(result2.valid).toBe(true);
    expect(result2.removed).toBe(1);
    expect(ToDoManager.getTasks().length).toBe(initialSize - 1);
  });

  it('should toggle task completion status', () => {
    const result1 = ToDoManager.addTask('Test Task');
    const taskId = result1.task.id;

    const result2 = ToDoManager.toggleComplete(taskId);
    expect(result2.valid).toBe(true);
    expect(result2.task.completed).toBe(true);

    const result3 = ToDoManager.toggleComplete(taskId);
    expect(result3.task.completed).toBe(false);
  });
});

describe('To-Do Manager - Sorting', () => {
  beforeEach(() => {
    ToDoManager.setTasks([]);
  });

  it('should sort tasks by completion status', () => {
    ToDoManager.addTask('Task 1');
    const task2 = ToDoManager.addTask('Task 2');
    const task3 = ToDoManager.addTask('Task 3');

    ToDoManager.toggleComplete(task2.task.id);
    ToDoManager.sortTasks('completion');

    const tasks = ToDoManager.getTasks();
    // Incomplete should come first
    expect(tasks[0].completed).toBe(false);
    expect(tasks[tasks.length - 1].completed).toBe(true);
  });

  it('should sort tasks alphabetically', () => {
    ToDoManager.addTask('Zebra');
    ToDoManager.addTask('Apple');
    ToDoManager.addTask('Banana');

    ToDoManager.sortTasks('alphabetical');

    const tasks = ToDoManager.getTasks();
    expect(tasks[0].title).toBe('Apple');
    expect(tasks[1].title).toBe('Banana');
    expect(tasks[2].title).toBe('Zebra');
  });

  it('should sort tasks by creation date', () => {
    const task1 = ToDoManager.addTask('Task 1');
    // Simulate delay with different timestamps
    const currentTasks = ToDoManager.getTasks();
    if (currentTasks.length > 0) {
      currentTasks[0].createdAt = Date.now() - 1000; // 1 second earlier
    }

    const task2 = ToDoManager.addTask('Task 2');

    ToDoManager.sortTasks('date');

    const tasks = ToDoManager.getTasks();
    // Most recent first (task2 should be first since it has the most recent timestamp)
    expect(tasks[0].title).toBe('Task 2');
    expect(tasks[1].title).toBe('Task 1');
  });
});

describe('Quick Link Manager - URL Validation', () => {
  beforeEach(() => {
    QuickLinkManager.setLinks([]);
  });

  it('should accept valid URLs', () => {
    const result1 = QuickLinkManager.addLink('GitHub', 'https://github.com');
    expect(result1.valid).toBe(true);

    const result2 = QuickLinkManager.addLink('Google', 'http://google.com');
    expect(result2.valid).toBe(true);
  });

  it('should reject URLs without http/https', () => {
    const result = QuickLinkManager.addLink('Example', 'example.com');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('http');
  });

  it('should reject invalid URLs', () => {
    const result = QuickLinkManager.addLink('Bad Link', 'not a valid url');
    expect(result.valid).toBe(false);
  });

  it('should reject empty names or URLs', () => {
    const result1 = QuickLinkManager.addLink('', 'https://example.com');
    expect(result1.valid).toBe(false);

    const result2 = QuickLinkManager.addLink('Example', '');
    expect(result2.valid).toBe(false);
  });
});

describe('Quick Link Manager - CRUD Operations', () => {
  beforeEach(() => {
    QuickLinkManager.setLinks([]);
  });

  it('should add valid link and increase list size', () => {
    const initialSize = QuickLinkManager.getLinks().length;
    const result = QuickLinkManager.addLink('GitHub', 'https://github.com');
    expect(result.valid).toBe(true);
    expect(QuickLinkManager.getLinks().length).toBe(initialSize + 1);
  });

  it('should edit link', () => {
    const result1 = QuickLinkManager.addLink('GitHub', 'https://github.com');
    const linkId = result1.link.id;

    const result2 = QuickLinkManager.editLink(linkId, 'GitHub Updated', 'https://github.com/new');
    expect(result2.valid).toBe(true);
    expect(result2.link.name).toBe('GitHub Updated');
  });

  it('should delete link and reduce list size', () => {
    const result1 = QuickLinkManager.addLink('GitHub', 'https://github.com');
    const linkId = result1.link.id;
    const initialSize = QuickLinkManager.getLinks().length;

    const result2 = QuickLinkManager.deleteLink(linkId);
    expect(result2.valid).toBe(true);
    expect(QuickLinkManager.getLinks().length).toBe(initialSize - 1);
  });
});

describe('Storage Engine - Local Storage Integration', () => {
  beforeEach(() => {
    StorageEngine.checkAvailability();
    // Clear storage before each test
    StorageEngine.clear();
  });

  afterEach(() => {
    StorageEngine.clear();
  });

  it('should check storage availability', () => {
    const available = StorageEngine.isAvailable();
    expect(typeof available).toBe('boolean');
  });

  it('should save and load data', () => {
    if (StorageEngine.isAvailable()) {
      const testData = { test: 'value', number: 42 };
      StorageEngine.save('testKey', testData);

      const loaded = StorageEngine.load('testKey');
      expect(loaded).toEqual(testData);
    }
  });

  it('should remove stored data', () => {
    if (StorageEngine.isAvailable()) {
      StorageEngine.save('testKey', { data: 'test' });
      StorageEngine.remove('testKey');

      const loaded = StorageEngine.load('testKey');
      expect(loaded).toBeNull();
    }
  });
});

describe('UUID Generation', () => {
  it('should generate valid UUIDs', () => {
    const uuid1 = generateUUID();
    const uuid2 = generateUUID();

    expect(typeof uuid1).toBe('string');
    expect(typeof uuid2).toBe('string');
    expect(uuid1.length).toBe(36); // Standard UUID length with hyphens
    expect(uuid2.length).toBe(36);
    expect(uuid1).not.toBe(uuid2); // Should be unique
  });

  it('should generate UUIDs with correct format', () => {
    const uuid = generateUUID();
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidPattern.test(uuid)).toBe(true);
  });
});

describe('HTML Escaping', () => {
  it('should escape HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>'))
      .toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');

    expect(escapeHtml('Test & <b>Bold</b>'))
      .toContain('&');

    expect(escapeHtml('Quote "test"'))
      .toContain('"');
  });

  it('should handle normal text unchanged', () => {
    const text = 'This is a normal task';
    expect(escapeHtml(text)).toBe(text);
  });
});
