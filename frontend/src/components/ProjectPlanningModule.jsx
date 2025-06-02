import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit3, Trash2, Upload, Code, Image, FileText, Sun, Moon, Calendar, User, Clock, Link, X, Search } from 'lucide-react';

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
  const fileInputRef = useRef(null);

  // API Base URL
  const API_BASE = 'http://localhost:3001/api';

  // Load tasks on component mount
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await fetch(`${API_BASE}/tasks`);
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
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
      });
      
      if (response.ok) {
        loadTasks(); // Refresh tasks
      }
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const deleteTaskById = async (taskId) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        loadTasks(); // Refresh tasks
      }
    } catch (error) {
      console.error('Error deleting task:', error);
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
        loadTasks(); // Refresh tasks
      }
    } catch (error) {
      console.error('Error linking tasks:', error);
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
        loadTasks(); // Refresh tasks
      }
    } catch (error) {
      console.error('Error unlinking tasks:', error);
    }
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

  const handleDrop = (e, toColumn) => {
    e.preventDefault();
    if (draggedTask && draggedFrom && draggedFrom !== toColumn) {
      setTasks(prev => ({
        ...prev,
        [draggedFrom]: prev[draggedFrom].filter(task => task.id !== draggedTask.id),
        [toColumn]: [...prev[toColumn], draggedTask]
      }));
    }
    setDraggedTask(null);
    setDraggedFrom(null);
  };

  const generateTaskId = () => {
    const allTasks = Object.values(tasks).flat();
    const maxId = allTasks.reduce((max, task) => {
      const num = parseInt(task.id.split('-')[1]) || 0;
      return Math.max(max, num);
    }, 0);
    return `NRP-${String(maxId + 1).padStart(3, '0')}`;
  };

  const createNewTask = (columnId) => {
    const newTask = {
      id: generateTaskId(),
      title: 'New Task',
      description: '# New Task\n\nTask description here...',
      assignee: '',
      priority: 'medium',
      dueDate: '',
      files: [],
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    setTasks(prev => ({
      ...prev,
      [columnId]: [...prev[columnId], newTask]
    }));
  };

  const updateTask = (updatedTask) => {
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
  };

  const deleteTask = (taskId) => {
    setTasks(prev => {
      const newTasks = { ...prev };
      for (const column in newTasks) {
        newTasks[column] = newTasks[column].filter(task => task.id !== taskId);
      }
      return newTasks;
    });
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const fileData = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      type: file.type,
      size: file.size
    }));
    
    if (selectedTask) {
      const updatedTask = {
        ...selectedTask,
        files: [...selectedTask.files, ...fileData]
      };
      setSelectedTask(updatedTask);
      updateTask(updatedTask);
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
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-xl font-bold mb-2 border-b pb-1">{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-lg font-semibold mb-2">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-md font-medium mb-1">{line.slice(4)}</h3>;
        }
        if (line.startsWith('```')) {
          return <div key={index} className="font-mono text-sm bg-gray-700 text-green-400 p-3 rounded my-2 border-l-4 border-green-500">{line}</div>;
        }
        if (line.startsWith('- ')) {
          return <li key={index} className="ml-4 list-disc">{line.slice(2)}</li>;
        }
        if (line.startsWith('* ')) {
          return <li key={index} className="ml-4 list-disc">{line.slice(2)}</li>;
        }
        if (line.match(/^\d+\. /)) {
          return <li key={index} className="ml-4 list-decimal">{line.replace(/^\d+\. /, '')}</li>;
        }
        if (line.startsWith('> ')) {
          return <blockquote key={index} className="border-l-4 border-blue-500 pl-4 italic my-2 bg-blue-50 dark:bg-blue-900 py-2">{line.slice(2)}</blockquote>;
        }
        if (line.trim() === '') {
          return <br key={index} />;
        }
        // Handle bold and italic
        const processedLine = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1 rounded">$1</code>');
        
        return <p key={index} className="mb-1" dangerouslySetInnerHTML={{__html: processedLine}}></p>;
      });
  };

  const WYSIWYGEditor = ({ value, onChange, isDarkMode }) => {
    const [isEditing, setIsEditing] = useState(false);
    const textareaRef = useRef(null);

    const handleClick = () => {
      setIsEditing(true);
      setTimeout(() => textareaRef.current?.focus(), 0);
    };

    const handleBlur = () => {
      setIsEditing(false);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsEditing(false);
        textareaRef.current?.blur();
      }
    };

    return (
      <div className="relative">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={`w-full h-96 p-4 border rounded-lg font-mono text-sm resize-none ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="Write in Markdown... (Press Escape to finish editing)"
          />
        ) : (
          <div
            onClick={handleClick}
            className={`w-full h-96 p-4 border rounded-lg overflow-y-auto cursor-text ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-650' 
                : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
            }`}
          >
            {value ? renderMarkdown(value) : (
              <p className="text-gray-500 italic">Click to edit description...</p>
            )}
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Edit3 size={16} className="text-gray-400" />
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
                onClick={() => {
                  linkTasks(selectedTask.id, task.id);
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
        {task.description.split('\n')[0].replace(/^#+\s*/, '')}
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
        </div>
        {task.files.length > 0 && (
          <div className="flex items-center space-x-1">
            <FileText size={12} />
            <span>{task.files.length}</span>
          </div>
        )}
      </div>
    </div>
  );

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
              Agile task management with Kanban boards
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
              className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg`}
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
                {tasks[column.id].map((task) => (
                  <TaskCard key={task.id} task={task} columnId={column.id} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Task Detail Modal */}
      {isModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden`}>
            {/* Modal Header */}
            <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} p-6 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <input
                    type="text"
                    value={selectedTask.title}
                    onChange={(e) => setSelectedTask({...selectedTask, title: e.target.value})}
                    className={`text-xl font-bold w-full bg-transparent border-none outline-none ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}
                  />
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <User size={16} />
                      <input
                        type="text"
                        placeholder="Assignee"
                        value={selectedTask.assignee}
                        onChange={(e) => setSelectedTask({...selectedTask, assignee: e.target.value})}
                        className={`bg-transparent border-none outline-none ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar size={16} />
                      <input
                        type="date"
                        value={selectedTask.dueDate}
                        onChange={(e) => setSelectedTask({...selectedTask, dueDate: e.target.value})}
                        className={`bg-transparent border-none outline-none ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                      />
                    </div>
                    <select
                      value={selectedTask.priority}
                      onChange={(e) => setSelectedTask({...selectedTask, priority: e.target.value})}
                      className={`bg-transparent border-none outline-none ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
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

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* WYSIWYG Description Editor */}
              <div className="mb-6">
                <h3 className={`font-semibold mb-3 flex items-center space-x-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <span>Task Description</span>
                  <span className="text-xs text-gray-500 font-normal">
                    (ID: {selectedTask.id})
                  </span>
                </h3>
                <WYSIWYGEditor 
                  value={selectedTask.description}
                  onChange={(value) => setSelectedTask({...selectedTask, description: value})}
                  isDarkMode={isDarkMode}
                />
              </div>

              {/* Linked Tasks */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Linked Tasks
                  </h3>
                  <button
                    onClick={() => setIsLinkModalOpen(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors flex items-center space-x-1"
                  >
                    <Link size={14} />
                    <span>Link Task</span>
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
                          className={`flex items-center justify-between p-3 border rounded ${
                            isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-2 h-2 rounded-full ${getPriorityColor(linkedTask.priority)}`}></div>
                            <div>
                              <div className="text-xs text-gray-500">{linkedTask.id}</div>
                              <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {linkedTask.title}
                              </div>
                              <div className="text-xs text-gray-500 capitalize">
                                {linkedTask.status.replace('-', ' ')}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => unlinkTasks(selectedTask.id, linkedTaskId)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      No linked tasks
                    </div>
                  )}
                </div>
              </div>

              {/* File Attachments */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Attachments
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors flex items-center space-x-1"
                    >
                      <Upload size={14} />
                      <span>Upload</span>
                    </button>
                  </div>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedTask.files.map((file) => (
                    <div
                      key={file.id}
                      className={`flex items-center space-x-2 p-2 border rounded ${
                        isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <FileText size={16} />
                      <span className="flex-1 text-sm truncate">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)}KB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Link Modal */}
      {isLinkModalOpen && <LinkModal />}
    </div>
  );
};

export default ProjectPlanningModule;