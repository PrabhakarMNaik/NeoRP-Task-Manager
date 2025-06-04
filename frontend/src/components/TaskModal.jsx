// Version 8 - Fixed persistence, timer, and UI issues

import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar, User, Link, Play, Pause, RotateCcw, Timer, Bell } from 'lucide-react';
import BlockEditor from './BlockEditor';
import TimerManager from './TimerManager';

const TaskModal = ({ 
  task, 
  isOpen, 
  onClose, 
  onUpdate, 
  isDarkMode, 
  allTasks, 
  onOpenLinkModal,
  pomodoroSettings 
}) => {
  const [selectedTask, setSelectedTask] = useState(task);
  const [timerState, setTimerState] = useState({
    activeTaskId: null,
    isRunning: false,
    timeSpent: {},
    timerMode: 'countup',
    countdownTime: 0
  });
  const [timerMode, setTimerMode] = useState('countup');

  // Subscribe to timer updates
  useEffect(() => {
    const unsubscribe = TimerManager.subscribe(setTimerState);
    return unsubscribe;
  }, []);

  // Update local task when prop changes
  useEffect(() => {
    setSelectedTask(task);
  }, [task]);

  // Optimized save function - reduced debounce time
  const saveTask = useCallback(
    debounce(async (taskToSave) => {
      try {
        const response = await fetch(`http://localhost:3001/api/tasks/${taskToSave.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskToSave),
        });
        
        if (response.ok) {
          await TimerManager.saveTimeToBackend(taskToSave.id);
        }
      } catch (error) {
        console.error('Error saving task:', error);
      }
    }, 300),
    []
  );

  // Update task and save
  const updateTask = (updatedFields) => {
    const updatedTask = { ...selectedTask, ...updatedFields };
    setSelectedTask(updatedTask);
    saveTask(updatedTask);
  };

  const archiveTask = async () => {
    try {
      const archivedTask = { ...selectedTask, status: 'cancelled' };
      const response = await fetch(`http://localhost:3001/api/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(archivedTask),
      });
      
      if (response.ok) {
        onClose();
        onUpdate();
      }
    } catch (error) {
      console.error('Error archiving task:', error);
    }
  };

  const unlinkTask = async (linkedTaskId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/tasks/${selectedTask.id}/unlink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedTaskId }),
      });
      
      if (response.ok) {
        onUpdate();
        // Update local task
        const updatedLinkedTasks = selectedTask.linkedTasks?.filter(id => id !== linkedTaskId) || [];
        setSelectedTask(prev => ({ ...prev, linkedTasks: updatedLinkedTasks }));
      }
    } catch (error) {
      console.error('Error unlinking task:', error);
    }
  };

  const openLinkedTask = async (taskId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/tasks/${taskId}`);
      const linkedTask = await response.json();
      if (linkedTask) {
        setSelectedTask(linkedTask);
      }
    } catch (error) {
      console.error('Error loading linked task:', error);
    }
  };

  const toggleTimer = () => {
    const isCurrentlyActive = TimerManager.isActiveForTask(selectedTask.id);
    
    if (isCurrentlyActive) {
      TimerManager.pauseTimer();
    } else {
      const success = TimerManager.startTimer(
        selectedTask.id, 
        timerMode, 
        pomodoroSettings.duration
      );
      if (!success) {
        // Timer start was cancelled by user
        return;
      }
    }
  };

  const resetTimer = () => {
    TimerManager.resetTimer(pomodoroSettings.duration);
  };

  const formatTime = (seconds) => {
    return TimerManager.formatTime(seconds);
  };

  const getDaysRemaining = () => {
    if (!selectedTask.dueDate) return null;
    
    const today = new Date();
    const dueDate = new Date(selectedTask.dueDate);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: `${Math.abs(diffDays)} days overdue`, color: 'text-red-500' };
    if (diffDays === 0) return { text: 'Due today', color: 'text-orange-500' };
    if (diffDays === 1) return { text: 'Due tomorrow', color: 'text-yellow-500' };
    if (diffDays <= 7) return { text: `${diffDays} days remaining`, color: 'text-yellow-500' };
    return { text: `${diffDays} days remaining`, color: 'text-green-500' };
  };

  const daysRemaining = getDaysRemaining();
  const currentTimeSpent = timerState.timeSpent[selectedTask.id] || 0;
  const isTimerActive = TimerManager.isActiveForTask(selectedTask.id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-50 overflow-hidden">
      <div className={`rounded-3xl w-[95vw] h-[95vh] shadow-2xl border flex flex-col ${
        isDarkMode 
          ? 'bg-gray-900/95 border-gray-700/50 backdrop-blur-xl' 
          : 'bg-white/95 border-gray-200/50 backdrop-blur-xl'
      }`} style={{
        backdropFilter: 'blur(20px)',
        boxShadow: isDarkMode
          ? '0 25px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          : '0 25px 50px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
        borderRadius: '1.5rem'
      }}>
        {/* Modal Header */}
        <div className={`px-6 py-4 border-b flex-shrink-0 ${
          isDarkMode ? 'border-gray-600/30 bg-gray-800/50' : 'border-gray-200/30 bg-gray-50/50'
        }`} style={{ borderRadius: '1.5rem 1.5rem 0 0' }}>
          <div className="flex justify-between items-center">
            {/* Left Side - Date Info */}
            <div className="flex items-center space-x-6 text-sm">
              <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-gray-700/80' : 'bg-white/80'}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                  <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    Due Date
                  </span>
                </div>
                <input
                  type="date"
                  value={selectedTask.dueDate || ''}
                  onChange={(e) => updateTask({ dueDate: e.target.value })}
                  className={`bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500/50 rounded px-2 py-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                />
                {daysRemaining && (
                  <div className={`text-xs mt-1 font-medium ${daysRemaining.color}`}>
                    {daysRemaining.text}
                  </div>
                )}
              </div>
              
              <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-gray-700/80' : 'bg-white/80'}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <User size={16} className={isDarkMode ? 'text-green-400' : 'text-green-600'} />
                  <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    Assignee
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Assign to..."
                  value={selectedTask.assignee || ''}
                  onChange={(e) => updateTask({ assignee: e.target.value })}
                  className={`bg-transparent border-none outline-none focus:ring-2 focus:ring-green-500/50 rounded px-2 py-1 w-32 ${
                    isDarkMode ? 'text-gray-300 placeholder-gray-500' : 'text-gray-700 placeholder-gray-400'
                  }`}
                />
              </div>
            </div>

            {/* Center - Title */}
            <div className="flex-1 text-center mx-8">
              <input
                type="text"
                value={selectedTask.title || ''}
                onChange={(e) => updateTask({ title: e.target.value })}
                className={`text-xl font-bold bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500/50 rounded-lg p-2 transition-all text-center w-full ${
                  isDarkMode ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Task title..."
              />
            </div>

            {/* Right Side - Actions */}
            <div className="flex items-center space-x-3">
              <select
                value={selectedTask.priority || 'medium'}
                onChange={(e) => updateTask({ priority: e.target.value })}
                className={`bg-transparent border border-gray-300 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500/50 rounded-lg px-3 py-2 text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <button
                onClick={onOpenLinkModal}
                className="btn-3d bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-xl transition-all duration-200"
                style={{ borderRadius: '0.75rem' }}
                title="Link Tasks"
              >
                <Link size={18} />
              </button>
              <button
                onClick={archiveTask}
                className="btn-3d bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-xl transition-all duration-200"
                style={{ borderRadius: '0.75rem' }}
                title="Archive Task"
              >
                📦
              </button>
              <button
                onClick={onClose}
                className={`p-2 rounded-xl transition-colors ${
                  isDarkMode 
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                style={{ borderRadius: '0.75rem' }}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Editor */}
          <div className="flex-1 p-6 overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="mb-4">
                <span className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Type '/' for commands • Auto-saved
                </span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <BlockEditor 
                  value={selectedTask.description || ''}
                  onChange={(content) => updateTask({ description: content })}
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className={`w-80 p-6 border-l overflow-y-auto ${
            isDarkMode 
              ? 'border-gray-600/30 bg-gray-800/80 backdrop-blur-xl' 
              : 'border-gray-200/30 bg-gray-50/90 backdrop-blur-xl'
          }`}>
            {/* Task Info */}
            <div className="mb-8">
              <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Task Info
              </h3>
              <div className="space-y-3 text-sm">
                <div className={`flex justify-between p-3 rounded-xl ${
                  isDarkMode ? 'bg-gray-700/80' : 'bg-white/90'
                }`}>
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>ID:</span>
                  <span className={`font-mono ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {selectedTask.id}
                  </span>
                </div>
                <div className={`flex justify-between p-3 rounded-xl ${
                  isDarkMode ? 'bg-gray-700/80' : 'bg-white/90'
                }`}>
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Status:</span>
                  <span className={`capitalize font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {selectedTask.status?.replace('-', ' ')}
                  </span>
                </div>
                
                {/* Timer Section */}
                <div className={`p-4 rounded-xl border ${
                  isDarkMode 
                    ? 'bg-gray-700/80 border-gray-600/50' 
                    : 'bg-white/90 border-gray-200/50'
                }`}>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-3">
                      <Bell size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                      <select
                        value={timerMode}
                        onChange={(e) => setTimerMode(e.target.value)}
                        className={`text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        <option value="countup">Flow Timer</option>
                        <option value="countdown">Pomodoro</option>
                      </select>
                    </div>
                    
                    <div className={`text-3xl font-mono mb-4 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    } ${isTimerActive ? 'text-green-500 animate-pulse' : ''}`}>
                      {timerMode === 'countdown' 
                        ? formatTime(timerState.countdownTime)
                        : formatTime(currentTimeSpent)
                      }
                    </div>
                    
                    <div className="flex justify-center space-x-2 mb-3">
                      <button
                        onClick={toggleTimer}
                        className={`p-3 rounded-lg transition-all duration-200 ${
                          isTimerActive 
                            ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                        title={isTimerActive ? 'Pause Timer' : 'Start Timer'}
                      >
                        {isTimerActive ? <Pause size={20} /> : <Play size={20} />}
                      </button>
                      <button
                        onClick={resetTimer}
                        className={`p-3 rounded-lg transition-all duration-200 ${
                          isDarkMode 
                            ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                            : 'bg-gray-500 hover:bg-gray-600 text-white'
                        }`}
                        title="Reset Timer"
                      >
                        <RotateCcw size={20} />
                      </button>
                    </div>
                    
                    <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Total Time: {formatTime(currentTimeSpent)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Linked Tasks */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Linked Tasks
                </h3>
                <button
                  onClick={onOpenLinkModal}
                  className="btn-3d bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-xl text-sm transition-all duration-200 flex items-center space-x-2"
                >
                  <Link size={12} />
                  <span>Link</span>
                </button>
              </div>
              
              <div className="space-y-3">
                {selectedTask.linkedTasks && selectedTask.linkedTasks.length > 0 ? (
                  selectedTask.linkedTasks.map((linkedTaskId) => {
                    const linkedTask = allTasks.find(t => t.id === linkedTaskId);
                    if (!linkedTask) return null;
                    
                    return (
                      <div
                        key={linkedTaskId}
                        className={`p-4 rounded-xl cursor-pointer hover:scale-[1.02] transition-all duration-200 border ${
                          isDarkMode 
                            ? 'bg-gray-700/70 border-gray-600/50 hover:bg-gray-700/80' 
                            : 'bg-white/80 border-gray-200/50 hover:bg-white/90'
                        }`}
                        onClick={() => openLinkedTask(linkedTaskId)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {linkedTask.id}
                            </div>
                            <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {linkedTask.title}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              unlinkTask(linkedTaskId);
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              isDarkMode 
                                ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' 
                                : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                            }`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Link size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No linked tasks</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default TaskModal;