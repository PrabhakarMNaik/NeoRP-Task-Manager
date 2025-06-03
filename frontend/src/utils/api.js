// Version 8 - API utilities

const API_BASE = 'http://localhost:3001/api';

export const loadTasks = async () => {
  try {
    const response = await fetch(`${API_BASE}/tasks`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading tasks:', error);
    throw error;
  }
};

export const loadTask = async (taskId) => {
  try {
    const response = await fetch(`${API_BASE}/tasks/${taskId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading task:', error);
    throw error;
  }
};

export const createTask = async (taskData) => {
  try {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

export const updateTask = async (taskId, taskData) => {
  try {
    const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

export const deleteTask = async (taskId) => {
  try {
    const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

export const linkTasks = async (fromTaskId, toTaskId) => {
  try {
    const response = await fetch(`${API_BASE}/tasks/${fromTaskId}/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ linkedTaskId: toTaskId }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error linking tasks:', error);
    throw error;
  }
};

export const unlinkTasks = async (fromTaskId, toTaskId) => {
  try {
    const response = await fetch(`${API_BASE}/tasks/${fromTaskId}/unlink`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ linkedTaskId: toTaskId }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error unlinking tasks:', error);
    throw error;
  }
};

export const updateTaskTime = async (taskId, timeSpent) => {
  try {
    const response = await fetch(`${API_BASE}/tasks/${taskId}/time`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ timeSpent }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating task time:', error);
    throw error;
  }
};

export const getActiveTask = async () => {
  try {
    const response = await fetch(`${API_BASE}/tasks/active`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error getting active task:', error);
    throw error;
  }
};

export default {
  loadTasks,
  loadTask,
  createTask,
  updateTask,
  deleteTask,
  linkTasks,
  unlinkTasks,
  updateTaskTime,
  getActiveTask
};