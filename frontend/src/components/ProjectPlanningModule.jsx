// Version 4

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Edit3, Trash2, Upload, Code, Image, FileText, Sun, Moon, Calendar, User, Clock, Link, X, Search, Play, Pause, RotateCcw, Eye, EyeOff, Timer, Settings, Bell } from 'lucide-react';

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
  const [isEditing, setIsEditing] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [notificationShown, setNotificationShown] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const editorRef = useRef(null);

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

  // Slash commands configuration
  const slashCommands = [
    { label: 'Heading 1', command: '# ', icon: '📝' },
    { label: 'Heading 2', command: '## ', icon: '📄' },
    { label: 'Heading 3', command: '### ', icon: '📃' },
    { label: 'Code Block', command: '```\n\n```', icon: '💻' },
    { label: 'Quote', command: '> ', icon: '💬' },
    { label: 'Bullet List', command: '- ', icon: '•' },
    { label: 'Numbered List', command: '1. ', icon: '🔢' },
    { label: 'Task List', command: '- [ ] ', icon: '☑️' },
    { label: 'Divider', command: '\n---\n', icon: '➖' },
  ];

  // Handle clipboard paste with better image support
  useEffect(() => {
    const handlePaste = async (e) => {
      if (!isModalOpen || !selectedTask || !isEditing) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          await handleImageFromClipboard(file);
          break;
        }
      }
    };

    if (isModalOpen && isEditing) {
      document.addEventListener('paste', handlePaste);
      return () => document.removeEventListener('paste', handlePaste);
    }
  }, [isModalOpen, selectedTask, editorContent, isEditing]);

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

  const handleImageFromClipboard = async (file) => {
    try {
      // Create a more robust image handler
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Resize image if too large
        const maxWidth = 800;
        const maxHeight = 600;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const imageMarkdown = `\n![Pasted Image](${dataUrl})\n`;
        
        // Insert at cursor position
        const cursorPosition = editorRef.current?.selectionStart || editorContent.length;
        const newContent = 
          editorContent.slice(0, cursorPosition) + 
          imageMarkdown + 
          editorContent.slice(cursorPosition);
        
        setEditorContent(newContent);
        
        // Update task
        const updatedTask = { ...selectedTask, description: newContent };
        setSelectedTask(updatedTask);
        updateTask(updatedTask);
      };
      
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error handling clipboard image:', error);
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

    setTimeout(() => saveTask(updatedTask), 500);
  };

  const deleteTask = async (taskId) => {
    const success = await deleteTaskById(taskId);
    if (success) {
      setTasks(prev => {
        const newTasks = { ...prev };
        for (const column in newTasks) {
          newTasks[column] = newTasks[column].filter(task => task.id !== taskId);
        }
        return newTasks;
      });
      setIsModalOpen(false);
      setSelectedTask(null);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    const fileData = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file)
    }));
    
    if (selectedTask) {
      const updatedTask = {
        ...selectedTask,
        files: [...selectedTask.files, ...fileData]
      };
      await updateTask(updatedTask);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0 && selectedTask) {
      const imageUrls = imageFiles.map(file => URL.createObjectURL(file));
      const imageMarkdown = imageUrls.map(url => `![Image](${url})`).join('\n\n');
      
      const updatedDescription = editorContent + '\n\n' + imageMarkdown;
      setEditorContent(updatedDescription);
      
      const updatedTask = {
        ...selectedTask,
        description: updatedDescription
      };
      await updateTask(updatedTask);
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
        setSelectedTask(task);
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

  const renderMarkdown = (text) => {
    return text
      .split('\n')
      .map((line, index) => {
        const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        if (imageMatch) {
          return (
            <img 
              key={index} 
              src={imageMatch[2]} 
              alt={imageMatch[1]} 
              className="max-w-full h-auto my-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-600"
            />
          );
        }

        const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          return (
            <p key={index} className="mb-3">
              <a 
                href={linkMatch[2]} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 underline decoration-blue-300 underline-offset-2"
              >
                {linkMatch[1]}
              </a>
            </p>
          );
        }

        const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          return (
            <p key={index} className="mb-3">
              <a 
                href={urlMatch[1]} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 underline decoration-blue-300 underline-offset-2 break-all"
              >
                {urlMatch[1]}
              </a>
            </p>
          );
        }

        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-3xl font-bold mb-4 mt-6 text-gray-900 dark:text-white">{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-2xl font-semibold mb-3 mt-5 text-gray-800 dark:text-gray-100">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-xl font-medium mb-2 mt-4 text-gray-700 dark:text-gray-200">{line.slice(4)}</h3>;
        }
        if (line.startsWith('```')) {
          return <div key={index} className="font-mono text-sm bg-gray-900 text-green-400 p-4 rounded-lg my-4 border-l-4 border-green-500 shadow-lg">{line}</div>;
        }
        if (line.startsWith('- [ ] ')) {
          return <div key={index} className="flex items-center mb-2"><input type="checkbox" className="mr-2" /><span>{line.slice(6)}</span></div>;
        }
        if (line.startsWith('- [x] ')) {
          return <div key={index} className="flex items-center mb-2"><input type="checkbox" checked className="mr-2" /><span className="line-through text-gray-500">{line.slice(6)}</span></div>;
        }
        if (line.startsWith('- ')) {
          return <li key={index} className="ml-6 list-disc mb-1 text-base leading-relaxed">{line.slice(2)}</li>;
        }
        if (line.startsWith('* ')) {
          return <li key={index} className="ml-6 list-disc mb-1 text-base leading-relaxed">{line.slice(2)}</li>;
        }
        if (line.match(/^\d+\. /)) {
          return <li key={index} className="ml-6 list-decimal mb-1 text-base leading-relaxed">{line.replace(/^\d+\. /, '')}</li>;
        }
        if (line.startsWith('> ')) {
          return <blockquote key={index} className="border-l-4 border-blue-500 pl-4 italic my-4 bg-blue-50 dark:bg-blue-900/20 py-3 rounded-r-lg text-base leading-relaxed">{line.slice(2)}</blockquote>;
        }
        if (line.trim() === '---') {
          return <hr key={index} className="my-6 border-gray-300 dark:border-gray-600" />;
        }
        if (line.trim() === '') {
          return <div key={index} className="h-4"></div>;
        }
        
        const processedLine = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded font-mono text-sm">$1</code>');
        
        return <p key={index} className="mb-3 leading-relaxed text-base" dangerouslySetInnerHTML={{__html: processedLine}}></p>;
      });
  };

  const handleSlashCommand = (command) => {
    const cursorPosition = editorRef.current?.selectionStart || editorContent.length;
    const beforeSlash = editorContent.lastIndexOf('/', cursorPosition - 1);
    
    const newContent = 
      editorContent.slice(0, beforeSlash) + 
      command + 
      editorContent.slice(cursorPosition);
    
    setEditorContent(newContent);
    setShowSlashMenu(false);
    
    const updatedTask = { ...selectedTask, description: newContent };
    setSelectedTask(updatedTask);
    updateTask(updatedTask);
    
    setTimeout(() => {
      editorRef.current?.focus();
      const newCursorPos = beforeSlash + command.length;
      editorRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleEditorKeyDown = (e) => {
    if (e.key === '/') {
      setTimeout(() => {
        const rect = editorRef.current?.getBoundingClientRect();
        if (rect) {
          setSlashMenuPosition({
            x: rect.left + 20,
            y: rect.top + 40
          });
          setShowSlashMenu(true);
        }
      }, 0);
    } else if (e.key === 'Escape') {
      setShowSlashMenu(false);
      if (isEditing) {
        setIsEditing(false);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newValue = editorContent.substring(0, start) + '  ' + editorContent.substring(end);
      setEditorContent(newValue);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    } else {
      setShowSlashMenu(false);
    }
  };

  // Enhanced Notion-style editor component
  const NotionStyleEditor = ({ value, onChange, isDarkMode }) => {
    const [localValue, setLocalValue] = useState(value);
    const textareaRef = useRef(null);

    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    useEffect(() => {
      const timer = setTimeout(() => {
        if (localValue !== value && localValue.trim()) {
          onChange(localValue);
        }
      }, 500);
      return () => clearTimeout(timer);
    }, [localValue, onChange, value]);

    const handleClick = () => {
      setIsEditing(true);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(localValue.length, localValue.length);
        }
      }, 0);
    };

    const handleChange = (e) => {
      setLocalValue(e.target.value);
    };

    const handleBlur = (e) => {
      // Only blur if clicking outside the editor area
      const relatedTarget = e.relatedTarget;
      if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
        setTimeout(() => setIsEditing(false), 150);
      }
    };

    return (
      <div className="h-full relative">
        <div className="flex justify-between items-center mb-6 p-4 glass-container">
          <div className="flex items-center space-x-3">
            <Edit3 size={18} className="text-blue-500" />
            <span className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Task Documentation
            </span>
            <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
              {isEditing ? 'Editing' : 'Viewing'} • Ctrl+V to paste images
            </span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => imageInputRef.current?.click()}
              className="btn-3d bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-all duration-200"
            >
              <Image size={16} />
              <span>Upload Image</span>
            </button>
          </div>
        </div>

        <div 
          className={`relative h-[calc(100%-5rem)] overflow-y-auto ${
            isEditing ? 'editing' : 'viewing'
          }`}
          onClick={handleClick}
        >
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={localValue}
              onChange={handleChange}
              onKeyDown={handleEditorKeyDown}
              onBlur={handleBlur}
              className={`absolute inset-0 w-full h-full p-8 border-none outline-none resize-none text-lg leading-relaxed glass-container focus-glow ${
                isDarkMode 
                  ? 'bg-gray-800/50 text-white' 
                  : 'bg-white/50 text-gray-900'
              }`}
              placeholder="Start writing your documentation... Type / for commands"
              style={{ 
                fontFamily: '"Inter", "SF Pro Text", -apple-system, BlinkMacSystemFont, sans-serif',
                backdropFilter: 'blur(10px)'
              }}
            />
          ) : (
            <div
              className={`w-full h-full p-8 cursor-text glass-container hover:focus-glow transition-all duration-200 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              {localValue ? (
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  {renderMarkdown(localValue)}
                </div>
              ) : (
                <div className="text-gray-400 italic text-xl">
                  Click here to start documenting your task...
                </div>
              )}
            </div>
          )}
        </div>

        {showSlashMenu && (
          <div 
            className="fixed z-50 glass-container border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-md"
            style={{ 
              left: slashMenuPosition.x, 
              top: slashMenuPosition.y,
              minWidth: '200px'
            }}
          >
            <div className="p-2">
              {slashCommands.map((cmd, index) => (
                <button
                  key={index}
                  onClick={() => handleSlashCommand(cmd.command)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors"
                >
                  <span className="text-lg">{cmd.icon}</span>
                  <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{cmd.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>
    );
  };

  const AppManagerModal = ({ apps, onSave, onClose }) => {
    const [selectedApps, setSelectedApps] = useState(apps || []);
    
    const availableApps = [
      'VSCode', 'Terminal', 'Firefox', 'Chrome', 'NeoRP', 'Gazebo', 
      'Slack', 'Discord', 'Figma', 'Postman', 'Docker', 'Git'
    ];

    const toggleApp = (app) => {
      setSelectedApps(prev => 
        prev.includes(app) 
          ? prev.filter(a => a !== app)
          : [...prev, app]
      );
    };

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="glass-container max-w-md w-full rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-gray-200/20 dark:border-gray-600/20">
            <div className="flex justify-between items-center">
              <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Allowed Applications
              </h3>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 gap-3">
              {availableApps.map(app => (
                <label key={app} className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedApps.includes(app)}
                    onChange={() => toggleApp(app)}
                    className="rounded-md text-blue-500 focus:ring-blue-500"
                  />
                  <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{app}</span>
                </label>
              ))}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => onSave(selectedApps)}
                className="btn-3d bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl transition-all duration-200"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const LinkModal = () => {
    const filteredTasks = allTasks.filter(task => 
      task.id !== selectedTask?.id && 
      task.title.toLowerCase().includes(linkSearchTerm.toLowerCase())
    );

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="glass-container max-w-md w-full rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-gray-200/20 dark:border-gray-600/20">
            <div className="flex justify-between items-center">
              <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Link Task
              </h3>
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <X size={20} />
              </button>
            </div>
            <div className="mt-4">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks to link..."
                  value={linkSearchTerm}
                  onChange={(e) => setLinkSearchTerm(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                    isDarkMode 
                      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto p-6">
            {filteredTasks.map(task => (
              <div
                key={task.id}
                className={`p-4 border rounded-xl mb-3 cursor-pointer hover:bg-opacity-80 transition-all transform hover:scale-[1.02] ${
                  isDarkMode ? 'border-gray-600/50 hover:bg-gray-700/30' : 'border-gray-200/50 hover:bg-gray-50/50'
                }`}
                onClick={async () => {
                  await linkTasks(selectedTask.id, task.id);
                  setIsLinkModalOpen(false);
                  setLinkSearchTerm('');
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">{task.id}</div>
                    <div className={`font-medium text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {task.title}
                    </div>
                    <div className="text-sm text-gray-500 capitalize mt-1">{task.status.replace('-', ' ')}</div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)} shadow-lg`}></div>
                </div>
              </div>
            ))}
            {filteredTasks.length === 0 && (
              <div className="text-center text-gray-500 py-8">
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
      className={`glass-container border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-5 mb-4 cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:focus-glow ${
        isDarkMode ? 'bg-gray-800/30' : 'bg-white/30'
      }`}
      draggable
      onDragStart={(e) => handleDragStart(e, task, columnId)}
      onClick={() => {
        setSelectedTask(task);
        setEditorContent(task.description || '');
        setIsModalOpen(true);
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-2 font-mono">{task.id}</div>
          <h3 className={`font-semibold text-lg leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {task.title}
          </h3>
        </div>
        <div className={`w-4 h-4 rounded-full ${getPriorityColor(task.priority)} shadow-lg ring-2 ring-white dark:ring-gray-800`}></div>
      </div>
      
      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4 line-clamp-2 leading-relaxed`}>
        {task.description?.split('\n')[0]?.replace(/^#+\s*/, '') || 'No description'}
      </p>
      
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center space-x-3">
          {task.assignee && (
            <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
              <User size={12} />
              <span>{task.assignee}</span>
            </div>
          )}
          {task.dueDate && (
            <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
              <Calendar size={12} />
              <span>{task.dueDate}</span>
            </div>
          )}
          {timeSpent[task.id] && (
            <div className="flex items-center space-x-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
              <Timer size={12} />
              <span>{formatTime(timeSpent[task.id])}</span>
            </div>
          )}
        </div>
        {task.files?.length > 0 && (
          <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
            <FileText size={12} />
            <span>{task.files.length}</span>
          </div>
        )}
      </div>
    </div>
  );

  const [isAppManagerOpen, setIsAppManagerOpen] = useState(false);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
    }`}>
      {/* Enhanced Header */}
      <div className="glass-container p-6 m-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
        <div className="flex justify-between items-center">
          <div>
            <h1 className={`text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
              NeoRP Project Planning
            </h1>
            <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
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
              className={`glass-container rounded-2xl shadow-xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50 ${
                hiddenColumns[column.id] ? 'hidden' : ''
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
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
          <div className="mt-6 glass-container p-6 rounded-2xl">
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="glass-container rounded-3xl w-[95vw] h-[95vh] overflow-hidden shadow-2xl border border-gray-200/50 dark:border-gray-700/50 flex flex-col">
            {/* Modal Header */}
            <div className="glass-container p-8 border-b border-gray-200/30 dark:border-gray-600/30 flex-shrink-0">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <input
                    type="text"
                    value={selectedTask.title}
                    onChange={(e) => setSelectedTask({...selectedTask, title: e.target.value})}
                    onBlur={() => updateTask(selectedTask)}
                    className={`text-3xl font-bold w-full bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500/50 rounded-lg p-2 -m-2 transition-all ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}
                  />
                  <div className="flex items-center space-x-8 mt-4">
                    <div className="flex items-center space-x-3">
                      <User size={18} className="text-gray-400" />
                      <input
                        type="text"
                        placeholder="Assignee"
                        value={selectedTask.assignee}
                        onChange={(e) => setSelectedTask({...selectedTask, assignee: e.target.value})}
                        onBlur={() => updateTask(selectedTask)}
                        className={`bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500/50 rounded-lg p-2 -m-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                      />
                    </div>
                    <div className="flex items-center space-x-3">
                      <Calendar size={18} className="text-gray-400" />
                      <input
                        type="date"
                        value={selectedTask.dueDate}
                        onChange={(e) => setSelectedTask({...selectedTask, dueDate: e.target.value})}
                        onBlur={() => updateTask(selectedTask)}
                        className={`bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500/50 rounded-lg p-2 -m-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                      />
                    </div>
                    <select
                      value={selectedTask.priority}
                      onChange={(e) => {
                        const updatedTask = {...selectedTask, priority: e.target.value};
                        setSelectedTask(updatedTask);
                        updateTask(updatedTask);
                      }}
                      className={`bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500/50 rounded-lg p-2 -m-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                </div>
                
                {/* Enhanced Timer Controls */}
                <div className="flex items-center space-x-6 mr-8">
                  <div className="text-right glass-container p-4 rounded-2xl">
                    <div className="flex items-center space-x-4 mb-2">
                      <label className="text-sm text-gray-500">Mode:</label>
                      <select
                        value={timerMode}
                        onChange={(e) => {
                          setTimerMode(e.target.value);
                          if (e.target.value === 'countdown') {
                            setCurrentTimerTime(pomodoroTime);
                          }
                        }}
                        className="text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1"
                      >
                        <option value="countup">Count Up</option>
                        <option value="countdown">Pomodoro</option>
                      </select>
                    </div>
                    
                    {timerMode === 'countdown' && (
                      <div className="flex items-center space-x-4 mb-2">
                        <label className="text-sm text-gray-500">Minutes:</label>
                        <input
                          type="number"
                          value={Math.floor(pomodoroTime / 60)}
                          onChange={(e) => setPomodoroTime(Math.max(1, parseInt(e.target.value) || 25) * 60)}
                          className="text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 w-16"
                          min="1"
                          max="120"
                        />
                      </div>
                    )}
                    
                    <div className={`text-2xl font-mono mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'} ${
                      activeTimer === selectedTask.id ? 'text-green-500 animate-pulse' : ''
                    }`}>
                      {timerMode === 'countdown' 
                        ? formatTime(currentTimerTime)
                        : formatTime(timeSpent[selectedTask.id] || 0)
                      }
                    </div>
                    <div className="text-sm text-gray-500 mb-3">
                      Total: {formatTime(timeSpent[selectedTask.id] || 0)}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={toggleTimer}
                        className={`btn-3d p-3 rounded-xl transition-all duration-200 ${
                          activeTimer === selectedTask.id 
                            ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/25' 
                            : 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/25'
                        }`}
                        title={activeTimer === selectedTask.id ? 'Pause Timer' : 'Start Timer'}
                      >
                        {activeTimer === selectedTask.id ? <Pause size={20} /> : <Play size={20} />}
                      </button>
                      <button
                        onClick={resetTimer}
                        className="btn-3d bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-xl shadow-gray-500/25 transition-all duration-200"
                        title="Reset Session Timer"
                      >
                        <RotateCcw size={20} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => updateTask(selectedTask)}
                    className="btn-3d bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-amber-500/25"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsLinkModalOpen(true)}
                    className="btn-3d bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-xl transition-all duration-200 shadow-blue-500/25"
                  >
                    <Link size={20} />
                  </button>
                  <button
                    onClick={() => setIsAppManagerOpen(true)}
                    className="btn-3d bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-xl transition-all duration-200 shadow-purple-500/25"
                  >
                    <Settings size={20} />
                  </button>
                  <button
                    onClick={() => deleteTask(selectedTask.id)}
                    className="btn-3d bg-red-500 hover:bg-red-600 text-white p-3 rounded-xl transition-all duration-200 shadow-red-500/25"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className={`p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Main Editor */}
              <div className="flex-1 p-2">
                <NotionStyleEditor 
                  value={editorContent}
                  onChange={(value) => {
                    setEditorContent(value);
                    const updatedTask = {...selectedTask, description: value};
                    setSelectedTask(updatedTask);
                    updateTask(updatedTask);
                  }}
                  isDarkMode={isDarkMode}
                />
              </div>

              {/* Right Sidebar */}
              <div className="w-80 glass-container p-6 overflow-y-auto border-l border-gray-200/30 dark:border-gray-600/30">
                {/* Task Info */}
                <div className="mb-8">
                  <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Task Info
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <span className="text-gray-500">ID:</span>
                      <span className={`font-mono ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedTask.id}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <span className="text-gray-500">Status:</span>
                      <span className={`capitalize font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {selectedTask.status?.replace('-', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <span className="text-gray-500">Time Spent:</span>
                      <span className={`font-mono font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {formatTime(timeSpent[selectedTask.id] || 0)}
                      </span>
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
                      className="btn-3d bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-xl text-sm transition-all duration-200 flex items-center space-x-2 shadow-blue-500/25"
                    >
                      <Link size={14} />
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
                            className="glass-container p-4 rounded-xl cursor-pointer hover:scale-[1.02] transition-all duration-200 border border-gray-200/50 dark:border-gray-600/50"
                            onClick={() => openLinkedTask(linkedTaskId)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="text-xs text-gray-500 mb-1">{linkedTask.id}</div>
                                <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {linkedTask.title}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  unlinkTasks(selectedTask.id, linkedTaskId);
                                }}
                                className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center text-gray-500 py-8">
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
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-3d bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-xl text-sm transition-all duration-200 flex items-center space-x-2 shadow-green-500/25"
                    >
                      <Upload size={14} />
                      <span>Upload</span>
                    </button>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div className="space-y-3">
                    {selectedTask.files?.map((file) => (
                      <div
                        key={file.id}
                        className="glass-container p-4 rounded-xl border border-gray-200/50 dark:border-gray-600/50"
                      >
                        <div className="flex items-center space-x-3">
                          <FileText size={18} className="text-blue-500" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{file.name}</div>
                            <div className="text-xs text-gray-500">
                              {(file.size / 1024).toFixed(1)}KB
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!selectedTask.files || selectedTask.files.length === 0) && (
                      <div className="text-center text-gray-500 py-8">
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
      {isAppManagerOpen && (
        <AppManagerModal
          apps={selectedTask?.allowedApps || []}
          onSave={(apps) => {
            const updatedTask = { ...selectedTask, allowedApps: apps };
            setSelectedTask(updatedTask);
            updateTask(updatedTask);
            setIsAppManagerOpen(false);
          }}
          onClose={() => setIsAppManagerOpen(false)}
        />
      )}

      <style jsx>{`
        .glass-container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .dark .glass-container {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .btn-3d {
          box-shadow: 
            0 8px 16px rgba(0, 0, 0, 0.1),
            0 4px 8px rgba(0, 0, 0, 0.06);
          transform: translateY(0);
          transition: all 0.2s ease;
        }
        
        .btn-3d:hover {
          transform: translateY(-2px);
          box-shadow: 
            0 12px 24px rgba(0, 0, 0, 0.15),
            0 6px 12px rgba(0, 0, 0, 0.1);
        }
        
        .btn-3d:active {
          transform: translateY(0);
          box-shadow: 
            0 4px 8px rgba(0, 0, 0, 0.1),
            0 2px 4px rgba(0, 0, 0, 0.06);
        }
        
        .focus-glow {
          box-shadow: 
            0 0 0 2px rgba(59, 130, 246, 0.3),
            0 0 20px rgba(59, 130, 246, 0.2),
            0 8px 16px rgba(0, 0, 0, 0.1);
        }
        
        .editing .focus-glow,
        .editing:focus-within {
          box-shadow: 
            0 0 0 2px rgba(59, 130, 246, 0.5),
            0 0 30px rgba(59, 130, 246, 0.3),
            0 12px 24px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </div>
  );
};

export default ProjectPlanningModule;