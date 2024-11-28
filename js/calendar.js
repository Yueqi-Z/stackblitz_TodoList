/**
 * calendar.js - TaskMaster Pro Calendar Implementation
 * Version: 1.3.1
 * 
 * Change Log:
 * 1.3.1 - Fixed calendar rendering and class handling
 * 1.3.0 - Added improved task preview handling and date navigation
 * 1.2.0 - Enhanced day preview modal and task overflow handling
 * 1.1.0 - Initial implementation with basic calendar functionality
 */
 const APP_VERSION = '1.3.1';
 const LOCAL_STORAGE_KEY = 'taskmaster_tasks_v1_3'; // Using same storage as task list
 
 class CalendarManager {
     constructor() {
         // Core state
         this.currentDate = new Date();
         this.selectedDate = null;
         this.tasks = [];
         this.maxTasksPerDay = 3;
 
         // Cache DOM elements
         this.calendarDays = document.getElementById('calendarDays');
         this.monthDisplay = document.querySelector('.current-month');
         
         // Constants
         this.STORAGE_KEY = 'taskmaster_tasks_v1_3';
         this.MONTH_NAMES = [
             'January', 'February', 'March', 'April',
             'May', 'June', 'July', 'August',
             'September', 'October', 'November', 'December'
         ];
         this.DAY_NAMES = [
             'Sunday', 'Monday', 'Tuesday', 'Wednesday',
             'Thursday', 'Friday', 'Saturday'
         ];
 
         // Initialize
         this.loadTasks();
         this.initializeEventListeners();
         this.renderCalendar();
     }
 
     initializeEventListeners() {
         // Calendar navigation
         this.initializeNavigationListeners();
         
         // Modal handling
         this.initializeModalListeners();
         
         // Task interaction
         this.initializeTaskInteractionListeners();
 
         // Window resize handling
         window.addEventListener('resize', this.handleResize.bind(this));
     }
     initializeNavigationListeners() {
      const prevMonthBtn = document.getElementById('prevMonth');
      const nextMonthBtn = document.getElementById('nextMonth');
      const todayBtn = document.getElementById('todayBtn');

      if (prevMonthBtn) {
          prevMonthBtn.addEventListener('click', () => {
              this.navigateMonth(-1);
          });
      }

      if (nextMonthBtn) {
          nextMonthBtn.addEventListener('click', () => {
              this.navigateMonth(1);
          });
      }

      if (todayBtn) {
          todayBtn.addEventListener('click', () => {
              this.navigateToToday();
          });
      }
  }

  initializeModalListeners() {
      const modals = document.querySelectorAll('.modal');
      
      modals.forEach(modal => {
          const closeBtn = modal.querySelector('.modal-close');
          if (closeBtn) {
              closeBtn.addEventListener('click', () => this.closeModal(modal.id));
          }

          const overlay = modal.querySelector('.modal-overlay');
          if (overlay) {
              overlay.addEventListener('click', () => this.closeModal(modal.id));
          }

          document.addEventListener('keydown', (e) => {
              if (e.key === 'Escape' && !modal.hasAttribute('hidden')) {
                  this.closeModal(modal.id);
              }
          });
      });
  }

  initializeTaskInteractionListeners() {
      // Task interaction listeners will be added during rendering
  }

  handleResize() {
      this.updateCalendarHeight();
  }

  updateCalendarHeight() {
      if (!this.calendarDays) return;

      const viewportHeight = window.innerHeight;
      const headerHeight = document.querySelector('.global-header')?.offsetHeight || 0;
      const controlsHeight = document.querySelector('.calendar-controls')?.offsetHeight || 0;
      const calendarHeaderHeight = document.querySelector('.calendar-header')?.offsetHeight || 0;

      const availableHeight = viewportHeight - headerHeight - controlsHeight - calendarHeaderHeight - 100;
      const minHeight = Math.max(400, availableHeight);

      this.calendarDays.style.minHeight = `${minHeight}px`;
  }

  loadTasks() {
      try {
          const savedTasks = localStorage.getItem(this.STORAGE_KEY);
          this.tasks = savedTasks ? JSON.parse(savedTasks) : [];
      } catch (error) {
          console.error('Error loading tasks:', error);
          this.tasks = [];
      }
  }

  getTasksForDate(date) {
      if (!date) return [];

      return this.tasks.filter(task => {
          const taskDate = new Date(task.dueDate);
          return this.isSameDate(taskDate, date);
      }).sort((a, b) => {
          if (a.completed !== b.completed) {
              return a.completed ? 1 : -1;
          }
          return new Date(a.dueDate) - new Date(b.dueDate);
      });
  }
  renderCalendar() {
    if (!this.calendarDays) return;

    // Calculate calendar dates
    const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
    const startOffset = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const totalCells = Math.ceil((totalDays + startOffset) / 7) * 7;

    let calendarHTML = '';
    const today = new Date();

    // Generate calendar grid
    for (let i = 0; i < totalCells; i++) {
        const dayNumber = i - startOffset + 1;
        const currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), dayNumber);
        
        if (dayNumber <= 0 || dayNumber > totalDays) {
            calendarHTML += '<div class="calendar-day other-month"></div>';
            continue;
        }

        const isToday = this.isSameDate(currentDate, today);
        const dayTasks = this.getTasksForDate(currentDate);
        const dayClasses = ['calendar-day'];
        
        if (isToday) dayClasses.push('today');
        if (dayTasks.length > 0) dayClasses.push('has-tasks');

        calendarHTML += `
            <div class="${dayClasses.join(' ')}" data-date="${currentDate.toISOString()}">
                <div class="day-number">
                    ${currentDate.getDate()}
                </div>
                <div class="task-container">
                    ${this.renderTaskPreviews(dayTasks)}
                </div>
            </div>
        `;
    }

    this.calendarDays.innerHTML = calendarHTML;
    this.updateMonthDisplay();
    this.addDayCellListeners();
}

