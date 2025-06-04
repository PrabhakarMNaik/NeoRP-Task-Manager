// Version 8 - Performance optimized main component

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

  const handleDragStart = (e, task, fromColumn) => {
    setDraggedTask(task);
    setDraggedFrom(fromColumn);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, toColumn) => {
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
        }
      } catch (error) {
        console.error('Error updating task status:', error);
        loadAllTasks();
      }
    }
    setDraggedTask(null);
    setDraggedFrom(null);
  };

  const createNewTask = async (columnId) => {
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
  };

  const openTask = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const closeTask = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
    TimerManager.pauseTimer(); // Pause timer when closing task
  };

  const toggleColumnVisibility = (columnId) => {
    setHiddenColumns(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
    }`}>
      {/* Enhanced Header */}
      <div className={`p-6 m-6 rounded-2xl border shadow-xl ${
        isDarkMode 
          ? 'bg-gray-800/70 border-gray-700/50 backdrop-blur-xl' 
          : 'bg-white/80 border-gray-200/50 backdrop-blur-xl'
      }`} style={{
        backdropFilter: 'blur(20px)',
        boxShadow: isDarkMode
          ? '0 25px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          : '0 25px 50px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
        borderRadius: '1rem'
      }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              NeoRP Project Planning
            </h1>
            <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Professional task management with live documentation
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
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
              onClick={() => setIsDarkMode(!isDarkMode)}
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

      {/* Kanban Board */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {columnsWithCounts.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasks[column.id] || []}
              isHidden={hiddenColumns[column.id]}
              isDarkMode={isDarkMode}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onCreateTask={createNewTask}
              onOpenTask={openTask}
              onToggleVisibility={toggleColumnVisibility}
              draggedTask={draggedTask}
            />
          ))}
        </div>

        {/* Hidden Columns Toggle */}
        {Object.keys(hiddenColumns).some(key => hiddenColumns[key]) && (
          <div className={`mt-6 p-6 rounded-2xl border shadow-xl ${
            isDarkMode 
              ? 'bg-gray-800/70 border-gray-700/50 backdrop-blur-xl' 
              : 'bg-white/80 border-gray-200/50 backdrop-blur-xl'
          }`} style={{ borderRadius: '1rem' }}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
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

      {/* Task Detail Modal */}
      {isModalOpen && selectedTask && (
        <TaskModal
          task={selectedTask}
          isOpen={isModalOpen}
          onClose={closeTask}
          onUpdate={loadAllTasks}
          isDarkMode={isDarkMode}
          allTasks={allTasks}
          onOpenLinkModal={() => setIsLinkModalOpen(true)}
          pomodoroSettings={pomodoroSettings}
        />
      )}

      {/* Link Modal */}
      {isLinkModalOpen && selectedTask && (
        <LinkModal
          isOpen={isLinkModalOpen}
          onClose={() => setIsLinkModalOpen(false)}
          selectedTask={selectedTask}
          allTasks={allTasks}
          onUpdate={loadAllTasks}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          pomodoroSettings={pomodoroSettings}
          onUpdateSettings={setPomodoroSettings}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

export default ProjectPlanningModule;