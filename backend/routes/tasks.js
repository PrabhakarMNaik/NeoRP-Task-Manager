const express = require('express');
const Task = require('../models/Task');

const router = express.Router();

// Input validation middleware
const validateTaskInput = (req, res, next) => {
  const { title, status, priority } = req.body;
  
  if (title && title.trim().length === 0) {
    return res.status(400).json({ error: 'Task title cannot be empty' });
  }
  
  if (status && !['backlog', 'planned', 'in-progress', 'under-review', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid task status' });
  }
  
  if (priority && !['low', 'medium', 'high'].includes(priority)) {
    return res.status(400).json({ error: 'Invalid task priority' });
  }
  
  next();
};

// GET /api/tasks - Get all tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.findAll();
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tasks', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// GET /api/tasks/:id - Get task by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ 
      error: 'Failed to fetch task',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// POST /api/tasks - Create new task
router.post('/', validateTaskInput, async (req, res) => {
  try {
    const task = await Task.create(req.body);
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ 
      error: 'Failed to create task',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', validateTaskInput, async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.update(id, req.body);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ 
      error: 'Failed to update task',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// PUT /api/tasks/:id/time - Update time spent on task
router.put('/:id/time', async (req, res) => {
  try {
    const { id } = req.params;
    const { timeSpent } = req.body;
    
    if (typeof timeSpent !== 'number' || timeSpent < 0) {
      return res.status(400).json({ error: 'Invalid time spent value' });
    }
    
    const task = await Task.updateTimeSpent(id, timeSpent);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Time updated successfully',
      timeSpent: task.time_spent 
    });
  } catch (error) {
    console.error('Error updating time spent:', error);
    res.status(500).json({ 
      error: 'Failed to update time spent',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.delete(id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ 
      message: 'Task deleted successfully', 
      deletedTask: { id: task.id, title: task.title }
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ 
      error: 'Failed to delete task',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// POST /api/tasks/:id/link - Link two tasks
router.post('/:id/link', async (req, res) => {
  try {
    const { id } = req.params;
    const { linkedTaskId } = req.body;
    
    if (!linkedTaskId) {
      return res.status(400).json({ error: 'linkedTaskId is required' });
    }
    
    const result = await Task.linkTasks(id, linkedTaskId);
    res.json(result);
  } catch (error) {
    console.error('Error linking tasks:', error);
    const statusCode = error.message.includes('already linked') || error.message.includes('do not exist') ? 400 : 500;
    res.status(statusCode).json({ 
      error: error.message || 'Failed to link tasks',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

// POST /api/tasks/:id/unlink - Unlink two tasks
router.post('/:id/unlink', async (req, res) => {
  try {
    const { id } = req.params;
    const { linkedTaskId } = req.body;
    
    if (!linkedTaskId) {
      return res.status(400).json({ error: 'linkedTaskId is required' });
    }
    
    const result = await Task.unlinkTasks(id, linkedTaskId);
    res.json(result);
  } catch (error) {
    console.error('Error unlinking tasks:', error);
    res.status(500).json({ 
      error: 'Failed to unlink tasks',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// GET /api/tasks/active - Get currently active task (for app monitor)
router.get('/active', async (req, res) => {
  try {
    // For now, return the most recently updated task that's in 'in-progress' status
    // In a full implementation, this would track which task is currently open
    const pool = require('../config/database');
    const query = `
      SELECT 
        t.*,
        COALESCE(
          json_agg(tl.linked_task_id) FILTER (WHERE tl.linked_task_id IS NOT NULL), 
          '[]'::json
        ) as linked_tasks
      FROM tasks t
      LEFT JOIN task_links tl ON t.id = tl.task_id
      WHERE t.status = 'in-progress'
      GROUP BY t.id, t.title, t.description, t.assignee, t.priority, t.due_date, t.status, t.files, t.allowed_apps, t.time_spent, t.created_at, t.updated_at
      ORDER BY t.updated_at DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      return res.json(null);
    }
    
    const row = result.rows[0];
    const task = {
      id: row.id,
      title: row.title,
      description: row.description,
      assignee: row.assignee,
      priority: row.priority,
      dueDate: row.due_date,
      status: row.status,
      files: typeof row.files === 'string' ? JSON.parse(row.files) : row.files || [],
      allowedApps: typeof row.allowed_apps === 'string' ? JSON.parse(row.allowed_apps) : row.allowed_apps || [],
      timeSpent: parseInt(row.time_spent) || 0,
      linkedTasks: row.linked_tasks || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    
    res.json(task);
  } catch (error) {
    console.error('Error fetching active task:', error);
    res.status(500).json({ 
      error: 'Failed to fetch active task',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

module.exports = router;