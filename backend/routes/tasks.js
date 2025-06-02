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

module.exports = router;