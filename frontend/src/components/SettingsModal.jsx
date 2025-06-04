// Version 9 - Performance optimized settings modal for pomodoro timer

import React, { useState, memo } from 'react';
import { X, Clock, Save, RotateCcw } from 'lucide-react';

const SettingsModal = memo(({ isOpen, onClose, pomodoroSettings, onUpdateSettings, isDarkMode }) => {
  const [settings, setSettings] = useState(pomodoroSettings);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateSettings(settings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings = {
      duration: 25 * 60,
      shortBreak: 5 * 60,
      longBreak: 15 * 60
    };
    setSettings(defaultSettings);
  };

  const formatMinutes = (seconds) => {
    return Math.floor(seconds / 60);
  };

  const updateDuration = (field, minutes) => {
    setSettings(prev => ({
      ...prev,
      [field]: minutes * 60
    }));
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
        {/* Header */}
        <div className={`p-6 border-b ${isDarkMode ? 'border-gray-600/20' : 'border-gray-200/20'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Clock size={24} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
              <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Timer Settings
              </h3>
            </div>
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
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Pomodoro Duration */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Pomodoro Duration
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="15"
                max="60"
                step="5"
                value={formatMinutes(settings.duration)}
                onChange={(e) => updateDuration('duration', parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className={`w-20 text-center p-2 border rounded-lg ${
                isDarkMode 
                  ? 'bg-gray-700/50 border-gray-600 text-white' 
                  : 'bg-gray-50 border-gray-300 text-gray-900'
              }`}>
                {formatMinutes(settings.duration)} min
              </div>
            </div>
          </div>

          {/* Short Break */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Short Break Duration
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="3"
                max="15"
                step="1"
                value={formatMinutes(settings.shortBreak)}
                onChange={(e) => updateDuration('shortBreak', parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className={`w-20 text-center p-2 border rounded-lg ${
                isDarkMode 
                  ? 'bg-gray-700/50 border-gray-600 text-white' 
                  : 'bg-gray-50 border-gray-300 text-gray-900'
              }`}>
                {formatMinutes(settings.shortBreak)} min
              </div>
            </div>
          </div>

          {/* Long Break */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Long Break Duration
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="10"
                max="30"
                step="5"
                value={formatMinutes(settings.longBreak)}
                onChange={(e) => updateDuration('longBreak', parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className={`w-20 text-center p-2 border rounded-lg ${
                isDarkMode 
                  ? 'bg-gray-700/50 border-gray-600 text-white' 
                  : 'bg-gray-50 border-gray-300 text-gray-900'
              }`}>
                {formatMinutes(settings.longBreak)} min
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className={`p-4 rounded-xl border ${
            isDarkMode 
              ? 'bg-blue-900/20 border-blue-500/30 text-blue-200' 
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            <div className="flex items-start space-x-3">
              <Clock size={16} className="mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium mb-1">Pomodoro Technique</p>
                <p className="text-xs opacity-90">
                  Work in focused intervals followed by short breaks. After 4 pomodoros, take a longer break.
                </p>
              </div>
            </div>
          </div>

          {/* Performance Note */}
          <div className={`p-4 rounded-xl border ${
            isDarkMode 
              ? 'bg-green-900/20 border-green-500/30 text-green-200' 
              : 'bg-green-50 border-green-200 text-green-700'
          }`}>
            <div className="text-sm">
              <p className="font-medium mb-1">Performance Optimized</p>
              <p className="text-xs opacity-90">
                Timer automatically saves progress every 10 seconds to maintain system performance.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-6 border-t ${isDarkMode ? 'border-gray-600/20' : 'border-gray-200/20'}`}>
          <div className="flex justify-between">
            <button
              onClick={handleReset}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <RotateCcw size={16} />
              <span>Reset</span>
            </button>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-xl transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl transition-all duration-200"
              >
                <Save size={16} />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

SettingsModal.displayName = 'SettingsModal';

export default SettingsModal;