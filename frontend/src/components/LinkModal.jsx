// Version 9 - Fixed immediate visibility of linked tasks

import React, { useState } from 'react';
import { X, Search, Link } from 'lucide-react';

const LinkModal = ({ isOpen, onClose, selectedTask, allTasks, onUpdate, onTaskUpdate, isDarkMode }) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredTasks = allTasks.filter(task => 
    task.id !== selectedTask?.id && 
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedTask?.linkedTasks?.includes(task.id)
  );

  const linkTasks = async (targetTaskId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/tasks/${selectedTask.id}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedTaskId: targetTaskId }),
      });
      
      if (response.ok) {
        // Update the selected task immediately in the parent component
        if (onTaskUpdate) {
          const updatedLinkedTasks = [...(selectedTask.linkedTasks || []), targetTaskId];
          onTaskUpdate({ ...selectedTask, linkedTasks: updatedLinkedTasks });
        }
        
        // Also refresh the full task list
        await onUpdate();
        onClose();
        setSearchTerm('');
      } else {
        const errorData = await response.json();
        console.error('Link error:', errorData);
        alert(errorData.error || 'Failed to link tasks');
      }
    } catch (error) {
      console.error('Error linking tasks:', error);
      alert('Failed to link tasks');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className={`max-w-md w-full rounded-2xl overflow-hidden shadow-2xl border ${
        isDarkMode 
          ? 'bg-gray-800/95 border-gray-700/50 backdrop-blur-xl' 
          : 'bg-white/95 border-gray-200/50 backdrop-blur-xl'
      }`} style={{
        borderRadius: '1rem',
        boxShadow: isDarkMode
          ? '0 25px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          : '0 25px 50px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
      }}>
        <div className={`p-6 border-b ${isDarkMode ? 'border-gray-600/20' : 'border-gray-200/20'}`}>
          <div className="flex justify-between items-center">
            <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Link Task
            </h3>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              style={{ borderRadius: '0.5rem' }}
            >
              <X size={20} />
            </button>
          </div>
          <div className="mt-4">
            <div className="relative">
              <Search size={18} className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                placeholder="Search tasks to link..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                  isDarkMode 
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white/80 border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                style={{ borderRadius: '0.75rem' }}
                autoFocus
              />
            </div>
          </div>
        </div>
        
        <div className="max-h-80 overflow-y-auto p-6">
          {filteredTasks.length > 0 ? (
            <div className="space-y-3">
              {filteredTasks.map(task => (
                <div
                  key={task.id}
                  className={`p-4 border rounded-xl cursor-pointer transition-all transform hover:scale-[1.02] ${
                    isDarkMode 
                      ? 'border-gray-600/50 hover:bg-gray-700/30 hover:border-gray-500/70' 
                      : 'border-gray-200/50 hover:bg-gray-50/50 hover:border-gray-300/70'
                  }`}
                  style={{ borderRadius: '0.75rem' }}
                  onClick={() => linkTasks(task.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className={`text-xs mb-1 font-mono ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {task.id}
                      </div>
                      <div className={`font-medium text-lg mb-1 ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {task.title}
                      </div>
                      <div className={`text-sm capitalize ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {task.status.replace('-', ' ')}
                      </div>
                      {task.assignee && (
                        <div className={`text-xs mt-1 ${
                          isDarkMode ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          Assigned to: {task.assignee}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)} shadow-lg`}></div>
                      <Link size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <Search size={48} className="mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-2">
                {searchTerm ? 'No matching tasks found' : 'No tasks available to link'}
              </p>
              <p className="text-sm">
                {searchTerm 
                  ? 'Try different search terms' 
                  : 'Create more tasks or they may already be linked'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinkModal;