import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyAT0rPov6Bb6NddbVL7UgIfYgS9CggP5Sk",
  authDomain: "nazik-timer.firebaseapp.com",
  projectId: "nazik-timer",
  storageBucket: "nazik-timer.firebasestorage.app",
  messagingSenderId: "314207092962",
  appId: "1:314207092962:web:98f1840e1657f69e241ebb",
  measurementId: "G-26XZZH2TDF"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
const VAPID_KEY = "BH6lkiuiC59zmXHggTkcYudDCmHfeYh0dsuy6dbUAZ-a6fLXoxHWh2p4zdcvB1KFlZzFpvqT8g2BT1X_hny_ErE";
const STORAGE_KEY = "nazik-timer-plus:timers";
const ACTIVE_KEY = "nazik-timer-plus:active";
const RING_LENGTH = 666;
const enableBtn = document.querySelector("#enableNotifications");

const units = [
  ["years", 0, 99],
  ["months", 0, 11],
  ["weeks", 0, 3],
  ["days", 0, 6],
  ["hours", 0, 23],
  ["minutes", 0, 59],
  ["seconds", 0, 59],
];

const state = {
  timers: [],
  activeId: null,
  notified: new Set(),
  activeDeleteArmed: false,
  reorder: null,
};

const el = {
  initialDuration: document.querySelector("#initialDuration"),
  timerTitle: document.querySelector("#timerTitle"),
  progressValue: document.querySelector("#progressValue"),
  remainingTime: document.querySelector("#remainingTime"),
  finishAt: document.querySelector("#finishAt"),
  pauseToggle: document.querySelector("#pauseToggle"),
  restartTimer: document.querySelector("#restartTimer"),
  deleteActive: document.querySelector("#deleteActive"),
  openList: document.querySelector("#openList"),
  closeList: document.querySelector("#closeList"),
  timerSheet: document.querySelector("#timerSheet"),
  timerList: document.querySelector("#timerList"),
  openCreate: document.querySelector("#openCreate"),
  closeCreate: document.querySelector("#closeCreate"),
  createModal: document.querySelector("#createModal"),
  createTimer: document.querySelector("#createTimer"),
  timerName: document.querySelector("#timerName"),
  previewFinish: document.querySelector("#previewFinish"),
  scrim: document.querySelector("#scrim"),
};
async function requestPushPermission() {
  try {
    // 1. Ждем готовности нашего уже запущенного sw.js
    const registration = await navigator.serviceWorker.ready;

    // 2. Явно передаем этот сервис-воркер в Firebase
    const token = await getToken(messaging, { 
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration 
    });

    if (token) {
      console.log("Токен устройства получен:", token);
      alert("Уведомления успешно включены!");
    }
  } catch (err) {
    console.error("Ошибка при получении токена:", err);
    alert("Ошибка: " + err.message);
  }
}

function loadTimers() {
  try {
    state.timers = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    state.activeId = localStorage.getItem(ACTIVE_KEY) || state.timers[0]?.id || null;
  } catch {
    state.timers = [];
    state.activeId = null;
  }
}

