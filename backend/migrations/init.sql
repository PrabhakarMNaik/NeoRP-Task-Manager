-- NeoRP Project Planning Database Schema
-- Fixed version for PostgreSQL compatibility
-- Run this after creating database and user

-- Drop existing tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS task_links CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;

-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Create tasks table
CREATE TABLE tasks (
    id VARCHAR(20) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assignee VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium',
    due_date DATE,
    status VARCHAR(20) DEFAULT 'backlog',
    files TEXT DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add constraints after table creation
ALTER TABLE tasks ADD CONSTRAINT chk_priority 
    CHECK (priority IN ('low', 'medium', 'high'));

ALTER TABLE tasks ADD CONSTRAINT chk_status 
    CHECK (status IN ('backlog', 'planned', 'in-progress', 'under-review', 'completed', 'cancelled'));

-- Create task_links table for linking tasks
CREATE TABLE task_links (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(20) NOT NULL,
    linked_task_id VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints
ALTER TABLE task_links 
    ADD CONSTRAINT fk_task_links_task_id 
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE task_links 
    ADD CONSTRAINT fk_task_links_linked_task_id 
    FOREIGN KEY (linked_task_id) REFERENCES tasks(id) ON DELETE CASCADE;

-- Add unique constraint to prevent duplicate links
ALTER TABLE task_links 
    ADD CONSTRAINT uk_task_links 
    UNIQUE (task_id, linked_task_id);

-- Create indexes for better performance
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_tasks_updated_at ON tasks(updated_at);
CREATE INDEX idx_task_links_task_id ON task_links(task_id);
CREATE INDEX idx_task_links_linked_task_id ON task_links(linked_task_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data with proper escaping
INSERT INTO tasks (id, title, description, assignee, priority, due_date, status) VALUES
('NRP-001', 'User Authentication System', 
'# User Authentication

Implement secure user authentication with JWT tokens.

## Requirements
- Login/Register forms
- Password encryption  
- Session management

## Implementation Notes
- Use bcrypt for password hashing
- JWT tokens for stateless authentication
- Implement password reset functionality', 
'John Doe', 'high', '2025-06-15', 'backlog');

INSERT INTO tasks (id, title, description, assignee, priority, due_date, status) VALUES
('NRP-002', 'Database Schema Design',
'# Database Design

Design the core database schema for the application.

## Schema Requirements
- User management tables
- Task management tables  
- Relationship mappings

## SQL Example
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL
);
```

## Considerations
- Indexing strategy
- Foreign key constraints
- Data migration planning', 
'Jane Smith', 'medium', '2025-06-20', 'planned');

INSERT INTO tasks (id, title, description, assignee, priority, due_date, status) VALUES
('NRP-003', 'Frontend UI Components',
'# Frontend Components

Build reusable React components for the project management interface.

## Components Needed
- Task cards
- Kanban columns
- Modal dialogs
- Form controls

## Design System
- Consistent spacing
- Color palette
- Typography scale
- Interactive states

## Tech Stack
- React 18+
- Tailwind CSS
- Lucide React Icons', 
'Bob Wilson', 'medium', '2025-06-25', 'backlog');

INSERT INTO tasks (id, title, description, assignee, priority, due_date, status) VALUES
('NRP-004', 'API Development',
'# REST API Development

Develop comprehensive REST API endpoints for task management.

## Endpoints Required
- GET /api/tasks - List all tasks
- POST /api/tasks - Create new task
- PUT /api/tasks/:id - Update task
- DELETE /api/tasks/:id - Delete task
- POST /api/tasks/:id/link - Link tasks

## Features
- Input validation
- Error handling
- Database transactions
- CORS configuration', 
'Alice Johnson', 'high', '2025-06-18', 'in-progress');

-- Create sample task links (bidirectional)
INSERT INTO task_links (task_id, linked_task_id) VALUES
('NRP-001', 'NRP-002'),
('NRP-002', 'NRP-001'),
('NRP-002', 'NRP-003'),
('NRP-003', 'NRP-002'),
('NRP-001', 'NRP-004'),
('NRP-004', 'NRP-001');

-- Verify the setup
SELECT 'Database initialization completed successfully!' as status;

-- Show summary
SELECT 
    'Tasks created: ' || COUNT(*) as summary 
FROM tasks;

SELECT 
    'Task links created: ' || COUNT(*)/2 || ' bidirectional links' as summary 
FROM task_links;

-- Show all tasks for verification
SELECT 
    id, 
    title, 
    assignee, 
    priority, 
    status,
    created_at
FROM tasks 
ORDER BY id;

-- Show task links for verification
SELECT 
    tl.task_id,
    t1.title as task_title,
    tl.linked_task_id,
    t2.title as linked_task_title
FROM task_links tl
JOIN tasks t1 ON tl.task_id = t1.id
JOIN tasks t2 ON tl.linked_task_id = t2.id
ORDER BY tl.task_id, tl.linked_task_id;