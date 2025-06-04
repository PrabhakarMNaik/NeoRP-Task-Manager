// Version 8 - Application constants

export const COLUMNS = [
  { 
    id: 'backlog', 
    title: 'Backlog', 
    color: 'bg-amber-500', 
    count: 0,
    description: 'Ideas and future tasks'
  },
  { 
    id: 'planned', 
    title: 'Planned', 
    color: 'bg-blue-500', 
    count: 0,
    description: 'Tasks ready to start'
  },
  { 
    id: 'in-progress', 
    title: 'In Progress', 
    color: 'bg-orange-500', 
    count: 0,
    description: 'Currently working on'
  },
  { 
    id: 'under-review', 
    title: 'Under Review', 
    color: 'bg-purple-500', 
    count: 0,
    description: 'Awaiting feedback'
  },
  { 
    id: 'completed', 
    title: 'Completed', 
    color: 'bg-green-500', 
    count: 0,
    description: 'Finished tasks'
  },
  { 
    id: 'cancelled', 
    title: 'Cancelled', 
    color: 'bg-red-500', 
    count: 0,
    description: 'Archived or cancelled'
  }
];

export const TASK_PRIORITIES = [
  { value: 'low', label: 'Low Priority', color: 'bg-green-500' },
  { value: 'medium', label: 'Medium Priority', color: 'bg-yellow-500' },
  { value: 'high', label: 'High Priority', color: 'bg-red-500' }
];

export const TASK_STATUSES = [
  'backlog',
  'planned', 
  'in-progress',
  'under-review',
  'completed',
  'cancelled'
];

export const DEFAULT_POMODORO_SETTINGS = {
  duration: 90 * 60, // 25 minutes
  shortBreak: 5 * 60, // 5 minutes
  longBreak: 15 * 60 // 15 minutes
};

export const TIMER_MODES = {
  COUNTUP: 'countup',
  COUNTDOWN: 'countdown'
};

export const KEYBOARD_SHORTCUTS = {
  NEW_TASK: 'n',
  SEARCH: '/',
  TOGGLE_THEME: 't',
  SETTINGS: 's',
  SAVE: 'ctrl+s',
  CLOSE_MODAL: 'escape'
};

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

export const LOCAL_STORAGE_KEYS = {
  THEME: 'neorp_theme',
  POMODORO_SETTINGS: 'neorp_pomodoro_settings',
  HIDDEN_COLUMNS: 'neorp_hidden_columns',
  USER_PREFERENCES: 'neorp_user_preferences'
};

export const API_ENDPOINTS = {
  TASKS: '/api/tasks',
  LINK_TASKS: '/api/tasks/:id/link',
  UNLINK_TASKS: '/api/tasks/:id/unlink',
  UPDATE_TIME: '/api/tasks/:id/time',
  ACTIVE_TASK: '/api/tasks/active',
  HEALTH: '/api/health'
};

export const DRAG_TYPES = {
  TASK: 'task',
  COLUMN: 'column'
};

export const DEFAULT_TASK = {
  title: 'New Task',
  description: '# New Task\n\nAdd your task description here...',
  assignee: '',
  priority: 'medium',
  dueDate: '',
  status: 'backlog',
  files: [],
  allowedApps: [],
  timeSpent: 0,
  linkedTasks: []
};

export const EDITOR_SHORTCUTS = {
  BOLD: 'Mod-b',
  ITALIC: 'Mod-i',
  STRIKETHROUGH: 'Mod-Shift-s',
  CODE: 'Mod-e',
  HEADING_1: 'Mod-Alt-1',
  HEADING_2: 'Mod-Alt-2',
  HEADING_3: 'Mod-Alt-3',
  BULLET_LIST: 'Mod-Shift-8',
  ORDERED_LIST: 'Mod-Shift-9',
  BLOCKQUOTE: 'Mod-Shift-b',
  CODE_BLOCK: 'Mod-Alt-c',
  HORIZONTAL_RULE: 'Mod-Alt-r'
};

export const TIME_FORMATS = {
  SHORT: 'mm:ss',
  MEDIUM: 'h:mm:ss',
  LONG: 'HH:mm:ss'
};

export const DATE_FORMATS = {
  SHORT: 'MM/dd/yyyy',
  MEDIUM: 'MMM dd, yyyy',
  LONG: 'MMMM dd, yyyy',
  ISO: 'yyyy-MM-dd'
};

export const APP_CONFIG = {
  NAME: 'NeoRP',
  VERSION: '8.0.0',
  DESCRIPTION: 'Professional project planning and task management',
  AUTHOR: 'NeoRP Team',
  BUILD_DATE: new Date().toISOString()
};

export const DEBOUNCE_DELAYS = {
  SEARCH: 300,
  SAVE: 1000,
  RESIZE: 100,
  SCROLL: 50
};

export default {
  COLUMNS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  DEFAULT_POMODORO_SETTINGS,
  TIMER_MODES,
  KEYBOARD_SHORTCUTS,
  NOTIFICATION_TYPES,
  LOCAL_STORAGE_KEYS,
  API_ENDPOINTS,
  DRAG_TYPES,
  DEFAULT_TASK,
  EDITOR_SHORTCUTS,
  TIME_FORMATS,
  DATE_FORMATS,
  APP_CONFIG,
  DEBOUNCE_DELAYS
};