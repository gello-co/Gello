/**
 * Task modal handler
 * Handles task creation and editing via the task modal
 */


document.addEventListener("DOMContentLoaded", () => {
  const saveTaskBtn = document.getElementById("saveTaskBtn");
  if (!saveTaskBtn) return;

  saveTaskBtn.addEventListener("click", saveTask);
});

/**
 * Save task handler
 * Collects form data and submits to the API
 */
function saveTask() {
  const taskForm = document.getElementById("taskForm");
  if (!taskForm) return;

  const formData = new FormData(taskForm);
  const taskId = formData.get("id");
  const listId = formData.get("list_id");
  const title = formData.get("title");
  const description = formData.get("description");
  const storyPoints = formData.get("story_points");
  const assignedTo = formData.get("assigned_to");
  const dueDate = formData.get("due_date");

  // Build request body
  const body = {
    list_id: listId,
    title,
    description: description || null,
    story_points: storyPoints ? parseInt(storyPoints, 10) : 1,
    assigned_to: assignedTo || null,
    due_date: dueDate || null,
  };

  // Determine if this is an update or create
  const isUpdate = taskId && taskId !== "";
  const url = isUpdate ? `/api/tasks/${taskId}` : "/api/tasks";
  const method = isUpdate ? "PUT" : "POST";

  // Add id to body for updates
  if (isUpdate) {
    body.id = taskId;
  }

  // Disable button during request
  const saveBtn = document.getElementById("saveTaskBtn");
  const originalText = saveBtn?.textContent;
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
  }

  fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((errorData) => {
          throw new Error(errorData.error?.message || "Failed to save task");
        });
      }
      return response.json();
    })
    .then(() => {
      // Close modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("taskModal"),
      );
      if (modal) {
        modal.hide();
      }

      // Reload page to show updated task
      window.location.reload();
    })
    .catch((error) => {
      alert(error.message || "Failed to save task. Please try again.");
    })
    .finally(() => {
      // Re-enable button
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText || "Save Task";
      }
    });
}
