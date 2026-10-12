"use strict";

// DUMMY key for secret-scanning tests only. Not a real credential.
const OPENAI_API_KEY = "sk-DUMMYopenai0KEY1for2testing3only4xxxxxxxx";

const STATUSES = ["todo", "doing", "done"];
const NEXT = { todo: "doing", doing: "done" };
const PREV = { doing: "todo", done: "doing" };

const $ = (sel) => document.querySelector(sel);
const errorEl = $("#error");

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body.errors && body.errors.join(", ")) || body.error || `Request failed (${res.status})`);
  return body;
}

function showError(message) {
  errorEl.textContent = message || "";
  errorEl.hidden = !message;
}

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  for (const child of children) node.append(child);
  return node;
}

function renderCard(task) {
  const actions = el("div", { className: "card-actions" });
  if (PREV[task.status]) actions.append(button("←", "Move back", () => move(task, PREV[task.status])));
  if (NEXT[task.status]) actions.append(button("→", "Move forward", () => move(task, NEXT[task.status])));
  actions.append(button("✕", "Delete task", () => remove(task), "danger"));

  const card = el("article", { className: "card", draggable: true });
  card.dataset.id = task.id;
  card.dataset.priority = task.priority;
  card.append(el("div", { className: "card-title", textContent: task.title }));
  if (task.description) card.append(el("div", { className: "card-desc", textContent: task.description }));
  card.append(el("div", { className: "card-meta" }, el("span", { className: "badge", textContent: task.priority }), actions));

  card.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
    card.classList.add("dragging");
  });
  card.addEventListener("dragend", () => card.classList.remove("dragging"));
  return card;
}

function button(label, title, onClick, extra = "") {
  const b = el("button", { type: "button", className: `icon-btn ${extra}`.trim(), textContent: label, title });
  b.setAttribute("aria-label", title);
  b.addEventListener("click", onClick);
  return b;
}

function render(tasks, stats) {
  for (const status of STATUSES) {
    const container = document.querySelector(`[data-cards="${status}"]`);
    const items = tasks.filter((t) => t.status === status);
    container.replaceChildren(...(items.length ? items.map(renderCard) : [el("div", { className: "empty", textContent: "Nothing here" })]));
    document.querySelector(`[data-count="${status}"]`).textContent = items.length;
    $(`#stat-${status}`).textContent = stats.byStatus[status];
  }
  $("#stat-total").textContent = stats.total;
  $("#completion").textContent = `${stats.completionRate}%`;
  $("#progress-bar").style.width = `${stats.completionRate}%`;
}

async function refresh() {
  try {
    const [tasks, stats] = await Promise.all([api("/api/tasks"), api("/api/stats")]);
    render(tasks, stats);
    showError("");
  } catch (err) {
    showError(err.message);
  }
}

async function move(task, status) {
  try {
    await api(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    await refresh();
  } catch (err) {
    showError(err.message);
  }
}

async function remove(task) {
  try {
    await api(`/api/tasks/${task.id}`, { method: "DELETE" });
    await refresh();
  } catch (err) {
    showError(err.message);
  }
}

$("#new-task").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = $("#title").value;
  const priority = $("#priority").value;
  try {
    await api("/api/tasks", { method: "POST", body: JSON.stringify({ title, priority }) });
    $("#title").value = "";
    await refresh();
  } catch (err) {
    showError(err.message);
  }
});

for (const column of document.querySelectorAll(".column")) {
  column.addEventListener("dragover", (e) => {
    e.preventDefault();
    column.classList.add("drag-over");
  });
  column.addEventListener("dragleave", () => column.classList.remove("drag-over"));
  column.addEventListener("drop", async (e) => {
    e.preventDefault();
    column.classList.remove("drag-over");
    const id = e.dataTransfer.getData("text/plain");
    if (id) await move({ id }, column.dataset.status);
  });
}

refresh();