renderTaskPreviews(tasks) {
    if (tasks.length === 0) return '';

    const displayTasks = tasks.slice(0, this.maxTasksPerDay);
    const remainingTasks = tasks.length - this.maxTasksPerDay;

    let html = displayTasks.map(task => `
        <div class="task-preview ${task.priority.toLowerCase()} ${task.completed ? 'completed' : ''}"
             data-task-id="${task.id}"
             title="${this.escapeHtml(task.title)}">
            <span class="task-time">${this.formatTime(task.dueDate)}</span>
            ${this.escapeHtml(task.title)}
        </div>
    `).join('');

    if (remainingTasks > 0) {
        html += `
            <button class="more-tasks" aria-label="Show ${remainingTasks} more tasks">
                ${remainingTasks}+ more task${remainingTasks !== 1 ? 's' : ''}
            </button>
        `;
    }

    return html;
}

navigateMonth(offset) {
    this.currentDate.setMonth(this.currentDate.getMonth() + offset);
    this.renderCalendar();
    this.animateMonthChange(offset);
}

navigateToToday() {
    const today = new Date();
    if (this.currentDate.getMonth() !== today.getMonth() ||
        this.currentDate.getFullYear() !== today.getFullYear()) {
        this.currentDate = today;
        this.renderCalendar();
    }
    this.highlightToday();
}

animateMonthChange(direction) {
    if (!this.monthDisplay) return;

    const animation = this.monthDisplay.animate([
        { opacity: 1, transform: 'translateX(0)' },
        { opacity: 0, transform: `translateX(${direction * -20}px)` },
        { opacity: 0, transform: `translateX(${direction * 20}px)` },
        { opacity: 1, transform: 'translateX(0)' }
    ], {
        duration: 300,
        easing: 'ease-in-out'
    });

    animation.onfinish = () => {
        this.updateMonthDisplay();
    };
}
highlightToday() {
  const todayCell = this.calendarDays?.querySelector('.calendar-day.today');
  if (!todayCell) return;

  todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  todayCell.animate([
      { backgroundColor: 'rgba(37, 99, 235, 0.2)', transform: 'scale(0.98)' },
      { backgroundColor: 'rgba(37, 99, 235, 0.05)', transform: 'scale(1)' }
  ], {
      duration: 500,
      easing: 'ease-out'
  });
}

