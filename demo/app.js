const taskForm = document.querySelector('#taskForm');
const taskInput = document.querySelector('#taskInput');
const taskList = document.querySelector('#taskList');
const openCount = document.querySelector('#openCount');
const doneCount = document.querySelector('#doneCount');

function updateCounts() {
  const tasks = [...taskList.querySelectorAll('.task')];
  const done = tasks.filter((task) => task.classList.contains('done')).length;
  openCount.textContent = String(tasks.length - done);
  doneCount.textContent = String(done);
}

function bindTask(task) {
  const checkbox = task.querySelector('input[type="checkbox"]');
  checkbox.addEventListener('change', () => {
    task.classList.toggle('done', checkbox.checked);
    updateCounts();
  });
}

taskForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = taskInput.value.trim();
  if (!value) return;

  const task = document.createElement('li');
  task.className = 'task';
  task.dataset.testid = 'created-task';
  task.innerHTML = `
    <label>
      <input type="checkbox" data-testid="created-task-checkbox">
      <span></span>
    </label>
    <small>E2E CREATED</small>
  `;
  task.querySelector('span').textContent = value;
  bindTask(task);
  taskList.append(task);
  taskInput.value = '';
  taskInput.focus();
  updateCounts();
});

taskList.querySelectorAll('.task').forEach(bindTask);
updateCounts();
