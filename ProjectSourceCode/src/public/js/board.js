/**
 * Board handler
 * Handles board and list interactions: edit list, create task, create list
 * Uses event delegation for dynamically loaded elements
 */

/**
 * Validate that an ID is a non-empty string.
 */
function isValidId(id) {
  return typeof id === 'string' && id.trim() !== '';
}

/**
 * Handle action routing based on button data attributes.
 */
function handleActionClick(button) {
  const action = button.dataset.action;

  switch (action) {
    case 'edit-list': {
      const listId = button.dataset.listId;
      if (!isValidId(listId)) {
        console.error('Invalid list ID:', listId);
        return;
      }
      editList(listId);
      break;
    }
    case 'create-task': {
      const createTaskListId = button.dataset.listId;
      if (!isValidId(createTaskListId)) {
        console.error('Invalid list ID:', createTaskListId);
        return;
      }
      createTask(createTaskListId);
      break;
    }
    case 'create-list': {
      const boardId = button.dataset.boardId;
      if (!isValidId(boardId)) {
        console.error('Invalid board ID:', boardId);
        return;
      }
      createList(boardId);
      break;
    }
    default:
      console.warn('Unknown action:', action);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Use event delegation on the document body to handle dynamically loaded elements
  document.body.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;

    e.preventDefault();
    handleActionClick(button);
  });
});

/**
 * Edit list handler
 * Opens a prompt to edit the list name
 */
function editList(listId) {
  // Fetch list data to get current name
  fetch(`/api/lists/${listId}`, {
    method: 'GET',
    credentials: 'include',
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch list');
      }
      return response.json();
    })
    .then((list) => {
      // Prompt for new name
      const newName = prompt('Enter new list name:', list.name);
      if (!newName || newName.trim() === '') {
        return;
      }

      // Update list
      fetch(`/api/lists/${listId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newName.trim(),
        }),
      })
        .then((response) => {
          if (!response.ok) {
            return response.json().then((errorData) => {
              throw new Error(errorData.error?.message || 'Failed to update list');
            });
          }
          return response.json();
        })
        .then(() => {
          // Reload page to show updated list
          window.location.reload();
        })
        .catch((error) => {
          alert(error.message || 'Failed to update list. Please try again.');
        });
    })
    .catch((error) => {
      console.error('Error fetching list:', error);
      alert('Failed to load list. Please try again.');
    });
}

/**
 * Create task handler
 * Opens the task modal in create mode with the list ID pre-filled
 */
function createTask(listId) {
  // Populate modal form for new task
  const taskForm = document.getElementById('taskForm');
  if (!taskForm) {
    console.error('Task form not found');
    return;
  }

  // Reset form
  taskForm.reset();

  const taskIdInput = document.getElementById('taskId');
  if (taskIdInput) taskIdInput.value = '';

  const taskListIdInput = document.getElementById('taskListId');
  if (taskListIdInput) taskListIdInput.value = listId;

  const taskStoryPointsInput = document.getElementById('taskStoryPoints');
  if (taskStoryPointsInput) taskStoryPointsInput.value = '1';

  // Update modal title
  const modalTitle = document.getElementById('taskModalTitle');
  if (modalTitle) {
    modalTitle.textContent = 'Create Task';
  }

  // Show modal
  const modalElement = document.getElementById('taskModal');
  if (modalElement) {
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  }
}

/**
 * Create list handler
 * Opens a prompt to create a new list
 */
function createList(boardId) {
  const listName = prompt('Enter list name:');
  if (!listName || listName.trim() === '') {
    return;
  }

  fetch(`/api/boards/${boardId}/lists`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      name: listName.trim(),
    }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((errorData) => {
          throw new Error(errorData.error?.message || 'Failed to create list');
        });
      }
      return response.json();
    })
    .then(() => {
      // Reload page to show new list
      window.location.reload();
    })
    .catch((error) => {
      alert(error.message || 'Failed to create list. Please try again.');
    });
}