updateMonthDisplay() {
  if (!this.monthDisplay) return;
  const month = this.MONTH_NAMES[this.currentDate.getMonth()];
  const year = this.currentDate.getFullYear();
  this.monthDisplay.textContent = `${month} ${year}`;
}

addDayCellListeners() {
  document.querySelectorAll('.task-preview').forEach(preview => {
      preview.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openTaskPreview(preview.dataset.taskId);
      });
  });

  document.querySelectorAll('.more-tasks').forEach(moreButton => {
      const dayCell = moreButton.closest('.calendar-day');
      const date = new Date(dayCell.dataset.date);
      moreButton.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openDayPreview(date);
      });
  });

  document.querySelectorAll('.calendar-day.has-tasks').forEach(day => {
      day.addEventListener('click', () => {
          const date = new Date(day.dataset.date);
          this.openDayPreview(date);
      });
  });
}

openTaskPreview(taskId) {
  const task = this.tasks.find(t => t.id === taskId);
  if (!task) return;

  const modal = document.getElementById('taskPreviewModal');
  if (!modal) return;

  modal.querySelector('.preview-priority').textContent = task.priority;
  modal.querySelector('.preview-priority').className = `preview-priority ${task.priority.toLowerCase()}`;
  modal.querySelector('.preview-date').textContent = this.formatDate(task.dueDate, true);
  modal.querySelector('.preview-title').textContent = this.escapeHtml(task.title);
  modal.querySelector('.preview-description').textContent = this.escapeHtml(task.description || 'No description provided');
  modal.querySelector('.preview-status').textContent = task.completed ? 'Completed' : 'Pending';

  modal.removeAttribute('hidden');
  this.animateModalOpen(modal);
}

openDayPreview(date) {
  const tasks = this.getTasksForDate(date);
  if (tasks.length === 0) return;

  const modal = document.getElementById('dayPreviewModal');
  if (!modal) return;

  modal.querySelector('.day-preview-date').textContent = this.formatDate(date);
  
  const tasksList = modal.querySelector('.day-tasks-list');
  tasksList.innerHTML = tasks.length ? this.createDayPreviewContent(tasks) : 
                      '<div class="empty-day-message">No tasks for this day</div>';

  tasksList.querySelectorAll('.day-task-item').forEach(item => {
      item.addEventListener('click', () => {
          this.closeModal('dayPreviewModal');
          this.openTaskPreview(item.dataset.taskId);
      });
  });

  modal.removeAttribute('hidden');
  this.animateModalOpen(modal);
}

createDayPreviewContent(tasks) {
  return tasks.map(task => `
      <div class="day-task-item ${task.completed ? 'completed' : ''}" 
           data-task-id="${task.id}">
          <div class="day-task-content">
              <div class="day-task-title">${this.escapeHtml(task.title)}</div>
              <div class="day-task-time">
                  ${this.formatTime(task.dueDate)}
                  <span class="priority ${task.priority.toLowerCase()}">${task.priority}</span>
              </div>
          </div>
      </div>
  `).join('');
}

animateModalOpen(modal) {
  const content = modal.querySelector('.modal-content');
  content.animate([
      { opacity: 0, transform: 'scale(0.95)' },
      { opacity: 1, transform: 'scale(1)' }
  ], {
      duration: 200,
      easing: 'ease-out'
  });
}

closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  const content = modal.querySelector('.modal-content');
  const animation = content.animate([
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(0.95)' }
  ], {
      duration: 150,
      easing: 'ease-in'
  });

  animation.onfinish = () => {
      modal.setAttribute('hidden', '');
  };
}

isSameDate(date1, date2) {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear();
}

formatDate(date, includeTime = false) {
  const d = new Date(date);
  const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...(includeTime && {
          hour: '2-digit',
          minute: '2-digit'
      })
  };

  try {
      return d.toLocaleDateString('en-US', options);
  } catch (error) {
      console.error('Error formatting date:', error);
      return d.toDateString();
  }
}

formatTime(date) {
  const d = new Date(date);
  try {
      return d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
      });
  } catch (error) {
      console.error('Error formatting time:', error);
      return d.toTimeString().slice(0, 5);
  }
}

escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
}
}

// Initialize the calendar when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
window.calendarManager = new CalendarManager();
console.log(`Calendar view v${APP_VERSION} initialized`);
});