function saveTimers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.timers));
  if (state.activeId) {
    localStorage.setItem(ACTIVE_KEY, state.activeId);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDateTime(date) {
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function plural(value, forms) {
  const abs = Math.abs(value) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}

function addDuration(start, duration) {
  const date = new Date(start);
  date.setFullYear(date.getFullYear() + duration.years);
  date.setMonth(date.getMonth() + duration.months);
  date.setDate(date.getDate() + duration.weeks * 7 + duration.days);
  date.setHours(date.getHours() + duration.hours);
  date.setMinutes(date.getMinutes() + duration.minutes);
  date.setSeconds(date.getSeconds() + duration.seconds);
  date.setMilliseconds(0);
  return date;
}

function durationToMs(duration) {
  const start = new Date();
  return Math.max(0, addDuration(start, duration).getTime() - start.getTime());
}

function selectedDuration() {
  return Object.fromEntries(units.map(([id]) => [id, Number(document.querySelector(`#${id}`).value)]));
}

function hasDuration(duration) {
  return Object.values(duration).some(Boolean);
}

function formatDuration(duration, limit = 7) {
  const parts = [];
  if (duration.years) parts.push(`${duration.years} ${plural(duration.years, ["год", "года", "лет"])}`);
  if (duration.months) parts.push(`${duration.months} мес`);
  if (duration.weeks) parts.push(`${duration.weeks} нед`);
  if (duration.days) parts.push(`${duration.days} ${plural(duration.days, ["день", "дня", "дней"])}`);
  if (duration.hours) parts.push(`${duration.hours} ${plural(duration.hours, ["час", "часа", "часов"])}`);
  if (duration.minutes) parts.push(`${duration.minutes} мин`);
  if (duration.seconds) parts.push(`${duration.seconds} сек`);
  return parts.slice(0, limit).join(" ") || "0 сек";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function trashIconSvg() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16"></path>
      <path d="M10 11v6"></path>
      <path d="M14 11v6"></path>
      <path d="M6 7l1 14h10l1-14"></path>
      <path d="M9 7V4h6v3"></path>
    </svg>
  `;
}

function diffCalendarParts(fromDate, toDate) {
  if (toDate <= fromDate) {
    return { years: 0, months: 0, weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const cursor = new Date(fromDate);
  const parts = { years: 0, months: 0, weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const steps = [
    ["years", (date) => date.setFullYear(date.getFullYear() + 1)],
    ["months", (date) => date.setMonth(date.getMonth() + 1)],
    ["weeks", (date) => date.setDate(date.getDate() + 7)],
    ["days", (date) => date.setDate(date.getDate() + 1)],
    ["hours", (date) => date.setHours(date.getHours() + 1)],
    ["minutes", (date) => date.setMinutes(date.getMinutes() + 1)],
    ["seconds", (date) => date.setSeconds(date.getSeconds() + 1)],
  ];

  steps.forEach(([key, advance]) => {
    while (true) {
      const next = new Date(cursor);
      advance(next);
      if (next > toDate) break;
      cursor.setTime(next.getTime());
      parts[key] += 1;
    }
  });

  return parts;
}

function currentRemaining(timer, now = Date.now()) {
  if (!timer.running) return Math.max(0, timer.remainingMs);
  return Math.max(0, timer.endAt - now);
}

function getActiveTimer() {
  return state.timers.find((timer) => timer.id === state.activeId) || state.timers[0] || null;
}

function setProgress(percent) {
  el.progressValue.style.strokeDasharray = RING_LENGTH;
  el.progressValue.style.strokeDashoffset = RING_LENGTH * (1 - percent);
}

function renderMain() {
  const timer = getActiveTimer();
  const now = Date.now();

  if (!timer) {
    el.initialDuration.textContent = "Создай первый таймер";
    el.timerTitle.textContent = "Длинный отсчет без ограничений";
    el.remainingTime.innerHTML = '<button class="circle-add-button" type="button">+ добавить таймер</button>';
    el.finishAt.textContent = "Нажми +, чтобы начать";
    el.pauseToggle.disabled = true;
    el.pauseToggle.hidden = false;
    el.pauseToggle.textContent = "Пауза";
    el.restartTimer.hidden = true;
    el.deleteActive.disabled = true;
    el.deleteActive.hidden = true;
    el.deleteActive.classList.remove("is-armed");
    el.deleteActive.classList.add("is-hidden");
    bindCircleAdd();
    setProgress(0);
    return;
  }

  const remaining = currentRemaining(timer, now);
  const endDate = timer.running ? new Date(timer.endAt) : new Date(now + remaining);
  const parts = diffCalendarParts(new Date(now), endDate);
  const visibleParts = [];
  if (parts.years) visibleParts.push(`${parts.years} ${plural(parts.years, ["год", "года", "лет"])}`);
  if (parts.months) visibleParts.push(`${parts.months} мес`);
  if (parts.weeks) visibleParts.push(`${parts.weeks} нед`);
  if (parts.days) visibleParts.push(`${parts.days} ${plural(parts.days, ["день", "дня", "дней"])}`);
  if (parts.hours) visibleParts.push(`${parts.hours} ${plural(parts.hours, ["час", "часа", "часов"])}`);
  if (parts.minutes) visibleParts.push(`${parts.minutes} мин`);
  visibleParts.push(`${parts.seconds} сек`);

  el.initialDuration.textContent = formatDuration(timer.duration);
  el.timerTitle.textContent = timer.name;
  el.remainingTime.innerHTML = visibleParts.map((part) => `<span>${escapeHtml(part)}</span>`).join("");
  el.finishAt.textContent = `Финиш: ${formatDateTime(endDate)}`;
  el.pauseToggle.hidden = remaining <= 0;
  el.pauseToggle.disabled = remaining <= 0;
  el.pauseToggle.textContent = timer.running ? "Остановить" : "Продолжить";
  el.restartTimer.hidden = remaining > 0;
  el.deleteActive.disabled = false;
  el.deleteActive.hidden = false;
  el.deleteActive.classList.remove("is-hidden");
  el.deleteActive.classList.toggle("is-armed", state.activeDeleteArmed);

  const percent = timer.totalMs ? Math.max(0, Math.min(1, remaining / timer.totalMs)) : 0;
  setProgress(percent);

  if (remaining <= 0 && timer.running) {
    timer.running = false;
    timer.remainingMs = 0;
    saveTimers();
    notifyFinished(timer);
  }
}

function renderList() {
  if (!state.timers.length) {
    el.timerList.innerHTML = '<button class="empty-add-button" type="button">+ добавить таймер</button>';
    el.timerList.querySelector(".empty-add-button").addEventListener("click", () => openSheet(el.createModal));
    return;
  }

  el.timerList.innerHTML = state.timers.map((timer) => {
    const remaining = currentRemaining(timer);
    const remainingParts = diffCalendarParts(new Date(), new Date(Date.now() + remaining));
    return `
      <div class="timer-card-shell" data-id="${timer.id}">
        <button class="swipe-action swipe-delete" type="button" aria-label="Удалить таймер">${trashIconSvg()}</button>
        <div class="timer-card ${timer.id === state.activeId ? "is-active" : ""}" role="button" tabindex="0">
          <span class="clock-tile">⏱</span>
          <span class="card-main">
            <span class="card-duration">${escapeHtml(formatDuration(timer.duration, 2))}</span>
            <span class="card-name">${escapeHtml(timer.name)}</span>
          </span>
          <span class="card-right">${escapeHtml(formatDuration(remainingParts, 2))}</span>
          <button class="drag-handle" type="button" draggable="true" aria-label="Переместить таймер">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    `;
  }).join("");

  el.timerList.querySelectorAll(".timer-card-shell").forEach(bindCard);
}

function bindCard(shell) {
  const card = shell.querySelector(".timer-card");
  const deleteButton = shell.querySelector(".swipe-delete");
  const dragHandle = shell.querySelector(".drag-handle");
  let startX = 0;
  let currentX = 0;
  let dragged = false;

  card.addEventListener("click", (event) => {
    if (event.target.closest(".drag-handle")) return;
    if (dragged) {
      event.preventDefault();
      dragged = false;
      return;
    }
    state.activeId = shell.dataset.id;
    state.activeDeleteArmed = false;
    saveTimers();
    closeSheets();
    render();
  });

  card.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    state.activeId = shell.dataset.id;
    state.activeDeleteArmed = false;
    saveTimers();
    closeSheets();
    render();
  });

  card.addEventListener("pointerdown", (event) => {
    const rect = card.getBoundingClientRect();
    if (event.target.closest(".drag-handle") || event.clientX > rect.right - 58) {
      event.preventDefault();
      dragged = true;
      startReorder(shell, card, event.clientY);
      return;
    }
    startX = event.clientX;
    currentX = startX;
    dragged = false;
    card.setPointerCapture(event.pointerId);
  });

  card.addEventListener("pointermove", (event) => {
    currentX = event.clientX;
    if (Math.abs(currentX - startX) > 8) {
      dragged = true;
    }
  });

  card.addEventListener("pointerup", () => {
    const delta = currentX - startX;
    if (delta < -38) {
      card.classList.add("is-delete-open");
    } else if (delta > 20) {
      card.classList.remove("is-delete-open");
    }
  });

  deleteButton.addEventListener("click", () => deleteTimer(shell.dataset.id));

  dragHandle.addEventListener("dragstart", (event) => {
    state.reorder = { shell, moved: true, startY: event.clientY };
    shell.classList.add("is-dragging");
    card.classList.remove("is-delete-open");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", shell.dataset.id);
  });

  shell.addEventListener("dragover", (event) => {
    if (!state.reorder?.shell || state.reorder.shell === shell) return;
    event.preventDefault();
    const rect = shell.getBoundingClientRect();
    if (event.clientY < rect.top + rect.height / 2) {
      el.timerList.insertBefore(state.reorder.shell, shell);
    } else {
      el.timerList.insertBefore(state.reorder.shell, shell.nextSibling);
    }
  });

  dragHandle.addEventListener("dragend", finishReorder);

  dragHandle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    dragged = true;
    startReorder(shell, card, event.clientY);
  });

  dragHandle.addEventListener("mousedown", (event) => {
    if (state.reorder) return;
    event.preventDefault();
    dragged = true;
    startReorder(shell, card, event.clientY);
  });

  dragHandle.addEventListener("touchstart", (event) => {
    if (state.reorder) return;
    event.preventDefault();
    dragged = true;
    startReorder(shell, card, event.touches[0].clientY);
  }, { passive: false });
}

function startReorder(shell, card, startY) {
  if (state.reorder) return;
  state.reorder = { shell, moved: false, startY };
  shell.classList.add("is-dragging");
  card.classList.remove("is-delete-open");
  document.addEventListener("pointermove", moveReorder);
  document.addEventListener("pointerup", finishReorder, { once: true });
  document.addEventListener("mousemove", moveMouseReorder);
  document.addEventListener("mouseup", finishReorder, { once: true });
  document.addEventListener("touchmove", moveTouchReorder, { passive: false });
  document.addEventListener("touchend", finishReorder, { once: true });
}

function moveReorder(event) {
  moveReorderTo(event.clientY);
}

function moveMouseReorder(event) {
  moveReorderTo(event.clientY);
}

function moveTouchReorder(event) {
  event.preventDefault();
  moveReorderTo(event.touches[0].clientY);
}

function moveReorderTo(clientY) {
  if (!state.reorder) return;
  const { shell, startY } = state.reorder;
  if (Math.abs(clientY - startY) > 6) {
    state.reorder.moved = true;
  }

  const siblings = [...el.timerList.querySelectorAll(".timer-card-shell:not(.is-dragging)")];
  const before = siblings.find((item) => clientY < item.getBoundingClientRect().top + item.offsetHeight / 2);
  if (before) {
    el.timerList.insertBefore(shell, before);
  } else {
    el.timerList.append(shell);
  }
}

function finishReorder() {
  if (!state.reorder) return;
  const { shell, moved } = state.reorder;
  document.removeEventListener("pointermove", moveReorder);
  document.removeEventListener("mousemove", moveMouseReorder);
  document.removeEventListener("touchmove", moveTouchReorder);
  shell.classList.remove("is-dragging");
  state.reorder = null;

  if (!moved) return;
  const order = [...el.timerList.querySelectorAll(".timer-card-shell")].map((item) => item.dataset.id);
  state.timers.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  saveTimers();
  renderList();
}

function render() {
  renderMain();
  renderList();
}

function openSheet(sheet) {
  if (sheet === el.createModal) {
    el.timerSheet.classList.remove("is-open");
    el.timerSheet.setAttribute("aria-hidden", "true");
  }
  if (sheet === el.timerSheet) {
    renderList();
  }
  el.scrim.hidden = false;
  sheet.classList.add("is-open");
  sheet.setAttribute("aria-hidden", "false");
}

function closeSheets() {
  el.scrim.hidden = true;
  [el.timerSheet, el.createModal].forEach((sheet) => {
    sheet.classList.remove("is-open");
    sheet.setAttribute("aria-hidden", "true");
  });
}

function deleteTimer(id) {
  state.timers = state.timers.filter((timer) => timer.id !== id);
  if (state.activeId === id) {
    state.activeId = state.timers[0]?.id || null;
  }
  state.activeDeleteArmed = false;
  saveTimers();
  render();
}

function togglePause() {
  const timer = getActiveTimer();
  if (!timer) return;
  state.activeDeleteArmed = false;

  if (timer.running) {
    timer.remainingMs = currentRemaining(timer);
    timer.running = false;
  } else {
    timer.endAt = Date.now() + timer.remainingMs;
    timer.running = true;
  }

  saveTimers();
  render();
}

function restartActiveTimer() {
  const timer = getActiveTimer();
  if (!timer) return;

  const now = Date.now();
  timer.endAt = addDuration(new Date(now), timer.duration).getTime();
  timer.totalMs = Math.max(1000, timer.endAt - now);
  timer.remainingMs = timer.totalMs;
  timer.running = true;
  state.activeDeleteArmed = false;
  state.notified.delete(timer.id);
  saveTimers();
  render();
}

function deleteActiveTimer() {
  const timer = getActiveTimer();
  if (!timer) return;

  if (!state.activeDeleteArmed) {
    state.activeDeleteArmed = true;
    renderMain();
    return;
  }

  deleteTimer(timer.id);
}

function bindCircleAdd() {
  const button = el.remainingTime.querySelector(".circle-add-button");
  if (button) {
    button.addEventListener("click", () => openSheet(el.createModal));
  }
}

async function notifyFinished(timer) {
  if (state.notified.has(timer.id)) return;
  state.notified.add(timer.id);

  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
  if (Notification.permission !== "granted") return;

  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "timer-finished",
      title: "Таймер закончился",
      body: timer.name,
    });
  } else {
    new Notification("Таймер закончился", { body: timer.name, icon: "icon.svg" });
  }
}

function updatePreview() {
  const duration = selectedDuration();
  el.createTimer.disabled = !hasDuration(duration);
  if (!hasDuration(duration)) {
    el.previewFinish.textContent = "Выбери время";
    return;
  }
  el.previewFinish.textContent = `Финиш: ${formatDateTime(addDuration(new Date(), duration))}`;
}

function createTimer() {
  const duration = selectedDuration();
  if (!hasDuration(duration)) return;

  const now = Date.now();
  const endAt = addDuration(new Date(now), duration).getTime();
  const timer = {
    id: crypto.randomUUID(),
    name: el.timerName.value.trim() || "Без названия",
    duration,
    totalMs: Math.max(1000, endAt - now),
    remainingMs: Math.max(1000, endAt - now),
    endAt,
    running: true,
    createdAt: now,
  };

  state.timers.unshift(timer);
  state.activeId = timer.id;
  state.activeDeleteArmed = false;
  saveTimers();
  resetCreateForm();
  closeSheets();
  render();
  requestNotificationPermissionSoftly();
}

function resetCreateForm() {
  el.timerName.value = "";
  units.forEach(([id]) => {
    document.querySelector(`#${id}`).value = "0";
  });
  updatePreview();
}

async function requestNotificationPermissionSoftly() {
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

function fillPickers() {
  units.forEach(([id, min, max]) => {
    const select = document.querySelector(`#${id}`);
    for (let value = min; value <= max; value += 1) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.append(option);
    }
    select.addEventListener("change", updatePreview);
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

el.openList.addEventListener("click", () => openSheet(el.timerSheet));
el.closeList.addEventListener("click", closeSheets);
el.openCreate.addEventListener("click", () => openSheet(el.createModal));
el.closeCreate.addEventListener("click", closeSheets);
el.scrim.addEventListener("click", closeSheets);
el.pauseToggle.addEventListener("click", togglePause);
el.restartTimer.addEventListener("click", restartActiveTimer);
el.deleteActive.addEventListener("click", deleteActiveTimer);
el.createTimer.addEventListener("click", createTimer);

fillPickers();
loadTimers();
registerServiceWorker();
updatePreview();
render();
setInterval(renderMain, 1000);
if (enableBtn) {
  enableBtn.addEventListener("click", requestPushPermission);
}