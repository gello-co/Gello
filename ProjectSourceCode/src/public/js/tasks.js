document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("newTaskForm");
    const tasksContainer = document.getElementById("assignedTasks");

    function addTaskToUI(task) {
        const div = document.createElement("div");
        div.className = "row border rounded m-1 py-1 p-2";
        div.innerHTML = `<strong>${task.name}</strong><br>Points: ${task.points}`;
        tasksContainer.appendChild(div);
    }

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const task = {
            name: document.getElementById("taskName").value,
            points: document.getElementById("taskPoints").value
        };

        addTaskToUI(task);
        form.reset();
    });
});

const tasksContainer = document.getElementById("assignedTasks");

function addTaskToUI(taskInfo) {   
    const taskCard = createTaskCard(taskInfo);
    tasksContainer.appendChild(taskCard);
}

function createTaskCard(task) {
    const div = document.createElement('div');
    div.className = "row border rounded m-1 py-1 p-2";

    // if (task.priority === "High") div.style.backgroundColor = "rgb(255, 165, 161)";
    // else if (task.priority === "Medium") div.style.backgroundColor = "rgba(255, 228, 161, 1)";
    // else if (task.priority === "Low") div.style.backgroundColor = "rgba(169, 255, 161, 1)";

    div.innerHTML = `<strong>${task.name}</strong><br>Points: ${task.points}`;
    return div;
}

// function saveTask() {

//     const taskDetails = {
//         name: document.getElementById("taskName").value,
//         points: document.getElementById("taskPoints").value
//         // difficulty: document.getElementById("taskDifficulty").value
//     };

//     document.getElementById('newTaskForm').reset();

//     addTaskToUI(taskDetails);
//     return true;
// }
