// Version 6 - Enhanced with TipTap Block Editor

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Edit3, Trash2, Code, Image, FileText, Sun, Moon, Calendar, User, Clock, Link, X, Search, Play, Pause, RotateCcw, Eye, EyeOff, Timer, Bell } from 'lucide-react';
import BlockEditor from './BlockEditor';

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
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [hiddenColumns, setHiddenColumns] = useState({});
  const [activeTimer, setActiveTimer] = useState(null);
  const [timeSpent, setTimeSpent] = useState({});
  const [timerInterval, setTimerInterval] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [timerMode, setTimerMode] = useState('countup');
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [currentTimerTime, setCurrentTimerTime] = useState(0);
  const [notificationShown, setNotificationShown] = useState(false);

  // API Base URL
  const API_BASE = 'http://localhost:3001/api';

  // Enhanced notification sound (more soothing)
  const createNotificationSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Create a gentle bell-like sound
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  // Load tasks on component mount
  useEffect(() => {
    loadTasks();
  }, []);

  // Timer effect for both countup and countdown
  useEffect(() => {
    if (activeTimer && selectedTask && isModalOpen) {
      const interval = setInterval(() => {
        if (timerMode === 'countup') {
          setTimeSpent(prev => ({
            ...prev,
            [selectedTask.id]: (prev[selectedTask.id] || 0) + 1
          }));
        } else {
          setCurrentTimerTime(prev => {
            const newTime = prev - 1;
            if (newTime <= 0 && !notificationShown) {
              showPomodoroNotification();
              setNotificationShown(true);
              setActiveTimer(null);
              return 0;
            }
            return newTime;
          });
          
          setTimeSpent(prev => ({
            ...prev,
            [selectedTask.id]: (prev[selectedTask.id] || 0) + 1
          }));
        }
      }, 1000);
      setTimerInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
    }
  }, [activeTimer, selectedTask, isModalOpen, timerMode, notificationShown]);

  const showPomodoroNotification = () => {
    // Play soothing notification sound
    try {
      createNotificationSound();
    } catch (error) {
      console.log('Audio context not available');
    }
    
    // Browser notification
    if (Notification.permission === 'granted') {
      new Notification('🍅 Pomodoro Complete!', {
        body: 'Time to document your progress and take a break.',
        icon: '/favicon.ico',
        tag: 'pomodoro-complete'
      });
    }
    
    // Visual notification in app
    setTimeout(() => {
      alert('🍅 Pomodoro Complete!\n\nTime to document your progress and take a break.');
    }, 100);
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const loadTasks = async () => {
    try {
      const response = await fetch(`${API_BASE}/tasks`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
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
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const saveTask = async (task) => {
    try {
      const method = task.id.includes('temp-') ? 'POST' : 'PUT';
      const url = task.id.includes('temp-') ? `${API_BASE}/tasks` : `${API_BASE}/tasks/${task.id}`;
      
      const taskToSave = {
        ...task,
        status: findTaskColumn(task.id) || task.status || 'backlog'
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskToSave),
      });
      
      if (response.ok) {
        await loadTasks();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error saving task:', error);
      return false;
    }
  };

  const deleteTaskById = async (taskId) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await loadTasks();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    }
  };

  const linkTasks = async (fromTaskId, toTaskId) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${fromTaskId}/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ linkedTaskId: toTaskId }),
      });
      
      if (response.ok) {
        await loadTasks();
        const updatedTask = await fetch(`${API_BASE}/tasks/${fromTaskId}`).then(r => r.json());
        if (selectedTask && selectedTask.id === fromTaskId) {
          setSelectedTask(updatedTask);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error linking tasks:', error);
      return false;
    }
  };

  const unlinkTasks = async (fromTaskId, toTaskId) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${fromTaskId}/unlink`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ linkedTaskId: toTaskId }),
      });
      
      if (response.ok) {
        await loadTasks();
        const updatedTask = await fetch(`${API_BASE}/tasks/${fromTaskId}`).then(r => r.json());
        if (selectedTask && selectedTask.id === fromTaskId) {
          setSelectedTask(updatedTask);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unlinking tasks:', error);
      return false;
    }
  };

  const findTaskColumn = (taskId) => {
    for (const [column, columnTasks] of Object.entries(tasks)) {
      if (columnTasks.find(task => task.id === taskId)) {
        return column;
      }
    }
    return null;
  };

  const columns = [
    { id: 'backlog', title: 'Backlog', color: 'bg-amber-500', count: tasks.backlog.length },
    { id: 'planned', title: 'Planned', color: 'bg-blue-500', count: tasks.planned.length },
    { id: 'in-progress', title: 'In Progress', color: 'bg-orange-500', count: tasks['in-progress'].length },
    { id: 'under-review', title: 'Under Review', color: 'bg-purple-500', count: tasks['under-review'].length },
    { id: 'completed', title: 'Completed', color: 'bg-green-500', count: tasks.completed.length },
    { id: 'cancelled', title: 'Cancelled', color: 'bg-red-500', count: tasks.cancelled.length }
  ];

  const handleDragStart = (e, task, fromColumn) => {
    setDraggedTask(task);
    setDraggedFrom(fromColumn);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, toColumn) => {
    e.preventDefault();
    if (draggedTask && draggedFrom && draggedFrom !== toColumn) {
      setTasks(prev => ({
        ...prev,
        [draggedFrom]: prev[draggedFrom].filter(task => task.id !== draggedTask.id),
        [toColumn]: [...prev[toColumn], { ...draggedTask, status: toColumn }]
      }));

      const updatedTask = { ...draggedTask, status: toColumn };
      await saveTask(updatedTask);
    }
    setDraggedTask(null);
    setDraggedFrom(null);
  };

  const generateTaskId = () => {
    return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const createNewTask = async (columnId) => {
    const tempId = generateTaskId();
    const newTask = {
      id: tempId,
      title: 'New Task',
      description: '# New Task\n\nTask description here...',
      assignee: '',
      priority: 'medium',
      dueDate: '',
      status: columnId,
      files: [],
      allowedApps: [],
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    setTasks(prev => ({
      ...prev,
      [columnId]: [...prev[columnId], newTask]
    }));

    const saved = await saveTask(newTask);
    if (!saved) {
      setTasks(prev => ({
        ...prev,
        [columnId]: prev[columnId].filter(task => task.id !== tempId)
      }));
    }
  };

  const updateTask = async (updatedTask) => {
    setTasks(prev => {
      const newTasks = { ...prev };
      for (const column in newTasks) {
        const taskIndex = newTasks[column].findIndex(task => task.id === updatedTask.id);
        if (taskIndex !== -1) {
          newTasks[column][taskIndex] = updatedTask;
          break;
        }
      }
      return newTasks;
    });

    if (selectedTask && selectedTask.id === updatedTask.id) {
      setSelectedTask(updatedTask);
    }

    saveTask(updatedTask); // Save immediately
  };

  const archiveTask = async (taskId) => {
    // Move task to cancelled status instead of deleting
    const taskToArchive = allTasks.find(task => task.id === taskId);
    if (taskToArchive) {
      const archivedTask = { ...taskToArchive, status: 'cancelled' };
      const success = await saveTask(archivedTask);
      if (success) {
        setIsModalOpen(false);
        setSelectedTask(null);
        await loadTasks(); // Reload to update the UI
      }
    }
  };

  const toggleTimer = () => {
    if (activeTimer) {
      setActiveTimer(null);
    } else {
      setActiveTimer(selectedTask?.id);
      setNotificationShown(false); // Reset notification flag
      if (timerMode === 'countdown' && currentTimerTime === 0) {
        setCurrentTimerTime(pomodoroTime);
      }
      requestNotificationPermission();
    }
  };

  const resetTimer = () => {
    setActiveTimer(null);
    setNotificationShown(false);
    if (timerMode === 'countdown') {
      setCurrentTimerTime(pomodoroTime);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleColumnVisibility = (columnId) => {
    setHiddenColumns(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  };

  const openLinkedTask = async (taskId) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`);
      const task = await response.json();
      if (task) {
        const editorContent = task.editorContent || parseMarkdownToTipTap(task.description);
        setSelectedTask({ ...task, editorContent });
        setEditorContent(task.description);
      }
    } catch (error) {
      console.error('Error loading linked task:', error);
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

  // Parse markdown to TipTap format
  const parseMarkdownToTipTap = (markdown) => {
    if (!markdown) return { type: 'doc', content: [{ type: 'paragraph' }] };
    
    // Simple parser - you might want to use a proper markdown parser
    const lines = markdown.split('\n');
    const content = [];
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      
      if (line.startsWith('# ')) {
        content.push({
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: line.slice(2) }]
        });
      } else if (line.startsWith('## ')) {
        content.push({
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: line.slice(3) }]
        });
      } else if (line.startsWith('### ')) {
        content.push({
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: line.slice(4) }]
        });
      } else if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
        // Handle task lists
        const taskItems = [];
        while (i < lines.length && (lines[i].startsWith('- [ ] ') || lines[i].startsWith('- [x] '))) {
          taskItems.push({
            type: 'taskItem',
            attrs: { checked: lines[i].startsWith('- [x] ') },
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: lines[i].slice(6) }]
            }]
          });
          i++;
        }
        i--; // Adjust for the outer loop increment
        content.push({
          type: 'taskList',
          content: taskItems
        });
      } else if (line.startsWith('- ')) {
        // Handle bullet lists
        const listItems = [];
        while (i < lines.length && lines[i].startsWith('- ')) {
          listItems.push({
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: lines[i].slice(2) }]
            }]
          });
          i++;
        }
        i--; // Adjust for the outer loop increment
        content.push({
          type: 'bulletList',
          content: listItems
        });
      } else if (line.match(/^\d+\. /)) {
        // Handle ordered lists
        const listItems = [];
        while (i < lines.length && lines[i].match(/^\d+\. /)) {
          listItems.push({
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: lines[i].replace(/^\d+\. /, '') }]
            }]
          });
          i++;
        }
        i--; // Adjust for the outer loop increment
        content.push({
          type: 'orderedList',
          content: listItems
        });
      } else if (line.startsWith('> ')) {
        content.push({
          type: 'blockquote',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: line.slice(2) }]
          }]
        });
      } else if (line === '---') {
        content.push({ type: 'horizontalRule' });
      } else if (line.startsWith('```')) {
        // Handle code blocks
        i++;
        let codeContent = '';
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeContent += lines[i] + '\n';
          i++;
        }
        content.push({
          type: 'codeBlock',
          content: codeContent ? [{ type: 'text', text: codeContent.trimEnd() }] : []
        });
      } else if (line.match(/!\[([^\]]*)\]\(([^)]+)\)/)) {
        const match = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        content.push({
          type: 'image',
          attrs: { src: match[2], alt: match[1] }
        });
      } else if (line.trim()) {
        content.push({
          type: 'paragraph',
          content: [{ type: 'text', text: line }]
        });
      }
      
      i++;
    }
    
    return {
      type: 'doc',
      content: content.length > 0 ? content : [{ type: 'paragraph' }]
    };
  };

  const LinkModal = () => {
    const filteredTasks = allTasks.filter(task => 
      task.id !== selectedTask?.id && 
      task.title.toLowerCase().includes(linkSearchTerm.toLowerCase())
    );

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className={`max-w-md w-full rounded-2xl overflow-hidden shadow-2xl border ${
          isDarkMode 
            ? 'bg-gray-800/80 border-gray-700/50 backdrop-blur-xl' 
            : 'bg-white/90 border-gray-200/50 backdrop-blur-xl'
        }`}>
          <div className={`p-6 border-b ${isDarkMode ? 'border-gray-600/20' : 'border-gray-200/20'}`}>
            <div className="flex justify-between items-center">
              <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Link Task
              </h3>
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
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
                  value={linkSearchTerm}
                  onChange={(e) => setLinkSearchTerm(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                    isDarkMode 
                      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white/80 border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto p-6">
            {filteredTasks.map(task => (
              <div
                key={task.id}
                className={`p-4 border rounded-xl mb-3 cursor-pointer transition-all transform hover:scale-[1.02] ${
                  isDarkMode 
                    ? 'border-gray-600/50 hover:bg-gray-700/30' 
                    : 'border-gray-200/50 hover:bg-gray-50/50'
                }`}
                onClick={async () => {
                  await linkTasks(selectedTask.id, task.id);
                  setIsLinkModalOpen(false);
                  setLinkSearchTerm('');
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{task.id}</div>
                    <div className={`font-medium text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {task.title}
                    </div>
                    <div className={`text-sm capitalize mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {task.status.replace('-', ' ')}
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)} shadow-lg`}></div>
                </div>
              </div>
            ))}
            {filteredTasks.length === 0 && (
              <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Search size={48} className="mx-auto mb-4 opacity-50" />
                <p>No tasks found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const TaskCard = ({ task, columnId }) => (
    <div
      className={`border rounded-2xl p-5 mb-4 cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg ${
        isDarkMode 
          ? 'bg-gray-800/70 border-gray-700/50 hover:bg-gray-800/80 backdrop-blur-xl' 
          : 'bg-white/80 border-gray-200/50 hover:bg-white/90 backdrop-blur-xl'
      }`}
      draggable
      onDragStart={(e) => handleDragStart(e, task, columnId)}
      onClick={() => {
        const editorContent = task.editorContent || parseMarkdownToTipTap(task.description);
        setSelectedTask({ ...task, editorContent });
        setEditorContent(task.description || '');
        setIsModalOpen(true);
      }}
      style={{
        backdropFilter: 'blur(10px)',
        boxShadow: isDarkMode
          ? '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          : '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className={`text-xs mb-2 font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{task.id}</div>
          <h3 className={`font-semibold text-lg leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
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
        {task.description?.split('\n')[0]?.replace(/^#+\s*/, '') || 'No description'}
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
              <span>{task.dueDate}</span>
            </div>
          )}
          {timeSpent[task.id] && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${
              isDarkMode ? 'bg-blue-900/80 text-blue-300' : 'bg-blue-100/80 text-blue-700'
            }`}>
              <Timer size={12} />
              <span>{formatTime(timeSpent[task.id])}</span>
            </div>
          )}
        </div>
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
  );

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
          : '0 25px 50px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
      }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className={`text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
              NeoRP Project Planning
            </h1>
            <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Professional task management with live documentation
            </p>
          </div>
          
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`btn-3d p-4 rounded-2xl transition-all duration-300 ${
              isDarkMode 
                ? 'bg-yellow-500 hover:bg-yellow-400 text-gray-900 shadow-yellow-500/25' 
                : 'bg-gray-800 hover:bg-gray-700 text-yellow-400 shadow-gray-800/25'
            }`}
          >
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {columns.map((column) => (
            <div
              key={column.id}
              className={`rounded-2xl shadow-xl overflow-hidden border ${
                hiddenColumns[column.id] ? 'hidden' : ''
              } ${
                isDarkMode 
                  ? 'bg-gray-800/70 border-gray-700/50 backdrop-blur-xl' 
                  : 'bg-white/80 border-gray-200/50 backdrop-blur-xl'
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              style={{
                backdropFilter: 'blur(15px)',
                boxShadow: isDarkMode
                  ? '0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                  : '0 20px 40px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
              }}
            >
              <div className={`${column.color} text-white p-6 bg-gradient-to-r`}>
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-lg">{column.title}</h2>
                  <div className="flex items-center space-x-3">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                      {column.count}
                    </span>
                    <button
                      onClick={() => toggleColumnVisibility(column.id)}
                      className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                    >
                      <EyeOff size={18} />
                    </button>
                    <button
                      onClick={() => createNewTask(column.id)}
                      className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 min-h-96">
                {tasks[column.id]?.map((task) => (
                  <TaskCard key={task.id} task={task} columnId={column.id} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Hidden Columns Toggle */}
        {Object.keys(hiddenColumns).some(key => hiddenColumns[key]) && (
          <div className={`mt-6 p-6 rounded-2xl border shadow-xl ${
            isDarkMode 
              ? 'bg-gray-800/70 border-gray-700/50 backdrop-blur-xl' 
              : 'bg-white/80 border-gray-200/50 backdrop-blur-xl'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Hidden Columns:
            </h3>
            <div className="flex flex-wrap gap-3">
              {columns.filter(col => hiddenColumns[col.id]).map(column => (
                <button
                  key={column.id}
                  onClick={() => toggleColumnVisibility(column.id)}
                  className={`px-4 py-2 rounded-xl ${column.color} text-white flex items-center space-x-2 hover:scale-105 transition-transform shadow-lg`}
                >
                  <Eye size={16} />
                  <span>{column.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Full-Screen Task Detail Modal */}
      {isModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-50 overflow-hidden">
          <div className={`rounded-3xl w-[95vw] h-[95vh] shadow-2xl border flex flex-col ${
            isDarkMode 
              ? 'bg-gray-900/80 border-gray-700/50 backdrop-blur-xl' 
              : 'bg-white/90 border-gray-200/50 backdrop-blur-xl'
          }`} style={{
            backdropFilter: 'blur(20px)',
            boxShadow: isDarkMode
              ? '0 25px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              : '0 25px 50px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
          }}>
            {/* Compact Modal Header */}
            <div className={`px-6 py-3 border-b flex-shrink-0 ${
              isDarkMode ? 'border-gray-600/30 bg-gray-800/50' : 'border-gray-200/30 bg-white/50'
            }`}>
              <div className="flex justify-between items-center">
                {/* Left Side - Date Info */}
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                    <div className="text-xs">
                      <div className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                        Created: {selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                      <div className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                        Due: <input
                          type="date"
                          value={selectedTask.dueDate}
                          onChange={(e) => {
                            const updatedTask = {...selectedTask, dueDate: e.target.value};
                            setSelectedTask(updatedTask);
                            saveTask(updatedTask); // Remove setTimeout and save immediately
                          }}
                          className={`bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500/50 rounded px-1 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}
                        />
                      </div>
                      {selectedTask.dueDate && (
                        <div className={`text-xs ${
                          new Date(selectedTask.dueDate) < new Date() 
                            ? 'text-red-500' 
                            : new Date(selectedTask.dueDate) - new Date() < 7 * 24 * 60 * 60 * 1000
                              ? 'text-yellow-500'
                              : 'text-green-500'
                        }`}>
                          {(() => {
                            const today = new Date();
                            const dueDate = new Date(selectedTask.dueDate);
                            const diffTime = dueDate - today;
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            
                            if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
                            if (diffDays === 0) return 'Due today';
                            if (diffDays === 1) return 'Due tomorrow';
                            return `${diffDays} days remaining`;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                    <input
                      type="text"
                      placeholder="Assignee"
                      value={selectedTask.assignee}
                      onChange={(e) => {
                        const updatedTask = {...selectedTask, assignee: e.target.value};
                        setSelectedTask(updatedTask);
                        saveTask(updatedTask); // Remove setTimeout and save immediately
                      }}
                      className={`bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500/50 rounded px-2 py-1 w-24 text-sm ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    />
                  </div>
                </div>

                {/* Center - Title */}
                <div className="flex-1 text-center mx-8">
                  <input
                    type="text"
                    value={selectedTask.title}
                    onChange={(e) => {
                      const updatedTask = {...selectedTask, title: e.target.value};
                      setSelectedTask(updatedTask);
                      saveTask(updatedTask); // Remove setTimeout and save immediately
                    }}
                    className={`text-xl font-bold bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500/50 rounded-lg p-2 transition-all text-center w-full ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}
                  />
                </div>

                {/* Right Side - Actions */}
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedTask.priority}
                    onChange={(e) => {
                      const updatedTask = {...selectedTask, priority: e.target.value};
                      setSelectedTask(updatedTask);
                      updateTask(updatedTask);
                    }}
                    className={`bg-transparent border border-gray-300 dark:border-gray-600 outline-none focus:ring-1 focus:ring-blue-500/50 rounded-lg px-2 py-1 text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                  <button
                    onClick={() => setIsLinkModalOpen(true)}
                    className="btn-3d bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-xl transition-all duration-200"
                    title="Link Tasks"
                  >
                    <Link size={18} />
                  </button>
                  <button
                    onClick={() => archiveTask(selectedTask.id)}
                    className="btn-3d bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-xl transition-all duration-200"
                    title="Archive Task"
                  >
                    📦
                  </button>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className={`p-2 rounded-xl transition-colors ${
                      isDarkMode 
                        ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
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
                      value={selectedTask.editorContent}
                      onChange={(content) => {
                        // Convert TipTap JSON to markdown for backward compatibility
                        const convertToMarkdown = (json) => {
                          if (typeof json === 'string') return json;
                          
                          let markdown = '';
                          const processNode = (node) => {
                            if (!node) return '';
                            
                            switch (node.type) {
                              case 'heading':
                                const level = node.attrs?.level || 1;
                                const prefix = '#'.repeat(level);
                                markdown += `${prefix} ${node.content?.[0]?.text || ''}\n\n`;
                                break;
                              case 'paragraph':
                                markdown += `${node.content?.map(n => n.text || '').join('') || ''}\n\n`;
                                break;
                              case 'bulletList':
                                node.content?.forEach(item => {
                                  const text = item.content?.[0]?.content?.[0]?.text || '';
                                  markdown += `- ${text}\n`;
                                });
                                markdown += '\n';
                                break;
                              case 'orderedList':
                                node.content?.forEach((item, index) => {
                                  const text = item.content?.[0]?.content?.[0]?.text || '';
                                  markdown += `${index + 1}. ${text}\n`;
                                });
                                markdown += '\n';
                                break;
                              case 'taskList':
                                node.content?.forEach(item => {
                                  const checked = item.attrs?.checked ? 'x' : ' ';
                                  const text = item.content?.[0]?.content?.[0]?.text || '';
                                  markdown += `- [${checked}] ${text}\n`;
                                });
                                markdown += '\n';
                                break;
                              case 'blockquote':
                                const quoteText = node.content?.[0]?.content?.[0]?.text || '';
                                markdown += `> ${quoteText}\n\n`;
                                break;
                              case 'codeBlock':
                                markdown += '```\n';
                                markdown += node.content?.map(n => n.text || '').join('') || '';
                                markdown += '\n```\n\n';
                                break;
                              case 'horizontalRule':
                                markdown += '---\n\n';
                                break;
                              case 'image':
                                markdown += `![Image](${node.attrs?.src || ''})\n\n`;
                                break;
                              default:
                                if (node.content) {
                                  node.content.forEach(processNode);
                                }
                            }
                          };
                          
                          if (json.content) {
                            json.content.forEach(processNode);
                          }
                          
                          return markdown.trim();
                        };
                        
                        const markdownContent = convertToMarkdown(content);
                        const updatedTask = {
                          ...selectedTask, 
                          description: markdownContent,
                          editorContent: content // Store the JSON for editor
                        };
                        setSelectedTask(updatedTask);
                        updateTask(updatedTask);
                      }}
                      isDarkMode={isDarkMode}
                      selectedTask={selectedTask}
                      updateTask={updateTask}
                    />
                  </div>
                </div>
              </div>

              {/* Right Sidebar with increased opacity */}
              <div className={`w-80 p-6 border-l overflow-y-auto ${
                isDarkMode 
                  ? 'border-gray-600/30 bg-gray-800/80 backdrop-blur-xl' 
                  : 'border-gray-200/30 bg-white/90 backdrop-blur-xl'
              }`}>
                {/* Task Info */}
                <div className="mb-8">
                  <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Task Info
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className={`flex justify-between p-3 rounded-xl ${
                      isDarkMode ? 'bg-gray-700/80' : 'bg-gray-50/90'
                    }`}>
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>ID:</span>
                      <span className={`font-mono ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedTask.id}</span>
                    </div>
                    <div className={`flex justify-between p-3 rounded-xl ${
                      isDarkMode ? 'bg-gray-700/80' : 'bg-gray-50/90'
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
                        : 'bg-gray-50/90 border-gray-200/50'
                    }`}>
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <label className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {timerMode === 'countup' ? 'Flow Timer' : 'Pomodoro Timer'}
                          </label>
                          <select
                            value={timerMode}
                            onChange={(e) => {
                              setTimerMode(e.target.value);
                              if (e.target.value === 'countdown') {
                                setCurrentTimerTime(pomodoroTime);
                              }
                            }}
                            className={`text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}
                          >
                            <option value="countup">Flow</option>
                            <option value="countdown">Pomodoro</option>
                          </select>
                        </div>
                        
                        <div className={`text-2xl font-mono mb-3 ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        } ${activeTimer === selectedTask.id ? 'text-green-500 animate-pulse' : ''}`}>
                          {timerMode === 'countdown' 
                            ? formatTime(currentTimerTime)
                            : formatTime(timeSpent[selectedTask.id] || 0)
                          }
                        </div>
                        
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={toggleTimer}
                            className={`p-2 rounded-lg transition-all duration-200 ${
                              activeTimer === selectedTask.id 
                                ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                                : 'bg-green-500 hover:bg-green-600 text-white'
                            }`}
                            title={activeTimer === selectedTask.id ? 'Pause Timer' : 'Start Timer'}
                          >
                            {activeTimer === selectedTask.id ? <Pause size={18} /> : <Play size={18} />}
                          </button>
                          <button
                            onClick={resetTimer}
                            className={`p-2 rounded-lg transition-all duration-200 ${
                              isDarkMode 
                                ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                                : 'bg-gray-500 hover:bg-gray-600 text-white'
                            }`}
                            title="Reset Timer"
                          >
                            <RotateCcw size={18} />
                          </button>
                        </div>
                        
                        <div className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Total: {formatTime(timeSpent[selectedTask.id] || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Linked Tasks */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Linked Tasks
                    </h3>
                    <button
                      onClick={() => setIsLinkModalOpen(true)}
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
                                <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{linkedTask.id}</div>
                                <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {linkedTask.title}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  unlinkTasks(selectedTask.id, linkedTaskId);
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

                {/* File Attachments */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Attachments
                    </h3>
                  </div>
                  
                  <div className="space-y-3">
                    {selectedTask.files?.map((file) => (
                      <div
                        key={file.id}
                        className={`p-4 rounded-xl border ${
                          isDarkMode 
                            ? 'bg-gray-700/70 border-gray-600/50' 
                            : 'bg-white/80 border-gray-200/50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <FileText size={18} className="text-blue-500" />
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>{file.name}</div>
                            <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {(file.size / 1024).toFixed(1)}KB
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!selectedTask.files || selectedTask.files.length === 0) && (
                      <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <FileText size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No files attached</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Modals */}
      {isLinkModalOpen && <LinkModal />}
    </div>
  );
};

export default ProjectPlanningModule;