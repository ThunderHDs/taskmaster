console.log("Testing autocompletion flow...");

// Simular el comportamiento de updateTaskRecursively
function testAutoCompletion() {
  const task = {
    id: "parent-1",
    title: "Tarea Padre",
    completed: false,
    subtasks: [
      { id: "sub-1", title: "Subtarea 1", completed: true },
      { id: "sub-2", title: "Subtarea 2", completed: true }
    ]
  };
  
  const updatedSubtasks = task.subtasks;
  const allSubtasksCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(subtask => subtask.completed);
  const shouldAutoComplete = allSubtasksCompleted && !task.completed && task.id !== "sub-1"; // Simular que estamos actualizando una subtarea
  
  console.log("Task:", task.title);
  console.log("Has subtasks:", updatedSubtasks.length > 0);
  console.log("Subtasks count:", updatedSubtasks.length);
  console.log("Completed subtasks:", updatedSubtasks.filter(s => s.completed).length);
  console.log("All subtasks completed:", allSubtasksCompleted);
  console.log("Task already completed:", task.completed);
  console.log("Should auto-complete:", shouldAutoComplete);
}

testAutoCompletion();
