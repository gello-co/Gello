/**
 * Task card handler
 * Handles task card interactions: edit and complete
 * Uses event delegation for dynamically loaded task cards
 */

/**
 * Validate that an ID is a non-empty string.
 */
function isValidTaskId(id) {
  return typeof id === 'string' && id.trim() !== '';
}

/**
 * Set form field value if element exists.
 */
function setFormFieldValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value;
}

/**
 * Format due date for input field, handling various date formats.
 */
function formatDueDate(dueDate) {
  if (!dueDate) return '';

  // If already in YYYY-MM-DD format, use it directly
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return dueDate;
  }

  // Parse date and format using local timezone to avoid off-by-one day errors
  const date = new Date(dueDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Populate the task modal with task data.
 */
function populateTaskModal(task, listId) {
  const taskForm = document.getElementById('taskForm');
  if (!taskForm) {
    console.error('Task form not found');
    return false;
  }

  setFormFieldValue('taskId', task.id);
  setFormFieldValue('taskListId', listId);
  setFormFieldValue('taskTitle', task.title);
  setFormFieldValue('taskDescription', task.description || '');
  setFormFieldValue('taskStoryPoints', task.story_points || 1);
  setFormFieldValue('taskAssignedTo', task.assigned_to || '');
  setFormFieldValue('taskDueDate', formatDueDate(task.due_date));

  const modalTitle = document.getElementById('taskModalTitle');
  if (modalTitle) {
    modalTitle.textContent = 'Edit Task';
  }

  return true;
}

/**
 * Show the task modal using Bootstrap.
 */
function showTaskModal() {
  const modalElement = document.getElementById('taskModal');
  if (modalElement) {
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Use event delegation on the document body to handle dynamically loaded task cards
  document.body.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action][data-task-id]');
    if (!button) return;

    e.preventDefault();

    const taskId = button.dataset.taskId;
    if (!isValidTaskId(taskId)) {
      console.error('Invalid task ID:', taskId);
      return;
    }

    const action = button.dataset.action;
    switch (action) {
      case 'edit':
        editTask(taskId);
        break;
      case 'complete':
        completeTask(taskId);
        break;
      default:
        console.warn('Unknown action:', action);
    }
  });
});

/**
 * Edit task handler
 * Opens the task modal in edit mode
 */
function editTask(taskId) {
  const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
  if (!taskCard) {
    console.error('Task card not found for task ID:', taskId);
    return;
  }

  const listColumn = taskCard.closest('.list-column');
  const listId = listColumn?.dataset.listId;
  if (!listId) {
    console.error('List ID not found for task:', taskId);
    return;
  }

  fetch(`/api/tasks/${taskId}`, { method: 'GET', credentials: 'include' })
    .then((response) => {
      if (!response.ok) throw new Error('Failed to fetch task');
      return response.json();
    })
    .then((task) => {
      if (populateTaskModal(task, listId)) {
        showTaskModal();
      }
    })
    .catch((error) => {
      console.error('Error fetching task:', error);
      alert('Failed to load task. Please try again.');
    });
}

/**
 * Complete task handler
 * Marks a task as completed
 */
function completeTask(taskId) {
  if (!confirm('Mark this task as complete?')) {
    return;
  }

  fetch(`/api/tasks/${taskId}/complete`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((errorData) => {
          throw new Error(errorData.error?.message || 'Failed to complete task');
        });
      }
      return response.json();
    })
    .then(() => {
      window.location.reload();
    })
    .catch((error) => {
      alert(error.message || 'Failed to complete task. Please try again.');
    });
}
