import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Edit3, Trash2, Upload, Code, Image, FileText, Sun, Moon, Calendar, User, Clock, Link, X, Search, Play, Pause, Square, Eye, EyeOff, Timer, Settings, Bell, RotateCcw } from 'lucide-react';

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
  const [timerMode, setTimerMode] = useState('countup'); // 'countup' or 'countdown'
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60); // 25 minutes in seconds
  const [currentTimerTime, setCurrentTimerTime] = useState(0);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const editorRef = useRef(null);

  // API Base URL
  const API_BASE = 'http://localhost:3001/api';

  // Load tasks on component mount
  useEffect(() => {
    loadTasks();
  }, []);

  // Timer effect for both countup and countdown
  useEffect(() => {
    if (activeTimer && selectedTask && isModalOpen) {
      const interval = setInterval(() => {
        if (timerMode === 'countup') {
          // Count up timer - traditional time tracking
          setTimeSpent(prev => ({
            ...prev,
            [selectedTask.id]: (prev[selectedTask.id] || 0) + 1
          }));
        } else {
          // Count down timer - pomodoro style
          setCurrentTimerTime(prev => {
            const newTime = prev - 1;
            if (newTime <= 0) {
              // Timer finished - show notification
              showPomodoroNotification();
              setActiveTimer(null);
              return 0;
            }
            return newTime;
          });
          
          // Also increment total time spent
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
  }, [activeTimer, selectedTask, isModalOpen, timerMode]);

  // Handle clipboard paste for images
  useEffect(() => {
    const handlePaste = async (e) => {
      if (!isModalOpen || !selectedTask) return;
      
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

    if (isModalOpen) {
      document.addEventListener('paste', handlePaste);
      return () => document.removeEventListener('paste', handlePaste);
    }
  }, [isModalOpen, selectedTask, editorContent]);

  const showPomodoroNotification = () => {
    // Browser notification
    if (Notification.permission === 'granted') {
      new Notification('Pomodoro Complete!', {
        body: 'Time to document your progress and take a break.',
        icon: '/favicon.ico'
      });
    }
    
    // Audio notification
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmYgBziOqLT');
    audio.play().catch(() => {}); // Ignore errors if audio can't play
    
    // Visual notification in app
    alert('🍅 Pomodoro Complete!\n\nTime to document your progress and take a break.');
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const handleImageFromClipboard = async (file) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target.result;
        const imageMarkdown = `\n![Pasted Image](${imageUrl})\n`;
        
        // Insert at cursor position or append
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
      
      // Group tasks by status
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
        await loadTasks(); // Refresh tasks
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
        await loadTasks(); // Refresh tasks
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
        await loadTasks(); // Refresh tasks
        // Update the selected task to show new links
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
        await loadTasks(); // Refresh tasks
        // Update the selected task to show updated links
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
      // Update local state immediately
      setTasks(prev => ({
        ...prev,
        [draggedFrom]: prev[draggedFrom].filter(task => task.id !== draggedTask.id),
        [toColumn]: [...prev[toColumn], { ...draggedTask, status: toColumn }]
      }));

      // Save to backend
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
    
    // Add to local state immediately
    setTasks(prev => ({
      ...prev,
      [columnId]: [...prev[columnId], newTask]
    }));

    // Save to backend
    const saved = await saveTask(newTask);
    if (!saved) {
      // If save failed, remove from local state
      setTasks(prev => ({
        ...prev,
        [columnId]: prev[columnId].filter(task => task.id !== tempId)
      }));
    }
  };

  const updateTask = async (updatedTask) => {
    // Update local state immediately
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

    // Update selected task if it's the same
    if (selectedTask && selectedTask.id === updatedTask.id) {
      setSelectedTask(updatedTask);
    }

    // Save to backend (debounced)
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
      // Pause timer - don't reset time
      setActiveTimer(null);
    } else {
      // Start timer
      setActiveTimer(selectedTask?.id);
      if (timerMode === 'countdown' && currentTimerTime === 0) {
        setCurrentTimerTime(pomodoroTime);
      }
      // Request notification permission
      requestNotificationPermission();
    }
  };

  const resetTimer = () => {
    // Reset only resets the session timer, not total time spent
    setActiveTimer(null);
    if (timerMode === 'countdown') {
      setCurrentTimerTime(pomodoroTime);
    }
  };

  const resetTotalTime = () => {
    // This resets the total time spent on the task
    if (selectedTask) {
      setTimeSpent(prev => ({
        ...prev,
        [selectedTask.id]: 0
      }));
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
        // Handle images
        const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        if (imageMatch) {
          return (
            <img 
              key={index} 
              src={imageMatch[2]} 
              alt={imageMatch[1]} 
              className="max-w-full h-auto my-3 rounded-lg shadow-md"
            />
          );
        }

        // Handle links
        const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          return (
            <p key={index} className="mb-2">
              <a 
                href={linkMatch[2]} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 underline"
              >
                {linkMatch[1]}
              </a>
            </p>
          );
        }

        // Handle URLs
        const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          return (
            <p key={index} className="mb-2">
              <a 
                href={urlMatch[1]} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 underline break-all"
              >
                {urlMatch[1]}
              </a>
            </p>
          );
        }

        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-3xl font-bold mb-4 mt-6 border-b pb-2">{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-2xl font-semibold mb-3 mt-5">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-xl font-medium mb-2 mt-4">{line.slice(4)}</h3>;
        }
        if (line.startsWith('```')) {
          return <div key={index} className="font-mono text-sm bg-gray-700 text-green-400 p-4 rounded my-3 border-l-4 border-green-500">{line}</div>;
        }
        if (line.startsWith('- ')) {
          return <li key={index} className="ml-6 list-disc mb-1 text-base">{line.slice(2)}</li>;
        }
        if (line.startsWith('* ')) {
          return <li key={index} className="ml-6 list-disc mb-1 text-base">{line.slice(2)}</li>;
        }
        if (line.match(/^\d+\. /)) {
          return <li key={index} className="ml-6 list-decimal mb-1 text-base">{line.replace(/^\d+\. /, '')}</li>;
        }
        if (line.startsWith('> ')) {
          return <blockquote key={index} className="border-l-4 border-blue-500 pl-4 italic my-3 bg-blue-50 dark:bg-blue-900/20 py-3 rounded-r text-base">{line.slice(2)}</blockquote>;
        }
        if (line.trim() === '') {
          return <div key={index} className="h-4"></div>;
        }
        
        // Handle bold and italic
        const processedLine = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded font-mono text-sm">$1</code>');
        
        return <p key={index} className="mb-3 leading-relaxed text-base" dangerouslySetInnerHTML={{__html: processedLine}}></p>;
      });
  };

  // Notion-style inline editor component
  const NotionStyleEditor = ({ value, onChange, isDarkMode }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(value);
    const textareaRef = useRef(null);

    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    // Auto-save with debounce
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

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsEditing(false);
        textareaRef.current?.blur();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        const newValue = localValue.substring(0, start) + '  ' + localValue.substring(end);
        setLocalValue(newValue);
        setTimeout(() => {
          e.target.selectionStart = e.target.selectionEnd = start + 2;
        }, 0);
      }
    };

    const handleChange = (e) => {
      setLocalValue(e.target.value);
    };

    const handleBlur = () => {
      setTimeout(() => setIsEditing(false), 100);
    };

    return (
      <div className="h-full relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2">
            <Edit3 size={16} className="text-gray-500" />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Task Documentation
            </span>
            <span className="text-xs text-gray-500">
              (Click to edit, Ctrl+V to paste images)
            </span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => imageInputRef.current?.click()}
              className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded flex items-center space-x-1"
            >
              <Image size={12} />
              <span>Image</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div 
          className={`relative h-[calc(100%-4rem)] overflow-y-auto ${
            isEditing ? 'editing' : 'viewing'
          }`}
          onClick={handleClick}
        >
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={localValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className={`absolute inset-0 w-full h-full p-6 border-none outline-none resize-none font-mono text-base leading-relaxed ${
                isDarkMode 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-white text-gray-900'
              }`}
              placeholder="Start writing your documentation..."
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, monospace' }}
            />
          ) : (
            <div
              className={`w-full h-full p-6 cursor-text ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              {localValue ? (
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  {renderMarkdown(localValue)}
                </div>
              ) : (
                <div className="text-gray-500 italic text-lg">
                  Click here to start documenting your task...
                </div>
              )}
            </div>
          )}
        </div>

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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg max-w-md w-full`}>
          <div className={`p-4 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
            <div className="flex justify-between items-center">
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Allowed Apps
              </h3>
              <button
                onClick={onClose}
                className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2">
              {availableApps.map(app => (
                <label key={app} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedApps.includes(app)}
                    onChange={() => toggleApp(app)}
                    className="rounded"
                  />
                  <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{app}</span>
                </label>
              ))}
            </div>
            
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => onSave(selectedApps)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
              >
                Save
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg max-w-md w-full`}>
          <div className={`p-4 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
            <div className="flex justify-between items-center">
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Link Task
              </h3>
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <X size={20} />
              </button>
            </div>
            <div className="mt-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks to link..."
                  value={linkSearchTerm}
                  onChange={(e) => setLinkSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto p-4">
            {filteredTasks.map(task => (
              <div
                key={task.id}
                className={`p-3 border rounded-lg mb-2 cursor-pointer hover:bg-opacity-80 ${
                  isDarkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={async () => {
                  await linkTasks(selectedTask.id, task.id);
                  setIsLinkModalOpen(false);
                  setLinkSearchTerm('');
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-gray-500">{task.id}</div>
                    <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {task.title}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">{task.status.replace('-', ' ')}</div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}></div>
                </div>
              </div>
            ))}
            {filteredTasks.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No tasks found
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const TaskCard = ({ task, columnId }) => (
    <div
      className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} 
                  border rounded-lg p-4 mb-3 cursor-pointer hover:shadow-lg transition-all duration-200 
                  transform hover:scale-105`}
      draggable
      onDragStart={(e) => handleDragStart(e, task, columnId)}
      onClick={() => {
        setSelectedTask(task);
        setEditorContent(task.description || '');
        setIsModalOpen(true);
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-xs text-gray-500 mb-1">{task.id}</div>
          <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {task.title}
          </h3>
        </div>
        <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`}></div>
      </div>
      
      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-3 line-clamp-2`}>
        {task.description?.split('\n')[0]?.replace(/^#+\s*/, '') || 'No description'}
      </p>
      
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center space-x-2">
          {task.assignee && (
            <div className="flex items-center space-x-1">
              <User size={12} />
              <span>{task.assignee}</span>
            </div>
          )}
          {task.dueDate && (
            <div className="flex items-center space-x-1">
              <Calendar size={12} />
              <span>{task.dueDate}</span>
            </div>
          )}
          {timeSpent[task.id] && (
            <div className="flex items-center space-x-1">
              <Timer size={12} />
              <span>{formatTime(timeSpent[task.id])}</span>
            </div>
          )}
        </div>
        {task.files?.length > 0 && (
          <div className="flex items-center space-x-1">
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
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Header */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} 
                      border-b px-6 py-4`}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              NeoRP Project Planning
            </h1>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Agile task management with live documentation
            </p>
          </div>
          
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {columns.map((column) => (
            <div
              key={column.id}
              className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg ${
                hiddenColumns[column.id] ? 'hidden' : ''
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className={`${column.color} text-white p-4 rounded-t-lg`}>
                <div className="flex justify-between items-center">
                  <h2 className="font-semibold">{column.title}</h2>
                  <div className="flex items-center space-x-2">
                    <span className="bg-white bg-opacity-20 px-2 py-1 rounded text-xs">
                      {column.count}
                    </span>
                    <button
                      onClick={() => toggleColumnVisibility(column.id)}
                      className="hover:bg-white hover:bg-opacity-20 p-1 rounded"
                    >
                      <EyeOff size={16} />
                    </button>
                    <button
                      onClick={() => createNewTask(column.id)}
                      className="hover:bg-white hover:bg-opacity-20 p-1 rounded"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tasks */}
              <div className="p-4 min-h-96">
                {tasks[column.id]?.map((task) => (
                  <TaskCard key={task.id} task={task} columnId={column.id} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Hidden Columns Toggle */}
        {Object.keys(hiddenColumns).some(key => hiddenColumns[key]) && (
          <div className="mt-4">
            <h3 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Hidden Columns:
            </h3>
            <div className="flex flex-wrap gap-2">
              {columns.filter(col => hiddenColumns[col.id]).map(column => (
                <button
                  key={column.id}
                  onClick={() => toggleColumnVisibility(column.id)}
                  className={`px-3 py-1 rounded text-sm ${column.color} text-white flex items-center space-x-1`}
                >
                  <Eye size={14} />
                  <span>{column.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Full-Screen Task Detail Modal */}
      {isModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg w-[95vw] h-[95vh] overflow-hidden shadow-2xl flex flex-col`}>
            {/* Modal Header */}
            <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} p-6 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'} flex-shrink-0`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <input
                    type="text"
                    value={selectedTask.title}
                    onChange={(e) => setSelectedTask({...selectedTask, title: e.target.value})}
                    onBlur={() => updateTask(selectedTask)}
                    className={`text-2xl font-bold w-full bg-transparent border-none outline-none ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}
                  />
                  <div className="flex items-center space-x-6 mt-3">
                    <div className="flex items-center space-x-2">
                      <User size={16} />
                      <input
                        type="text"
                        placeholder="Assignee"
                        value={selectedTask.assignee}
                        onChange={(e) => setSelectedTask({...selectedTask, assignee: e.target.value})}
                        onBlur={() => updateTask(selectedTask)}
                        className={`bg-transparent border-none outline-none ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar size={16} />
                      <input
                        type="date"
                        value={selectedTask.dueDate}
                        onChange={(e) => setSelectedTask({...selectedTask, dueDate: e.target.value})}
                        onBlur={() => updateTask(selectedTask)}
                        className={`bg-transparent border-none outline-none ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                      />
                    </div>
                    <select
                      value={selectedTask.priority}
                      onChange={(e) => {
                        const updatedTask = {...selectedTask, priority: e.target.value};
                        setSelectedTask(updatedTask);
                        updateTask(updatedTask);
                      }}
                      className={`bg-transparent border-none outline-none ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                </div>
                
                {/* Timer Controls */}
                <div className="flex items-center space-x-4 mr-6">
                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-1">
                      <label className="text-xs text-gray-500">Mode:</label>
                      <select
                        value={timerMode}
                        onChange={(e) => {
                          setTimerMode(e.target.value);
                          if (e.target.value === 'countdown') {
                            setCurrentTimerTime(pomodoroTime);
                          }
                        }}
                        className="text-xs bg-transparent border border-gray-300 rounded px-1"
                      >
                        <option value="countup">Count Up</option>
                        <option value="countdown">Pomodoro</option>
                      </select>
                    </div>
                    
                    {timerMode === 'countdown' && (
                      <div className="flex items-center space-x-2 mb-1">
                        <label className="text-xs text-gray-500">Minutes:</label>
                        <input
                          type="number"
                          value={Math.floor(pomodoroTime / 60)}
                          onChange={(e) => setPomodoroTime(Math.max(1, parseInt(e.target.value) || 25) * 60)}
                          className="text-xs bg-transparent border border-gray-300 rounded px-1 w-12"
                          min="1"
                          max="120"
                        />
                      </div>
                    )}
                    
                    <div className={`text-xl font-mono ${isDarkMode ? 'text-white' : 'text-gray-900'} ${
                      activeTimer === selectedTask.id ? 'text-green-500' : ''
                    }`}>
                      {timerMode === 'countdown' 
                        ? formatTime(currentTimerTime)
                        : formatTime(timeSpent[selectedTask.id] || 0)
                      }
                    </div>
                    <div className="text-xs text-gray-500">
                      Total: {formatTime(timeSpent[selectedTask.id] || 0)}
                    </div>
                    <div className="flex space-x-1 mt-1">
                      <button
                        onClick={toggleTimer}
                        className={`p-1 rounded ${
                          activeTimer === selectedTask.id 
                            ? 'bg-orange-500 text-white' 
                            : 'bg-green-500 text-white'
                        }`}
                        title={activeTimer === selectedTask.id ? 'Pause Timer' : 'Start Timer'}
                      >
                        {activeTimer === selectedTask.id ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <button
                        onClick={resetTimer}
                        className="bg-gray-500 text-white p-1 rounded"
                        title="Reset Session Timer"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button
                        onClick={resetTotalTime}
                        className="bg-red-500 text-white p-1 rounded"
                        title="Reset Total Time"
                      >
                        <Square size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateTask(selectedTask)}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsLinkModalOpen(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors"
                  >
                    <Link size={16} />
                  </button>
                  <button
                    onClick={() => setIsAppManagerOpen(true)}
                    className="bg-purple-500 hover:bg-purple-600 text-white p-2 rounded-lg transition-colors"
                  >
                    <Settings size={16} />
                  </button>
                  <button
                    onClick={() => deleteTask(selectedTask.id)}
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} p-2`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Content - Three Column Layout */}
            <div className="flex-1 flex overflow-hidden">
              {/* Main Editor - Takes up most space */}
              <div className="flex-1">
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

              {/* Right Sidebar - Linked Tasks and Files */}
              <div className={`w-80 border-l ${isDarkMode ? 'border-gray-600 bg-gray-750' : 'border-gray-200 bg-gray-50'} p-6 overflow-y-auto`}>
                {/* Task Info */}
                <div className="mb-6">
                  <h3 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Task Info
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">ID:</span>
                      <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{selectedTask.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span className={`capitalize ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {selectedTask.status?.replace('-', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Time Spent:</span>
                      <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                        {formatTime(timeSpent[selectedTask.id] || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Linked Tasks */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Linked Tasks
                    </h3>
                    <button
                      onClick={() => setIsLinkModalOpen(true)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-colors flex items-center space-x-1"
                    >
                      <Link size={12} />
                      <span>Link</span>
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {selectedTask.linkedTasks && selectedTask.linkedTasks.length > 0 ? (
                      selectedTask.linkedTasks.map((linkedTaskId) => {
                        const linkedTask = allTasks.find(t => t.id === linkedTaskId);
                        if (!linkedTask) return null;
                        
                        return (
                          <div
                            key={linkedTaskId}
                            className={`p-2 border rounded cursor-pointer hover:bg-opacity-80 ${
                              isDarkMode ? 'border-gray-600 bg-gray-700 hover:bg-gray-600' : 'border-gray-200 bg-white hover:bg-gray-100'
                            }`}
                            onClick={() => openLinkedTask(linkedTaskId)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="text-xs text-gray-500">{linkedTask.id}</div>
                                <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {linkedTask.title}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  unlinkTasks(selectedTask.id, linkedTaskId);
                                }}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center text-gray-500 py-4 text-sm">
                        No linked tasks
                      </div>
                    )}
                  </div>
                </div>

                {/* File Attachments */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Attachments
                    </h3>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs transition-colors flex items-center space-x-1"
                    >
                      <Upload size={12} />
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

                  <div className="space-y-2">
                    {selectedTask.files?.map((file) => (
                      <div
                        key={file.id}
                        className={`flex items-center space-x-2 p-2 border rounded ${
                          isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <FileText size={14} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{file.name}</div>
                          <div className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(1)}KB
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!selectedTask.files || selectedTask.files.length === 0) && (
                      <div className="text-center text-gray-500 py-4 text-sm">
                        No files attached
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Modal */}
      {isLinkModalOpen && <LinkModal />}

      {/* App Manager Modal */}
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
    </div>
  );
};

export default ProjectPlanningModule;