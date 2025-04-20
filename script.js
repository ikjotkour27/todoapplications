
// Global variables
let tasks = [];
let deletedTasks = [];
let currentFilter = 'all';
let currentSort = 'dueDate';
let editingTaskId = null;
let pendingAction = null;
let searchQuery = '';

// DOM Elements
const taskList = document.getElementById('taskList');
const deletedTaskList = document.getElementById('deletedTaskList');
const trashContainer = document.getElementById('trashContainer');
const statsContainer = document.getElementById('statsContainer');
const addTaskForm = document.getElementById('addTaskForm');
const sortSelect = document.getElementById('sortTasks');
const filterOptions = document.querySelectorAll('.filter-option');
const categoryFiltersContainer = document.getElementById('category-filters');
const categoryList = document.getElementById('categoryList');
const modeToggle = document.getElementById('modeToggle');
const notification = document.getElementById('notification');
const emptyTrashBtn = document.getElementById('emptyTrashBtn');
const searchInput = document.getElementById('searchInput');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// Modal elements
const confirmModal = document.getElementById('confirmModal');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');
const modalConfirm = document.getElementById('modalConfirm');
const modalBody = document.getElementById('modalBody');

// Stats elements
const totalTasksValue = document.getElementById('totalTasksValue');
const completedTasksValue = document.getElementById('completedTasksValue');
const pendingTasksValue = document.getElementById('pendingTasksValue');
const highPriorityValue = document.getElementById('highPriorityValue');

// Load tasks from local storage
function loadTasks() {
    const savedTasks = localStorage.getItem('tasks');
    const savedDeletedTasks = localStorage.getItem('deletedTasks');
    
    if (savedTasks) {
        try {
            tasks = JSON.parse(savedTasks);
        } catch (e) {
            showNotification('Error loading tasks, resetting data', 'error');
            tasks = [];
        }
    }
    
    if (savedDeletedTasks) {
        try {
            deletedTasks = JSON.parse(savedDeletedTasks);
        } catch (e) {
            showNotification('Error loading deleted tasks, resetting data', 'error');
            deletedTasks = [];
        }
    }
    
    renderTasks();
    renderDeletedTasks();
    updateCategoryFilters();
    updateCategoryDatalist();
    updateStatistics();
}

// Save tasks to local storage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('deletedTasks', JSON.stringify(deletedTasks));
}

// Generate a unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Validate form input
function validateForm() {
    const title = document.getElementById('taskTitle').value.trim();
    if (!title) {
        showNotification('Task title is required', 'error');
        return false;
    }
    
    const dueDate = document.getElementById('taskDueDate').value;
    const reminder = document.getElementById('taskReminder').value;
    
    if (dueDate && new Date(dueDate) < new Date()) {
        showNotification('Due date cannot be in the past', 'warning');
        return false;
    }
    
    if (reminder && new Date(reminder) < new Date()) {
        showNotification('Reminder cannot be in the past', 'warning');
        return false;
    }
    
    return true;
}

// Add a new task
function addTask(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const dueDate = document.getElementById('taskDueDate').value;
    const priority = document.getElementById('taskPriority').value;
    const category = document.getElementById('taskCategory').value.trim();
    const reminder = document.getElementById('taskReminder').value;
    
    if (editingTaskId) {
        // Edit existing task
        const taskIndex = tasks.findIndex(task => task.id === editingTaskId);
        if (taskIndex !== -1) {
            tasks[taskIndex] = {
                ...tasks[taskIndex],
                title,
                description,
                dueDate,
                priority,
                category,
                reminder,
                updatedAt: new Date().toISOString()
            };
            showNotification('Task updated successfully');
        }
        clearEditState();
    } else {
        // Add new task
        const newTask = {
            id: generateId(),
            title,
            description,
            dueDate,
            priority,
            category,
            reminder,
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        tasks.push(newTask);
        showNotification('Task added successfully');
        
        // Set reminder if specified
        if (reminder) {
            setTaskReminder(newTask);
        }
    }
    
    addTaskForm.reset();
    saveTasks();
    renderTasks();
    updateCategoryFilters();
    updateCategoryDatalist();
    updateStatistics();
}

// Clear edit state
function clearEditState() {
    editingTaskId = null;
    document.querySelector('.btn-primary').textContent = 'Add Task';
    document.getElementById('cancelEditBtn').style.display = 'none';
}

// Cancel edit
function cancelEdit() {
    addTaskForm.reset();
    clearEditState();
}

// Set reminder for a task
function setTaskReminder(task) {
    const reminderTime = new Date(task.reminder).getTime();
    const currentTime = new Date().getTime();
    const timeUntilReminder = reminderTime - currentTime;
    
    if (timeUntilReminder > 0) {
        setTimeout(() => {
            // Check if the task still exists and is not completed
            const currentTask = tasks.find(t => t.id === task.id);
            if (currentTask && !currentTask.completed) {
                // Show native browser notification if possible
                if ('Notification' in window) {
                    if (Notification.permission === 'granted') {
                        new Notification('Task Reminder', {
                            body: currentTask.title,
                            icon: 'https://example.com/favicon.ico'  // You would need to replace this with a real icon
                        });
                    } else if (Notification.permission !== 'denied') {
                        Notification.requestPermission().then(permission => {
                            if (permission === 'granted') {
                                new Notification('Task Reminder', {
                                    body: currentTask.title,
                                    icon: 'https://example.com/favicon.ico'  // You would need to replace this with a real icon
                                });
                            }
                        });
                    }
                }
                
                // Fallback to alert
                alert(`Reminder: ${task.title}`);
            }
        }, timeUntilReminder);
    }
}

// Toggle task completion status
function toggleTaskComplete(taskId) {
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
        tasks[taskIndex].completed = !tasks[taskIndex].completed;
        saveTasks();
        renderTasks();
        updateStatistics();
        
        const status = tasks[taskIndex].completed ? 'completed' : 'active';
        showNotification(`Task marked as ${status}`);
    }
}

// Edit task
function editTask(taskId) {
    const task = tasks.find(task => task.id === taskId);
    if (task) {
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskDueDate').value = task.dueDate || '';
        document.getElementById('taskPriority').value = task.priority || 'medium';
        document.getElementById('taskCategory').value = task.category || '';
        document.getElementById('taskReminder').value = task.reminder || '';
        
        editingTaskId = task.id;
        document.querySelector('.btn-primary').textContent = 'Update Task';
        document.getElementById('cancelEditBtn').style.display = 'inline-block';
    }
}

// Delete task (move to trash)
function deleteTask(taskId) {
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
        const deletedTask = tasks.splice(taskIndex, 1)[0];
        deletedTasks.push({
            ...deletedTask,
            deletedAt: new Date().toISOString()
        });
        
        saveTasks();
        renderTasks();
        renderDeletedTasks();
        updateStatistics();
        showNotification('Task moved to trash');
    }
}

// Restore task from trash
function restoreTask(taskId) {
    const deletedTaskIndex = deletedTasks.findIndex(task => task.id === taskId);
    if (deletedTaskIndex !== -1) {
        const restoredTask = deletedTasks.splice(deletedTaskIndex, 1)[0];
        // Remove the deletedAt property
        delete restoredTask.deletedAt;
        tasks.push(restoredTask);
        
        saveTasks();
        renderTasks();
        renderDeletedTasks();
        updateStatistics();
        showNotification('Task restored from trash');
    }
}

// Empty trash (permanently delete all tasks in trash)
function emptyTrash() {
    showConfirmModal('Are you sure you want to permanently delete all tasks in trash?', () => {
        deletedTasks = [];
        saveTasks();
        renderDeletedTasks();
        showNotification('Trash emptied successfully');
    });
}

