// Version 9 - Restricted task creation to backlog/planned, added delete for cancelled tasks

import React, { useState } from 'react';
import { Plus, EyeOff, Trash2 } from 'lucide-react';
import TaskCard from './TaskCard';

const KanbanColumn = ({ 
  column, 
  tasks, 
  isHidden, 
  isDarkMode, 
  onDragStart, 
  onDragOver, 
  onDrop, 
  onCreateTask, 
  onOpenTask, 
  onToggleVisibility,
  onDeleteTask,
  draggedTask 
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragStart = (e, task) => {
    onDragStart(e, task, column.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
    onDragOver(e);
  };

  const handleDragLeave = (e) => {
    // Only set drag over to false if we're leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(e, column.id);
  };

  const handleDeleteTask = async (taskId, e) => {
    e.stopPropagation(); // Prevent opening task modal
    
    if (window.confirm('Are you sure you want to permanently delete this task? This action cannot be undone.')) {
      try {
        const response = await fetch(`http://localhost:3001/api/tasks/${taskId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          onDeleteTask(taskId);
        } else {
          alert('Failed to delete task');
        }
      } catch (error) {
        console.error('Error deleting task:', error);
        alert('Failed to delete task');
      }
    }
  };

  // Only allow task creation in backlog and planned columns
  const canCreateTasks = column.id === 'backlog' || column.id === 'planned';
  
  // Show delete button for cancelled tasks
  const showDeleteButton = column.id === 'cancelled';

  if (isHidden) return null;

  return (
    <div
      className={`rounded-2xl shadow-xl overflow-hidden border transition-all duration-300 ${
        isDragOver ? 'ring-2 ring-blue-500 ring-opacity-50 scale-[1.02]' : ''
      } ${
        isDarkMode 
          ? 'bg-gray-800/70 border-gray-700/50 backdrop-blur-xl' 
          : 'bg-white/80 border-gray-200/50 backdrop-blur-xl'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        backdropFilter: 'blur(15px)',
        boxShadow: isDarkMode
          ? '0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          : '0 20px 40px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
        borderRadius: '1rem'
      }}
    >
      {/* Column Header */}
      <div 
        className={`${column.color} text-white p-6 bg-gradient-to-r`}
        style={{ borderRadius: '1rem 1rem 0 0' }}
      >
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg column-header">{column.title}</h2>
          <div className="flex items-center space-x-3">
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
              {column.count}
            </span>
            <button
              onClick={() => onToggleVisibility(column.id)}
              className="hover:bg-white/20 p-2 rounded-lg transition-colors"
              title="Hide Column"
            >
              <EyeOff size={18} />
            </button>
            {canCreateTasks && (
              <button
                onClick={() => onCreateTask(column.id)}
                className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                title="Add Task"
              >
                <Plus size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Column Content */}
      <div className={`p-6 min-h-96 transition-all duration-300 ${
        isDragOver 
          ? (isDarkMode 
              ? 'bg-blue-900/20 border-blue-500/50' 
              : 'bg-blue-50/50 border-blue-300/50'
            )
          : ''
      }`}>
        {tasks.length === 0 ? (
          <div className={`text-center py-12 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <div className="mb-4 opacity-50">
              <div className="w-16 h-16 mx-auto rounded-full border-2 border-dashed border-current flex items-center justify-center">
                {canCreateTasks ? <Plus size={24} /> : <div className="w-6 h-6 rounded bg-current"></div>}
              </div>
            </div>
            <p className="text-sm">No tasks yet</p>
            {canCreateTasks ? (
              <p className="text-xs mt-1">Drag tasks here or click + to add</p>
            ) : (
              <p className="text-xs mt-1">Drag tasks here to update status</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="relative group">
                <TaskCard
                  task={task}
                  onDragStart={handleDragStart}
                  onOpenTask={onOpenTask}
                  isDarkMode={isDarkMode}
                  draggedTask={draggedTask}
                />
                
                {/* Delete Button for Cancelled Tasks */}
                {showDeleteButton && (
                  <button
                    onClick={(e) => handleDeleteTask(task.id, e)}
                    className={`absolute top-2 right-2 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 ${
                      isDarkMode 
                        ? 'bg-red-900/80 hover:bg-red-800 text-red-300 hover:text-red-200' 
                        : 'bg-red-100/80 hover:bg-red-200 text-red-600 hover:text-red-700'
                    }`}
                    title="Permanently Delete Task"
                    style={{ borderRadius: '0.5rem' }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drop Zone Indicator */}
      {isDragOver && (
        <div className={`absolute inset-0 pointer-events-none border-2 border-dashed rounded-2xl ${
          isDarkMode ? 'border-blue-400' : 'border-blue-500'
        } bg-blue-500/10`}>
          <div className="flex items-center justify-center h-full">
            <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
              isDarkMode 
                ? 'bg-blue-500/80 text-white' 
                : 'bg-blue-500 text-white'
            }`}>
              Drop task here
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanColumn;