const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Task {
  // Get all tasks with their linked tasks
  static async findAll() {
    const query = `
      SELECT 
        t.*,
        COALESCE(
          json_agg(tl.linked_task_id) FILTER (WHERE tl.linked_task_id IS NOT NULL), 
          '[]'::json
        ) as linked_tasks
      FROM tasks t
      LEFT JOIN task_links tl ON t.id = tl.task_id
      GROUP BY t.id, t.title, t.description, t.assignee, t.priority, t.due_date, t.status, t.files, t.created_at, t.updated_at
      ORDER BY t.created_at DESC
    `;
    
    try {
      const result = await pool.query(query);
      return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        assignee: row.assignee,
        priority: row.priority,
        dueDate: row.due_date,
        status: row.status,
        files: typeof row.files === 'string' ? JSON.parse(row.files) : row.files || [],
        linkedTasks: row.linked_tasks || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Error in findAll:', error);
      throw error;
    }
  }

  // Find task by ID
  static async findById(id) {
    const query = `
      SELECT 
        t.*,
        COALESCE(
          json_agg(tl.linked_task_id) FILTER (WHERE tl.linked_task_id IS NOT NULL), 
          '[]'::json
        ) as linked_tasks
      FROM tasks t
      LEFT JOIN task_links tl ON t.id = tl.task_id
      WHERE t.id = $1
      GROUP BY t.id, t.title, t.description, t.assignee, t.priority, t.due_date, t.status, t.files, t.created_at, t.updated_at
    `;
    
    try {
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        assignee: row.assignee,
        priority: row.priority,
        dueDate: row.due_date,
        status: row.status,
        files: typeof row.files === 'string' ? JSON.parse(row.files) : row.files || [],
        linkedTasks: row.linked_tasks || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error('Error in findById:', error);
      throw error;
    }
  }

  // Generate unique task ID
  static async generateUniqueId() {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const num = Math.floor(Math.random() * 9000) + 1000;
      const id = `NRP-${num}`;
      
      try {
        const existing = await pool.query('SELECT id FROM tasks WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
          return id;
        }
        attempts++;
      } catch (error) {
        console.error('Error checking ID uniqueness:', error);
        throw error;
      }
    }
    
    // Fallback to UUID if can't generate unique NRP-#### ID
    return `NRP-${uuidv4().slice(0, 8)}`;
  }

  // Create new task
  static async create(taskData) {
    const id = await this.generateUniqueId();
    const query = `
      INSERT INTO tasks (
        id, title, description, assignee, priority, due_date, 
        status, files, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
      RETURNING *
    `;
    
    const values = [
      id,
      taskData.title || 'New Task',
      taskData.description || '# New Task\n\nTask description here...',
      taskData.assignee || '',
      taskData.priority || 'medium',
      taskData.dueDate || null,
      taskData.status || 'backlog',
      JSON.stringify(taskData.files || []),
      new Date().toISOString()
    ];
    
    try {
      const result = await pool.query(query, values);
      const row = result.rows[0];
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        assignee: row.assignee,
        priority: row.priority,
        dueDate: row.due_date,
        status: row.status,
        files: typeof row.files === 'string' ? JSON.parse(row.files) : row.files || [],
        linkedTasks: [],
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error('Error in create:', error);
      throw error;
    }
  }

  // Update existing task
  static async update(id, taskData) {
    const query = `
      UPDATE tasks 
      SET title = $1, description = $2, assignee = $3, priority = $4, 
          due_date = $5, status = $6, files = $7, updated_at = $8
      WHERE id = $9
      RETURNING *
    `;
    
    const values = [
      taskData.title,
      taskData.description,
      taskData.assignee,
      taskData.priority,
      taskData.dueDate || null,
      taskData.status,
      JSON.stringify(taskData.files || []),
      new Date().toISOString(),
      id
    ];
    
    try {
      const result = await pool.query(query, values);
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        assignee: row.assignee,
        priority: row.priority,
        dueDate: row.due_date,
        status: row.status,
        files: typeof row.files === 'string' ? JSON.parse(row.files) : row.files || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error('Error in update:', error);
      throw error;
    }
  }

  // Delete task and all its links
  static async delete(id) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Delete task links first (foreign key constraint)
      await client.query('DELETE FROM task_links WHERE task_id = $1 OR linked_task_id = $1', [id]);
      
      // Delete the task
      const query = 'DELETE FROM tasks WHERE id = $1 RETURNING *';
      const result = await client.query(query, [id]);
      
      await client.query('COMMIT');
      
      if (result.rows.length === 0) return null;
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in delete:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Link two tasks (bidirectional)
  static async linkTasks(taskId, linkedTaskId) {
    if (taskId === linkedTaskId) {
      throw new Error('Cannot link a task to itself');
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if both tasks exist
      const taskCheck = await client.query('SELECT id FROM tasks WHERE id IN ($1, $2)', [taskId, linkedTaskId]);
      if (taskCheck.rows.length !== 2) {
        throw new Error('One or both tasks do not exist');
      }
      
      // Check if link already exists
      const existingLink = await client.query(
        'SELECT * FROM task_links WHERE task_id = $1 AND linked_task_id = $2',
        [taskId, linkedTaskId]
      );
      
      if (existingLink.rows.length > 0) {
        throw new Error('Tasks are already linked');
      }

      // Create bidirectional link
      await client.query(
        'INSERT INTO task_links (task_id, linked_task_id) VALUES ($1, $2)',
        [taskId, linkedTaskId]
      );
      await client.query(
        'INSERT INTO task_links (task_id, linked_task_id) VALUES ($1, $2)',
        [linkedTaskId, taskId]
      );
      
      await client.query('COMMIT');
      return { success: true, message: 'Tasks linked successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in linkTasks:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Unlink two tasks (bidirectional)
  static async unlinkTasks(taskId, linkedTaskId) {
    const query = `
      DELETE FROM task_links 
      WHERE (task_id = $1 AND linked_task_id = $2) 
         OR (task_id = $2 AND linked_task_id = $1)
    `;
    
    try {
      await pool.query(query, [taskId, linkedTaskId]);
      return { success: true, message: 'Tasks unlinked successfully' };
    } catch (error) {
      console.error('Error in unlinkTasks:', error);
      throw error;
    }
  }
}

module.exports = Task;