// Show notification
function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = 'notification ' + type;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Show confirm modal
function showConfirmModal(message, confirmCallback) {
    modalBody.textContent = message;
    pendingAction = confirmCallback;
    confirmModal.classList.add('active');
}

// Close modal
function closeModal() {
    confirmModal.classList.remove('active');
    pendingAction = null;
}

// Render tasks based on filters and sorting
function renderTasks() {
    taskList.innerHTML = '';
    
    let filteredTasks = tasks.filter(task => {
        // Apply search filter first
        if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
            !(task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))) {
            return false;
        }
        
        // Then apply category/status filters
        if (currentFilter === 'all') return true;
        if (currentFilter === 'active') return !task.completed;
        if (currentFilter === 'completed') return task.completed;
        if (currentFilter === 'priority-high') return task.priority === 'high';
        if (currentFilter === 'priority-medium') return task.priority === 'medium';
        if (currentFilter === 'priority-low') return task.priority === 'low';
        if (currentFilter.startsWith('category-')) {
            const category = currentFilter.replace('category-', '');
            return task.category === category;
        }
        return true;
    });

    // Sort tasks
    filteredTasks.sort((a, b) => {
        if (currentSort === 'dueDate') {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        } else if (currentSort === 'priority') {
            const priorityValues = { high: 3, medium: 2, low: 1 };
            return priorityValues[b.priority] - priorityValues[a.priority];
        } else if (currentSort === 'title') {
            return a.title.localeCompare(b.title);
        } else if (currentSort === 'dateAdded') {
            return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return 0;
    });

    if (filteredTasks.length === 0) {
        taskList.innerHTML = '<li class="task-item">No tasks found.</li>';
        return;
    }

    filteredTasks.forEach(task => {
        const taskElement = document.createElement('li');
        taskElement.className = `task-item ${task.completed ? 'task-completed' : ''}`;
        
        // Format due date for display
        let dueDateDisplay = '';
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            const today = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            if (dueDate.toDateString() === today.toDateString()) {
                dueDateDisplay = 'Today, ' + dueDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            } else if (dueDate.toDateString() === tomorrow.toDateString()) {
                dueDateDisplay = 'Tomorrow, ' + dueDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            } else {
                dueDateDisplay = dueDate.toLocaleDateString() + ' ' + dueDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }
        }
        
        taskElement.innerHTML = `
            <input type="checkbox" class="task-check" ${task.completed ? 'checked' : ''}>
            <div class="task-content">
                <div class="task-title">${task.title}</div>
                ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                <div class="task-meta">
                    ${task.dueDate ? `<span class="task-due">Due: ${dueDateDisplay}</span>` : ''}
                    <span class="task-priority priority-${task.priority}">Priority: ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
                    ${task.category ? `<span class="task-category">${task.category}</span>` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="task-btn task-btn-edit" aria-label="Edit task">✏️</button>
                <button class="task-btn task-btn-delete" aria-label="Delete task">🗑️</button>
            </div>
        `;
        
        const checkbox = taskElement.querySelector('.task-check');
        const editBtn = taskElement.querySelector('.task-btn-edit');
        const deleteBtn = taskElement.querySelector('.task-btn-delete');
        
        checkbox.addEventListener('change', () => toggleTaskComplete(task.id));
        editBtn.addEventListener('click', () => editTask(task.id));
        deleteBtn.addEventListener('click', () => deleteTask(task.id));
        
        taskList.appendChild(taskElement);
    });
}

// Render deleted tasks
function renderDeletedTasks() {
    deletedTaskList.innerHTML = '';
    
    if (deletedTasks.length === 0) {
        deletedTaskList.innerHTML = '<li class="deleted-task-item">Trash is empty.</li>';
        return;
    }
    
    deletedTasks.forEach(task => {
        const taskElement = document.createElement('li');
        taskElement.className = 'deleted-task-item';
        
        taskElement.innerHTML = `
            <span class="deleted-task-title">${task.title}</span>
            <button class="btn btn-restore">Restore</button>
        `;
        
        const restoreBtn = taskElement.querySelector('.btn-restore');
        restoreBtn.addEventListener('click', () => restoreTask(task.id));
        
        deletedTaskList.appendChild(taskElement);
    });
}

// Update category filters in sidebar
function updateCategoryFilters() {
    categoryFiltersContainer.innerHTML = '';
    
    // Get unique categories
    const categories = [...new Set(tasks.map(task => task.category).filter(Boolean))];
    
    categories.forEach(category => {
        const categoryElement = document.createElement('div');
        categoryElement.className = 'filter-option';
        categoryElement.setAttribute('data-filter', `category-${category}`);
        categoryElement.setAttribute('tabindex', '0');
        categoryElement.setAttribute('role', 'button');
        categoryElement.textContent = category;
        
        categoryElement.addEventListener('click', handleFilterClick);
        categoryElement.addEventListener('keydown', handleFilterKeyDown);
        
        categoryFiltersContainer.appendChild(categoryElement);
    });
}

// Update category datalist for form input
function updateCategoryDatalist() {
    categoryList.innerHTML = '';
    
    // Get unique categories
    const categories = [...new Set(tasks.map(task => task.category).filter(Boolean))];
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        categoryList.appendChild(option);
    });
}

// Update statistics
function updateStatistics() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    const highPriorityTasks = tasks.filter(task => task.priority === 'high' && !task.completed).length;
    
    totalTasksValue.textContent = totalTasks;
    completedTasksValue.textContent = completedTasks;
    pendingTasksValue.textContent = pendingTasks;
    highPriorityValue.textContent = highPriorityTasks;
}

// Handle filter option click
function handleFilterClick(event) {
    filterOptions.forEach(option => option.classList.remove('active'));
    event.target.classList.add('active');
    
    currentFilter = event.target.getAttribute('data-filter');
    
    if (currentFilter === 'trash') {
        trashContainer.style.display = 'block';
        taskList.parentElement.style.display = 'none';
        statsContainer.style.display = 'none';
    } else if (currentFilter === 'stats') {
        statsContainer.style.display = 'block';
        trashContainer.style.display = 'none';
        taskList.parentElement.style.display = 'none';
    } else {
        trashContainer.style.display = 'none';
        statsContainer.style.display = 'none';
        taskList.parentElement.style.display = 'block';
        renderTasks();
    }
}

// Handle filter option keyboard navigation
function handleFilterKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.target.click();
    }
}

// Toggle dark mode
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    modeToggle.textContent = isDarkMode ? '☀️' : '🌙';
    localStorage.setItem('darkMode', isDarkMode);
}

// Apply saved dark mode preference
function applyDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        modeToggle.textContent = '☀️';
    }
}

// Event listeners
window.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    applyDarkMode();
    
    // Check for reminders
    tasks.forEach(task => {
        if (task.reminder && !task.completed) {
            setTaskReminder(task);
        }
    });
});

addTaskForm.addEventListener('submit', addTask);
sortSelect.addEventListener('change', () => {
    currentSort = sortSelect.value;
    renderTasks();
});
filterOptions.forEach(option => {
    option.addEventListener('click', handleFilterClick);
    option.addEventListener('keydown', handleFilterKeyDown);
});
modeToggle.addEventListener('click', toggleDarkMode);
emptyTrashBtn.addEventListener('click', emptyTrash);

searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim().toLowerCase();
    renderTasks();
});

cancelEditBtn.addEventListener('click', cancelEdit);

// Modal events
modalClose.addEventListener('click', closeModal);
modalCancel.addEventListener('click', closeModal);
modalConfirm.addEventListener('click', () => {
    if (pendingAction) {
        pendingAction();
    }
    closeModal();
});

// Service Worker Registration (for PWA support)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').then(registration => {
            console.log('ServiceWorker registration successful');
        }).catch(error => {
            console.log('ServiceWorker registration failed: ', error);
        });
    });
}