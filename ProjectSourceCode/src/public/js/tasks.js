document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("newTaskForm");
    const tasksContainer = document.getElementById("assignedTasks");
    // const userSelect = document.getElementById("assignedUser");
    const assignSelect = document.getElementById("assignedUser");
    const userSelect = document.getElementById("userSelect");
    const userStatsDiv = document.getElementById("userStats");

    const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "member");

    if (error) {
        console.error("Error loading users:", error);
    } else {
        users.forEach(user => {
            const option1 = document.createElement("option");
            option1.value = user.id;
            option1.textContent = user.display_name;
            assignSelect.appendChild(option1);

            const option2 = document.createElement("option");
            option2.value = user.id;
            option2.textContent = user.display_name;
            userSelect.appendChild(option2);
        });
    }

    userSelect.addEventListener("change", async () => {
        const userId = userSelect.value;

        if (!userId) {
            userStatsDiv.innerHTML = `<p>Total Points: —</p>`;
            return;
        }

        const { data: user, error: userErr } = await supabase
            .from("users")
            .select("total_points")
            .eq("id", userId)
            .single();

        if (userErr) {
            console.error("Error fetching user:", userErr);
            return;
        }

        userStatsDiv.innerHTML = `
      <p>Total Points: ${user.total_points}</p>
    `;
    });

    function addTaskToUI(task) {
        const div = document.createElement("div");
        div.className = "row border rounded m-1 py-1 p-2";
        div.innerHTML = `<strong>${task.name}</strong><br>Points: ${task.points}<br>Assigned To: ${task.user}`;
        tasksContainer.appendChild(div);
    }

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const task = {
            name: document.getElementById("taskName").value,
            points: document.getElementById("taskPoints").value,
            user: document.getElementById("assignedUser").value
        };

        addTaskToUI(task);
        form.reset();
    });
});

// const tasksContainer = document.getElementById("assignedTasks");

// function addTaskToUI(taskInfo) {
//     const taskCard = createTaskCard(taskInfo);
//     tasksContainer.appendChild(taskCard);
// }

// function createTaskCard(task) {
//     const div = document.createElement('div');
//     div.className = "row border rounded m-1 py-1 p-2";

//     // if (task.priority === "High") div.style.backgroundColor = "rgb(255, 165, 161)";
//     // else if (task.priority === "Medium") div.style.backgroundColor = "rgba(255, 228, 161, 1)";
//     // else if (task.priority === "Low") div.style.backgroundColor = "rgba(169, 255, 161, 1)";

//     div.innerHTML = `<strong>${task.name}</strong><br>Points: ${task.points}`;
//     return div;
// }

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
