/**
 * Board, List, and Task management JavaScript
 * Handles create, edit, and complete operations via API calls
 */

// Helper function to get CSRF token
async function getCsrfToken() {
  const response = await fetch("/api/csrf-token", {
    credentials: "include",
  });
  const data = await response.json();
  return data.csrfToken;
}

// Helper function to make authenticated API requests
async function apiRequest(url, options = {}) {
  // Get CSRF token for state-changing requests
  let csrfToken = null;
  if (options.method && !["GET", "HEAD", "OPTIONS"].includes(options.method)) {
    csrfToken = await getCsrfToken();
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken && { "X-CSRF-Token": csrfToken }),
      ...options.headers,
    },
    credentials: "include", // Include cookies for authentication
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Create a new team
async function createTeam() {
  const name = prompt("Enter team name:");
  if (!name) return;

  try {
    await apiRequest("/api/teams", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    location.reload();
  } catch (error) {
    alert(`Failed to create team: ${error.message}`);
  }
}

// Create a new board
async function createBoard(teamId) {
  const name = prompt("Enter board name:");
  if (!name) return;

  const description = prompt("Enter board description (optional):") || null;

  let finalTeamId = teamId;
  if (!finalTeamId) {
    finalTeamId = prompt("Enter team ID:");
    if (!finalTeamId) return;
  }

  try {
    await apiRequest("/api/boards", {
      method: "POST",
      body: JSON.stringify({
        name,
        description,
        team_id: finalTeamId,
      }),
    });
    location.reload();
  } catch (error) {
    alert(`Failed to create board: ${error.message}`);
  }
}

// Create a new list
async function createList(boardId) {
  const name = prompt("Enter list name:");
  if (!name) return;

  try {
    await apiRequest(`/api/lists/boards/${boardId}/lists`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    location.reload();
  } catch (error) {
    alert(`Failed to create list: ${error.message}`);
  }
}

// Edit a list
async function editList(listId) {
  const newName = prompt("Enter new list name:");
  if (!newName) return;

  try {
    await apiRequest(`/api/lists/${listId}`, {
      method: "PUT",
      body: JSON.stringify({ name: newName }),
    });
    location.reload();
  } catch (error) {
    alert(`Failed to update list: ${error.message}`);
  }
}

// Create a new task
async function createTask(listId) {
  // Open the task modal if it exists, otherwise use prompts
  const modal = document.getElementById("taskModal");
  if (modal) {
    // Set list ID and show modal
    document.getElementById("taskListId").value = listId;
    document.getElementById("taskId").value = "";
    document.getElementById("taskForm").reset();
    document.getElementById("taskListId").value = listId;
    document.getElementById("taskModalTitle").textContent = "Create Task";
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    return;
  }

  // Fallback to prompts if modal doesn't exist
  const title = prompt("Enter task title:");
  if (!title) return;

  const description = prompt("Enter task description (optional):") || null;
  const storyPoints = prompt("Enter story points (default: 1):") || "1";

  try {
    await apiRequest(`/api/tasks/lists/${listId}/tasks`, {
      method: "POST",
      body: JSON.stringify({
        title,
        description,
        story_points: parseInt(storyPoints, 10) || 1,
      }),
    });
    location.reload();
  } catch (error) {
    alert(`Failed to create task: ${error.message}`);
  }
}

// Edit a task
async function editTask(taskId) {
  try {
    // Fetch current task data
    const task = await apiRequest(`/api/tasks/${taskId}`);

    // Open modal if it exists
    const modal = document.getElementById("taskModal");
    if (modal) {
      document.getElementById("taskId").value = task.id;
      document.getElementById("taskListId").value = task.list_id;
      document.getElementById("taskTitle").value = task.title || "";
      document.getElementById("taskDescription").value = task.description || "";
      document.getElementById("taskStoryPoints").value = task.story_points || 1;
      document.getElementById("taskAssignedTo").value = task.assigned_to || "";
      document.getElementById("taskDueDate").value = task.due_date
        ? task.due_date.split("T")[0]
        : "";
      document.getElementById("taskModalTitle").textContent = "Edit Task";
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
      return;
    }

    // Fallback to prompts
    const title = prompt("Enter new task title:", task.title) || task.title;
    const description =
      prompt("Enter new task description:", task.description || "") || null;

    await apiRequest(`/api/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify({ title, description }),
    });
    location.reload();
  } catch (error) {
    alert(`Failed to update task: ${error.message}`);
  }
}

// Save task (from modal form)
async function saveTask() {
  const taskId = document.getElementById("taskId").value;
  const listId = document.getElementById("taskListId").value;

  const taskData = {
    title: document.getElementById("taskTitle").value,
    description: document.getElementById("taskDescription").value,
    story_points:
      parseInt(document.getElementById("taskStoryPoints").value, 10) || 1,
    assigned_to: document.getElementById("taskAssignedTo").value || null,
    due_date: document.getElementById("taskDueDate").value || null,
  };

  try {
    if (taskId) {
      // Update existing task
      await apiRequest(`/api/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify(taskData),
      });
    } else {
      // Create new task
      await apiRequest(`/api/tasks/lists/${listId}/tasks`, {
        method: "POST",
        body: JSON.stringify(taskData),
      });
    }

    // Close modal
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("taskModal"),
    );
    if (modal) {
      modal.hide();
    }

    location.reload();
  } catch (error) {
    alert(`Failed to save task: ${error.message}`);
  }
}

// Complete a task
async function completeTask(taskId) {
  if (!confirm("Mark this task as complete?")) return;

  try {
    await apiRequest(`/api/tasks/${taskId}/complete`, {
      method: "PATCH",
    });
    location.reload();
  } catch (error) {
    alert(`Failed to complete task: ${error.message}`);
  }
}

// Make functions globally available
window.createTeam = createTeam;
window.createBoard = createBoard;
window.createList = createList;
window.editList = editList;
window.createTask = createTask;
window.editTask = editTask;
window.saveTask = saveTask;
window.completeTask = completeTask;
