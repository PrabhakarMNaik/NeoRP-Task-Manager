// Version 8 - Global timer state management

class TimerManagerClass {
  constructor() {
    this.activeTaskId = null;
    this.isRunning = false;
    this.interval = null;
    this.timeSpent = {};
    this.listeners = [];
    this.timerMode = 'countup'; // 'countup' or 'countdown'
    this.countdownTime = 0;
    this.pomodoroNotificationShown = false;
  }

  // Subscribe to timer updates
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify all listeners
  notify() {
    this.listeners.forEach(callback => callback({
      activeTaskId: this.activeTaskId,
      isRunning: this.isRunning,
      timeSpent: { ...this.timeSpent },
      timerMode: this.timerMode,
      countdownTime: this.countdownTime
    }));
  }

  // Start timer for a specific task
  startTimer(taskId, mode = 'countup', pomodoroTime = 25 * 60) {
    // If timer is already running for different task, show warning
    if (this.isRunning && this.activeTaskId !== taskId) {
      const currentTask = this.activeTaskId;
      const confirmSwitch = window.confirm(
        `Timer is already running for task ${currentTask}. Stop that timer and start timer for ${taskId}?`
      );
      if (!confirmSwitch) {
        return false;
      }
      this.pauseTimer();
    }

    this.activeTaskId = taskId;
    this.isRunning = true;
    this.timerMode = mode;
    this.pomodoroNotificationShown = false;

    // Initialize time tracking
    if (!this.timeSpent[taskId]) {
      this.timeSpent[taskId] = 0;
    }

    // Set countdown time for pomodoro
    if (mode === 'countdown') {
      this.countdownTime = pomodoroTime;
    }

    // Request notification permission
    this.requestNotificationPermission();

    // Start interval
    this.interval = setInterval(() => {
      if (mode === 'countup') {
        this.timeSpent[taskId] = (this.timeSpent[taskId] || 0) + 1;
      } else {
        this.timeSpent[taskId] = (this.timeSpent[taskId] || 0) + 1;
        this.countdownTime = Math.max(0, this.countdownTime - 1);
        
        // Pomodoro complete
        if (this.countdownTime <= 0 && !this.pomodoroNotificationShown) {
          this.showPomodoroNotification();
          this.pomodoroNotificationShown = true;
          this.pauseTimer();
        }
      }
      this.notify();
    }, 1000);

    this.notify();
    return true;
  }

  // Pause/stop timer
  pauseTimer() {
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.notify();
  }

  // Reset timer
  resetTimer(pomodoroTime = 25 * 60) {
    this.pauseTimer();
    if (this.timerMode === 'countdown') {
      this.countdownTime = pomodoroTime;
    }
    this.pomodoroNotificationShown = false;
    this.notify();
  }

  // Get time spent for a task
  getTimeSpent(taskId) {
    return this.timeSpent[taskId] || 0;
  }

  // Set time spent for a task (for loading from backend)
  setTimeSpent(taskId, seconds) {
    this.timeSpent[taskId] = seconds;
    this.notify();
  }

  // Check if timer is active for a task
  isActiveForTask(taskId) {
    return this.activeTaskId === taskId && this.isRunning;
  }

  // Format time as HH:MM:SS
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Request notification permission
  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  // Show pomodoro completion notification
  showPomodoroNotification() {
    // Play notification sound
    this.createNotificationSound();
    
    // Browser notification
    if (Notification.permission === 'granted') {
      new Notification('🍅 Pomodoro Complete!', {
        body: 'Time for a break! Don\'t forget to document your progress.',
        icon: '/favicon.ico',
        tag: 'pomodoro-complete'
      });
    }
    
    // Visual notification
    setTimeout(() => {
      alert('🍅 Pomodoro Complete!\n\nTime for a break! Don\'t forget to document your progress.');
    }, 100);
  }

  // Create notification sound
  createNotificationSound() {
    try {
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
    } catch (error) {
      console.log('Audio context not available');
    }
  }

  // Save time to backend
  async saveTimeToBackend(taskId) {
    if (this.timeSpent[taskId]) {
      try {
        await fetch(`http://localhost:3001/api/tasks/${taskId}/time`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeSpent: this.timeSpent[taskId] }),
        });
      } catch (error) {
        console.error('Error saving time to backend:', error);
      }
    }
  }

  // Load time from backend
  async loadTimeFromBackend(tasks) {
    tasks.forEach(task => {
      if (task.timeSpent) {
        this.timeSpent[task.id] = task.timeSpent;
      }
    });
    this.notify();
  }
}

// Create singleton instance
const TimerManager = new TimerManagerClass();

export default TimerManager;