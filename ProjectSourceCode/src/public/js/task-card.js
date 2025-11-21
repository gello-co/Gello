/**
 * Task card handler
 * Handles task card interactions: edit and complete
 * Uses event delegation for dynamically loaded task cards
 */

document.addEventListener("DOMContentLoaded", () => {
  // Use event delegation on the document body to handle dynamically loaded task cards
  document.body.addEventListener("click", (e) => {
    // Find the closest button with data-action attribute
    const button = e.target.closest("[data-action][data-task-id]");
    if (!button) return;

    e.preventDefault();

    // Safely parse task ID from data attribute
    const taskId = button.dataset.taskId;
    if (!taskId || typeof taskId !== "string" || taskId.trim() === "") {
      console.error("Invalid task ID:", taskId);
      return;
    }

    // Route to appropriate handler based on data-action
    const action = button.dataset.action;
    switch (action) {
      case "edit":
        editTask(taskId);
        break;
      case "complete":
        completeTask(taskId);
        break;
      default:
        console.warn("Unknown action:", action);
    }
  });
});

/**
 * Edit task handler
 * Opens the task modal in edit mode
 */
function editTask(taskId) {
  // Get the task card to find the list ID
  const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
  if (!taskCard) {
    console.error("Task card not found for task ID:", taskId);
    return;
  }

  // Find the parent list column to get the list ID
  const listColumn = taskCard.closest(".list-column");
  const listId = listColumn?.dataset.listId;
  if (!listId) {
    console.error("List ID not found for task:", taskId);
    return;
  }

  // Fetch task data to populate the modal
  fetch(`/api/tasks/${taskId}`, {
    method: "GET",
    credentials: "include",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch task");
      }
      return response.json();
    })
    .then((task) => {
      // Populate modal form
      const taskForm = document.getElementById("taskForm");
      if (!taskForm) {
        console.error("Task form not found");
        return;
      }

      const taskIdInput = document.getElementById("taskId");
      if (taskIdInput) taskIdInput.value = task.id;

      const taskListIdInput = document.getElementById("taskListId");
      if (taskListIdInput) taskListIdInput.value = listId;

      const taskTitleInput = document.getElementById("taskTitle");
      if (taskTitleInput) taskTitleInput.value = task.title;

      const taskDescriptionInput = document.getElementById("taskDescription");
      if (taskDescriptionInput)
        taskDescriptionInput.value = task.description || "";

      const taskStoryPointsInput = document.getElementById("taskStoryPoints");
      if (taskStoryPointsInput)
        taskStoryPointsInput.value = task.story_points || 1;

      const taskAssignedToInput = document.getElementById("taskAssignedTo");
      if (taskAssignedToInput)
        taskAssignedToInput.value = task.assigned_to || "";

      const taskDueDateInput = document.getElementById("taskDueDate");
      if (taskDueDateInput) {
        if (task.due_date) {
          // Format date safely without UTC conversion issues
          let dueDate;
          // If already in YYYY-MM-DD format, use it directly
          if (/^\d{4}-\d{2}-\d{2}$/.test(task.due_date)) {
            dueDate = task.due_date;
          } else {
            // Parse date and format using local timezone to avoid off-by-one day errors
            const date = new Date(task.due_date);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            dueDate = `${year}-${month}-${day}`;
          }
          taskDueDateInput.value = dueDate;
        } else {
          taskDueDateInput.value = "";
        }
      }

      // Update modal title
      const modalTitle = document.getElementById("taskModalTitle");
      if (modalTitle) {
        modalTitle.textContent = "Edit Task";
      }

      // Show modal
      const modalElement = document.getElementById("taskModal");
      if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
      }
    })
    .catch((error) => {
      console.error("Error fetching task:", error);
      alert("Failed to load task. Please try again.");
    });
}

/**
 * Complete task handler
 * Marks a task as completed
 */
function completeTask(taskId) {
  if (!confirm("Mark this task as complete?")) {
    return;
  }

  fetch(`/api/tasks/${taskId}/complete`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((errorData) => {
          throw new Error(
            errorData.error?.message || "Failed to complete task",
          );
        });
      }
      return response.json();
    })
    .then(() => {
      // Reload page to show updated task
      window.location.reload();
    })
    .catch((error) => {
      alert(error.message || "Failed to complete task. Please try again.");
    });
}
