// Version 8 - Kanban column component with fixed drag and drop

import React, { useState } from 'react';
import { Plus, EyeOff } from 'lucide-react';
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
          <h2 className="font-bold text-lg">{column.title}</h2>
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
            <button
              onClick={() => onCreateTask(column.id)}
              className="hover:bg-white/20 p-2 rounded-lg transition-colors"
              title="Add Task"
            >
              <Plus size={18} />
            </button>
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
                <Plus size={24} />
              </div>
            </div>
            <p className="text-sm">No tasks yet</p>
            <p className="text-xs mt-1">Drag tasks here or click + to add</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onDragStart={handleDragStart}
                onOpenTask={onOpenTask}
                isDarkMode={isDarkMode}
                draggedTask={draggedTask}
              />
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