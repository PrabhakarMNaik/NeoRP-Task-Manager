// Version 10 - Complete ProjectPlanningModule with all dark mode fixes

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sun, Moon, Eye, EyeOff, Settings } from 'lucide-react';
import TaskModal from './TaskModal';
import KanbanColumn from './KanbanColumn';
import LinkModal from './LinkModal';
import SettingsModal from './SettingsModal';
import TimerManager from './TimerManager';
import { loadTasks, createTask } from '../utils/api';
import { COLUMNS } from '../utils/constants';

const ProjectPlanningModule = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [tasks, setTasks] = useState({
    backlog: [],
    planned: [],
    'in-progress': [],
    'under-review': [],
    completed: [],
    cancelled: []
  });
  const [allTasks, setAllTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);
  const [draggedFrom, setDraggedFrom] = useState(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState({});
  const [pomodoroSettings, setPomodoroSettings] = useState({
    duration: 25 * 60, // 25 minutes default
    shortBreak: 5 * 60,
    longBreak: 15 * 60
  });

  // CRITICAL FIX 1: Apply classes to document root
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    // Clear all theme classes first
    root.classList.remove('dark', 'light');
    body.classList.remove('dark-mode', 'light-mode');
    
    if (isDarkMode) {
      root.classList.add('dark');
      body.classList.add('dark-mode');
      console.log('🌙 Applied dark classes to document');
    } else {
      root.classList.add('light');
      body.classList.add('light-mode');
      console.log('☀️ Applied light classes to document');
    }
    
    // Force update all editors
    const editors = document.querySelectorAll('.tiptap-editor-content');
    editors.forEach(editor => {
      editor.classList.remove('dark-mode', 'light-mode');
      editor.classList.add(isDarkMode ? 'dark-mode' : 'light-mode');
    });
    
    // Debug verification
    setTimeout(() => {
      console.log('🔍 After class update:', {
        html: root.className,
        body: body.className,
        isDarkMode,
        editorClasses: document.querySelector('.tiptap-editor-content')?.className
      });
    }, 100);
    
  }, [isDarkMode]);

  // Memoize columns with task counts to prevent unnecessary re-renders
  const columnsWithCounts = useMemo(() => 
    COLUMNS.map(column => ({
      ...column,
      count: tasks[column.id]?.length || 0
    })), [tasks]
  );

  // Load tasks on component mount
  useEffect(() => {
    loadAllTasks();
  }, []);

  const loadAllTasks = useCallback(async () => {
    try {
      const data = await loadTasks();
      
      const groupedTasks = {
        backlog: [],
        planned: [],
        'in-progress': [],
        'under-review': [],
        completed: [],
        cancelled: []
      };
      
      data.forEach(task => {
        if (groupedTasks[task.status]) {
          groupedTasks[task.status].push(task);
        }
      });
      
      setTasks(groupedTasks);
      setAllTasks(data);
      TimerManager.loadTimeFromBackend(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }, []);

  const handleDragStart = useCallback((e, task, fromColumn) => {
    setDraggedTask(task);
    setDraggedFrom(fromColumn);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(async (e, toColumn) => {
    e.preventDefault();
    if (draggedTask && draggedFrom && draggedFrom !== toColumn) {
      // Optimistically update UI
      setTasks(prev => ({
        ...prev,
        [draggedFrom]: prev[draggedFrom].filter(task => task.id !== draggedTask.id),
        [toColumn]: [...prev[toColumn], { ...draggedTask, status: toColumn }]
      }));

      // Update backend
      const updatedTask = { ...draggedTask, status: toColumn };
      try {
        const response = await fetch(`http://localhost:3001/api/tasks/${draggedTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedTask),
        });
        
        if (!response.ok) {
          // Revert on failure
          loadAllTasks();
        } else {
          // Update allTasks array for consistency
          setAllTasks(prev => prev.map(task => 
            task.id === draggedTask.id ? { ...task, status: toColumn } : task
          ));
        }
      } catch (error) {
        console.error('Error updating task status:', error);
        loadAllTasks();
      }
    }
    setDraggedTask(null);
    setDraggedFrom(null);
  }, [draggedTask, draggedFrom, loadAllTasks]);

  // Only allow task creation in backlog and planned columns
  const createNewTask = useCallback(async (columnId) => {
    // Restrict task creation to only backlog and planned
    if (columnId !== 'backlog' && columnId !== 'planned') {
      alert('Tasks can only be created in Backlog or Planned columns.');
      return;
    }

    try {
      const newTask = await createTask({
        title: 'New Task',
        description: '# New Task\n\nAdd your task description here...',
        status: columnId,
        priority: 'medium'
      });
      
      if (newTask) {
        loadAllTasks();
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  }, [loadAllTasks]);

  const openTask = useCallback((task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  }, []);

  const closeTask = useCallback(() => {
    setIsModalOpen(false);
    setSelectedTask(null);
    TimerManager.pauseTimer(); // Pause timer when closing task
  }, []);

  const toggleColumnVisibility = useCallback((columnId) => {
    setHiddenColumns(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  }, []);

  // Handle task deletion
  const handleDeleteTask = useCallback((taskId) => {
    // Remove from local state immediately for instant UI feedback
    setTasks(prev => {
      const newTasks = { ...prev };
      Object.keys(newTasks).forEach(status => {
        newTasks[status] = newTasks[status].filter(task => task.id !== taskId);
      });
      return newTasks;
    });
    
    setAllTasks(prev => prev.filter(task => task.id !== taskId));
    
    // Refresh to ensure consistency
    loadAllTasks();
  }, [loadAllTasks]);

  // Handle task update in modal (for immediate linked task visibility)
  const handleTaskUpdate = useCallback((updatedTask) => {
    setSelectedTask(updatedTask);
    
    // Update in allTasks array
    setAllTasks(prev => prev.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
    
    // Update in grouped tasks
    setTasks(prev => {
      const newTasks = { ...prev };
      Object.keys(newTasks).forEach(status => {
        newTasks[status] = newTasks[status].map(task => 
          task.id === updatedTask.id ? updatedTask : task
        );
      });
      return newTasks;
    });
  }, []);

  const handleOpenLinkModal = useCallback(() => {
    setIsLinkModalOpen(true);
  }, []);

  const handleCloseLinkModal = useCallback(() => {
    setIsLinkModalOpen(false);
  }, []);

  // Enhanced toggle function with debugging
  const toggleDarkMode = () => {
    console.log('🔄 Toggling dark mode from', isDarkMode, 'to', !isDarkMode);
    setIsDarkMode(prev => !prev);
  };

  return (
    // CRITICAL: Add dark mode class to main container
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'dark dark-mode bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'light light-mode bg-gradient-to-br from-gray-50 via-white to-gray-100'
    }`}>
      
      {/* Enhanced Header with explicit dark mode classes */}
      <div className={`p-6 m-6 rounded-2xl border shadow-xl ${
        isDarkMode 
          ? 'dark-mode bg-gray-800/70 border-gray-700/50 backdrop-blur-xl' 
          : 'light-mode bg-white/80 border-gray-200/50 backdrop-blur-xl'
      }`} style={{
        backdropFilter: 'blur(20px)',
        boxShadow: isDarkMode
          ? '0 25px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          : '0 25px 50px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
        borderRadius: '1rem'
      }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className={`text-3xl font-bold ${
              isDarkMode 
                ? 'text-white' 
                : 'text-gray-900'
            }`}>
              NeoRP Project Planning
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Debug indicator - remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <div className={`px-2 py-1 rounded text-xs font-mono border ${
                isDarkMode 
                  ? 'bg-red-900 text-red-200 border-red-700' 
                  : 'bg-red-100 text-red-800 border-red-300'
              }`}>
                {isDarkMode ? 'DARK' : 'LIGHT'}
              </div>
            )}
            
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className={`btn-3d p-4 rounded-2xl transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/25'
              }`}
              style={{ borderRadius: '1rem' }}
            >
              <Settings size={24} />
            </button>
            
            <button
              onClick={toggleDarkMode}
              className={`btn-3d p-4 rounded-2xl transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-yellow-500 hover:bg-yellow-400 text-gray-900 shadow-yellow-500/25' 
                  : 'bg-gray-800 hover:bg-gray-700 text-yellow-400 shadow-gray-800/25'
              }`}
              style={{ borderRadius: '1rem' }}
            >
              {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board with explicit dark mode propagation */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {columnsWithCounts.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasks[column.id] || []}
              isHidden={hiddenColumns[column.id]}
              isDarkMode={isDarkMode} // CRITICAL: Pass down explicitly
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onCreateTask={createNewTask}
              onOpenTask={openTask}
              onToggleVisibility={toggleColumnVisibility}
              onDeleteTask={handleDeleteTask}
              draggedTask={draggedTask}
            />
          ))}
        </div>

        {/* Hidden Columns Toggle */}
        {Object.keys(hiddenColumns).some(key => hiddenColumns[key]) && (
          <div className={`mt-6 p-6 rounded-2xl border shadow-xl ${
            isDarkMode 
              ? 'dark-mode bg-gray-800/70 border-gray-700/50 backdrop-blur-xl' 
              : 'light-mode bg-white/80 border-gray-200/50 backdrop-blur-xl'
          }`} style={{ borderRadius: '1rem' }}>
            <h3 className={`text-lg font-semibold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Hidden Columns:
            </h3>
            <div className="flex flex-wrap gap-3">
              {columnsWithCounts.filter(col => hiddenColumns[col.id]).map(column => (
                <button
                  key={column.id}
                  onClick={() => toggleColumnVisibility(column.id)}
                  className={`px-4 py-2 rounded-xl ${column.color} text-white flex items-center space-x-2 hover:scale-105 transition-transform shadow-lg`}
                  style={{ borderRadius: '0.75rem' }}
                >
                  <Eye size={16} />
                  <span>{column.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* All modals with explicit dark mode classes */}
      {isModalOpen && selectedTask && (
        <TaskModal
          task={selectedTask}
          isOpen={isModalOpen}
          onClose={closeTask}
          onUpdate={loadAllTasks}
          isDarkMode={isDarkMode} // CRITICAL: Pass down explicitly
          allTasks={allTasks}
          onOpenLinkModal={handleOpenLinkModal}
          pomodoroSettings={pomodoroSettings}
        />
      )}

      {isLinkModalOpen && selectedTask && (
        <LinkModal
          isOpen={isLinkModalOpen}
          onClose={handleCloseLinkModal}
          selectedTask={selectedTask}
          allTasks={allTasks}
          onUpdate={loadAllTasks}
          onTaskUpdate={handleTaskUpdate}
          isDarkMode={isDarkMode} // CRITICAL: Pass down explicitly
        />
      )}

      {isSettingsModalOpen && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          pomodoroSettings={pomodoroSettings}
          onUpdateSettings={setPomodoroSettings}
          isDarkMode={isDarkMode} // CRITICAL: Pass down explicitly
        />
      )}
    </div>
  );
};

export default ProjectPlanningModule;