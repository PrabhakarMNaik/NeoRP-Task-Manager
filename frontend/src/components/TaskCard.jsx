// Version 9 - Performance optimized individual task card component

import React, { memo } from 'react';
import { User, Calendar, Timer, FileText } from 'lucide-react';
import TimerManager from './TimerManager';

const TaskCard = memo(({ task, onDragStart, onOpenTask, isDarkMode, draggedTask }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTime = (seconds) => {
    return TimerManager.formatTime(seconds);
  };

  // Extract first line of description for preview
  const getDescriptionPreview = (description) => {
    if (!description) return 'No description';
    
    // Remove markdown headers and get first meaningful line
    const lines = description.split('\n');
    for (const line of lines) {
      const cleanLine = line.replace(/^#+\s*/, '').trim();
      if (cleanLine && cleanLine.length > 0) {
        return cleanLine;
      }
    }
    return 'No description';
  };

  const isBeingDragged = draggedTask && draggedTask.id === task.id;

  const handleDragStart = (e) => {
    onDragStart(e, task);
  };

  const handleClick = () => {
    onOpenTask(task);
  };

  return (
    <div
      className={`border rounded-2xl p-5 mb-4 cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg ${
        isBeingDragged ? 'opacity-50 rotate-2 scale-105' : ''
      } ${
        isDarkMode 
          ? 'bg-gray-800/70 border-gray-700/50 hover:bg-gray-800/80 backdrop-blur-xl text-white' 
          : 'bg-white/80 border-gray-200/50 hover:bg-white/90 backdrop-blur-xl text-gray-900'
      }`}
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      style={{
        backdropFilter: 'blur(10px)',
        boxShadow: isDarkMode
          ? '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          : '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
        borderRadius: '1rem'
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className={`text-xs mb-2 font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {task.id}
          </div>
          <h3 className={`font-semibold text-lg leading-tight ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {task.title}
          </h3>
        </div>
        <div className={`w-4 h-4 rounded-full ${getPriorityColor(task.priority)} shadow-lg ring-2 ${
          isDarkMode ? 'ring-gray-800' : 'ring-white'
        }`}></div>
      </div>
      
      <p className={`text-sm mb-4 line-clamp-2 leading-relaxed ${
        isDarkMode ? 'text-gray-300' : 'text-gray-600'
      }`}>
        {getDescriptionPreview(task.description)}
      </p>
      
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center space-x-3">
          {task.assignee && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${
              isDarkMode ? 'bg-gray-700/80 text-gray-300' : 'bg-gray-100/80 text-gray-700'
            }`}>
              <User size={12} />
              <span>{task.assignee}</span>
            </div>
          )}
          {task.dueDate && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${
              isDarkMode ? 'bg-gray-700/80 text-gray-300' : 'bg-gray-100/80 text-gray-700'
            }`}>
              <Calendar size={12} />
              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
          )}
          {task.timeSpent > 0 && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${
              isDarkMode ? 'bg-blue-900/80 text-blue-300' : 'bg-blue-100/80 text-blue-700'
            }`}>
              <Timer size={12} />
              <span>{formatTime(task.timeSpent)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {task.linkedTasks && task.linkedTasks.length > 0 && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${
              isDarkMode ? 'bg-purple-900/80 text-purple-300' : 'bg-purple-100/80 text-purple-700'
            }`}>
              <span>🔗</span>
              <span>{task.linkedTasks.length}</span>
            </div>
          )}
          {task.files?.length > 0 && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${
              isDarkMode ? 'bg-green-900/80 text-green-300' : 'bg-green-100/80 text-green-700'
            }`}>
              <FileText size={12} />
              <span>{task.files.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

TaskCard.displayName = 'TaskCard';

export default TaskCard;