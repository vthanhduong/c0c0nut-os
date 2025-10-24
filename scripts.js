const windows = Array.from(document.querySelectorAll(".window"));
const desktopIcons = Array.from(document.querySelectorAll(".desktop-icon"));
const startButton = document.getElementById("startButton");
const startMenu = document.getElementById("startMenu");
const startItems = Array.from(document.querySelectorAll(".start-item"));
const taskbarApps = document.getElementById("taskbarApps");
const clockEl = document.getElementById("taskbarClock");
const bootScreen = document.getElementById("bootScreen");
const bootProgress = document.getElementById("bootProgress");
const systemInterface = document.getElementById("systemInterface");
const terminalOutput = document.getElementById("terminalOutput");
const terminalForm = document.getElementById("terminalForm");
const terminalInput = document.getElementById("terminalInput");
const terminalPrompt = "visitor@c0c0nut-os:~$";

let startupSound = null;
let startupSoundPrepared = false;
let startupSoundWarmup = null;

if (typeof Audio === "function") {
	startupSound = new Audio("resources/startup-sound.mp3");
	startupSound.preload = "auto";
	startupSound.volume = 0.65;
	startupSound.loop = false;
	startupSound.muted = true;

	const warmupAttempt = startupSound.play();
	if (warmupAttempt && typeof warmupAttempt.then === "function") {
		startupSoundWarmup = warmupAttempt
			.then(() => {
				startupSound.pause();
				startupSound.currentTime = 0;
				startupSound.muted = false;
				startupSoundPrepared = true;
			})
			.catch((error) => {
				console.warn("Không thể chuẩn bị âm thanh khởi động tự động", error);
				startupSound.muted = false;
				startupSoundPrepared = true;
			});
	} else {
		startupSound.pause();
		startupSound.currentTime = 0;
		startupSound.muted = false;
		startupSoundPrepared = true;
	}
}

function playStartupSound() {
	if (!startupSound) return;

	const triggerPlayback = () => {
		startupSound.muted = false;
		startupSound.currentTime = 0;
		const playPromise = startupSound.play();
		if (playPromise && typeof playPromise.then === "function") {
			playPromise.catch((error) => {
				console.warn("Không thể phát âm thanh khởi động", error);
			});
		}
	};

	if (startupSoundPrepared) {
		triggerPlayback();
	} else if (startupSoundWarmup && typeof startupSoundWarmup.finally === "function") {
		startupSoundWarmup.finally(triggerPlayback);
	} else {
		triggerPlayback();
	}
}

const terminalHistory = [];
let terminalHistoryIndex = -1;

function appendTerminalLine(text, type = "output") {
	if (!terminalOutput) return;
	const line = document.createElement("div");
	line.classList.add("terminal-line");
	if (type === "command") {
		line.classList.add("command");
	}
	line.textContent = text;
	terminalOutput.appendChild(line);
	terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function handleTerminalCommand(rawInput) {
	if (!terminalOutput) return;
	const command = rawInput.trim();
	if (!command) {
		appendTerminalLine(`${terminalPrompt} `, "command");
		return;
	}
	terminalHistory.push(command);
	terminalHistoryIndex = terminalHistory.length;
	if (command === "clear") {
		terminalOutput.innerHTML = "";
		return;
	}
	appendTerminalLine(`${terminalPrompt} ${command}`, "command");
	switch (command) {
		case "help":
			[
				"Available commands:",
				"help    - Show this help message",
				"version - Display OS version",
				"clear   - Clear the terminal output",
				"time    - Show the current date and time",
			].forEach((line) => appendTerminalLine(line));
			break;
		case "version":
			appendTerminalLine("c0c0nut-os version 1.0.1 (up to date)");
			break;
		case "time": {
			const now = new Date();
			const formatted = now.toLocaleString("en-GB", {
				dateStyle: "medium",
				timeStyle: "medium",
			});
			appendTerminalLine(`Current time: ${formatted}`);
			break;
		}
		default:
			appendTerminalLine(`Command not found: ${command}. Type "help" to see available commands.`);
			break;
	}
}

if (terminalForm && terminalInput) {
	terminalForm.addEventListener("submit", (event) => {
		event.preventDefault();
		const value = terminalInput.value;
		handleTerminalCommand(value);
		terminalInput.value = "";
		terminalInput.focus();
	});

	terminalInput.addEventListener("keydown", (event) => {
		if (!terminalHistory.length) return;
		if (event.key === "ArrowUp") {
			event.preventDefault();
			if (terminalHistoryIndex === -1) {
				terminalHistoryIndex = terminalHistory.length;
			}
			if (terminalHistoryIndex > 0) {
				terminalHistoryIndex -= 1;
			}
			terminalInput.value = terminalHistory[terminalHistoryIndex] ?? "";
			requestAnimationFrame(() => {
				terminalInput.setSelectionRange(terminalInput.value.length, terminalInput.value.length);
			});
		} else if (event.key === "ArrowDown") {
			event.preventDefault();
			if (terminalHistoryIndex < terminalHistory.length - 1) {
				terminalHistoryIndex += 1;
				terminalInput.value = terminalHistory[terminalHistoryIndex] ?? "";
			} else {
				terminalHistoryIndex = terminalHistory.length;
				terminalInput.value = "";
			}
			requestAnimationFrame(() => {
				terminalInput.setSelectionRange(terminalInput.value.length, terminalInput.value.length);
			});
		}
	});

	appendTerminalLine('Welcome to Coconut terminal! Type "help" to see available commands.');
}

const state = {
	activeApp: null,
	highestZ: 10,
	instances: new Map(),
};

const appNames = {
	notes: "Sổ tay",
	gallery: "Thư viện",
	terminal: "Terminal",
	weather: "Thời tiết",
};

function updateClock() {
	const now = new Date();
	const hours = now.getHours().toString().padStart(2, "0");
	const minutes = now.getMinutes().toString().padStart(2, "0");
	clockEl.textContent = `${hours}:${minutes}`;
}

updateClock();
setInterval(updateClock, 30_000);

function saveNotes() {
	const notes = document.querySelector(".notes-editor");
	if (!notes) return;
	const content = notes.value;
	try {
		localStorage.setItem("web-os-notes", content);
	} catch (error) {
		console.warn("Không thể lưu ghi chú", error);
	}
}

function loadNotes() {
	const notes = document.querySelector(".notes-editor");
	if (!notes) return;
	const saved = localStorage.getItem("web-os-notes");
	if (saved) {
		notes.value = saved;
	}
	const handler = () => {
		if ("requestIdleCallback" in window) {
			window.requestIdleCallback(saveNotes);
		} else {
			setTimeout(saveNotes, 300);
		}
	};
	notes.addEventListener("input", handler);
}

function toggleStartMenu(forceClose = false) {
	if (forceClose) {
		startMenu.classList.remove("visible");
		return;
	}
	startMenu.classList.toggle("visible");
}

function focusWindow(appId) {
	const win = document.querySelector(`.window[data-app="${appId}"]`);
	if (!win) return;
	state.highestZ += 1;
	windows.forEach((w) => w.classList.remove("active"));
	win.style.zIndex = state.highestZ;
	win.classList.add("active");
	state.activeApp = appId;
	updateTaskbarState();
}

function showWindow(appId) {
	const win = document.querySelector(`.window[data-app="${appId}"]`);
	if (!win) return;

	win.classList.add("visible");
	focusWindow(appId);
	state.instances.set(appId, { minimized: false });
	updateTaskbarState();
	if (appId === "terminal" && terminalInput) {
		setTimeout(() => {
			terminalInput.focus();
		}, 0);
	}
}

function hideWindow(appId) {
	const win = document.querySelector(`.window[data-app="${appId}"]`);
	if (!win) return;
	win.classList.remove("visible", "active");
	state.instances.delete(appId);
	if (state.activeApp === appId) {
		state.activeApp = null;
	}
	updateTaskbarState();
}

function minimizeWindow(appId) {
	const win = document.querySelector(`.window[data-app="${appId}"]`);
	if (!win) return;
	win.classList.remove("active");
	win.classList.remove("visible");
	const data = state.instances.get(appId) || {};
	state.instances.set(appId, { ...data, minimized: true });
	if (state.activeApp === appId) {
		state.activeApp = null;
	}
	updateTaskbarState();
}

function restoreWindow(appId) {
	const win = document.querySelector(`.window[data-app="${appId}"]`);
	if (!win) return;
	win.classList.add("visible");
	focusWindow(appId);
	const data = state.instances.get(appId) || {};
	state.instances.set(appId, { ...data, minimized: false });
	updateTaskbarState();
	if (appId === "terminal" && terminalInput) {
		setTimeout(() => {
			terminalInput.focus();
		}, 0);
	}
}

function toggleWindow(appId) {
	const data = state.instances.get(appId);
	if (!data) {
		showWindow(appId);
	} else if (data.minimized) {
		restoreWindow(appId);
	} else if (state.activeApp === appId) {
		minimizeWindow(appId);
	} else {
		focusWindow(appId);
	}
}

function updateTaskbarState() {
	taskbarApps.innerHTML = "";
	state.instances.forEach((info, appId) => {
		const button = document.createElement("button");
		button.className = "taskbar-app";
		if (!info.minimized && state.activeApp === appId) {
			button.classList.add("active");
		}
		button.textContent = appNames[appId] ?? appId;
		button.addEventListener("click", () => toggleWindow(appId));
		taskbarApps.appendChild(button);
	});
}

function makeWindowDraggable(win) {
	const titleBar = win.querySelector(".title-bar");
	if (!titleBar) return;

	let isDragging = false;
	let offsetX = 0;
	let offsetY = 0;

	titleBar.addEventListener("mousedown", (event) => {
		const { clientX, clientY } = event;
		const rect = win.getBoundingClientRect();
		isDragging = true;
		offsetX = clientX - rect.left;
		offsetY = clientY - rect.top;
		focusWindow(win.dataset.app);
	});

	document.addEventListener("mousemove", (event) => {
		if (!isDragging) return;
		const { clientX, clientY } = event;
		const x = clientX - offsetX;
		const y = clientY - offsetY;
		win.style.left = `${Math.max(0, Math.min(window.innerWidth - 100, x))}px`;
		win.style.top = `${Math.max(0, Math.min(window.innerHeight - 160, y))}px`;
	});

	document.addEventListener("mouseup", () => {
		isDragging = false;
	});
}

windows.forEach((win) => {
	makeWindowDraggable(win);

	win.addEventListener("mousedown", () => focusWindow(win.dataset.app));

	win.querySelectorAll(".window-actions button").forEach((btn) => {
		const action = btn.dataset.action;
		btn.addEventListener("click", (event) => {
			event.stopPropagation();
			if (action === "close") {
				hideWindow(win.dataset.app);
			} else if (action === "minimize") {
				minimizeWindow(win.dataset.app);
			}
		});
	});
});

desktopIcons.forEach((icon) => {
	const appId = icon.dataset.app;
	icon.addEventListener("dblclick", () => {
		showWindow(appId);
	});
	icon.addEventListener("keyup", (event) => {
		if (event.key === "Enter") {
			showWindow(appId);
		}
	});
});

startButton.addEventListener("click", () => {
	toggleStartMenu();
});

startItems.forEach((item) => {
	item.addEventListener("click", () => {
		const appId = item.dataset.app;
		toggleStartMenu(true);
		showWindow(appId);
	});
});

document.addEventListener("click", (event) => {
	if (!startMenu.contains(event.target) && !startButton.contains(event.target)) {
		toggleStartMenu(true);
	}
});

document.addEventListener("keydown", (event) => {
	if (event.metaKey || event.ctrlKey) {
		if (event.key.toLowerCase() === "n") {
			showWindow("notes");
		} else if (event.key.toLowerCase() === "t") {
			showWindow("terminal");
		}
	}
	if (event.key === "Escape") {
		toggleStartMenu(true);
	}
});

function fakeWeatherData() {
	const cities = [
		{ name: "Hà Nội", temp: 28, status: "Nhiều nắng", humidity: "62%", wind: "13 km/h", feels: "30°C" },
		{ name: "Đà Nẵng", temp: 31, status: "Nắng nhẹ", humidity: "55%", wind: "9 km/h", feels: "33°C" },
		{ name: "TP.HCM", temp: 30, status: "Nắng gián đoạn", humidity: "68%", wind: "11 km/h", feels: "32°C" },
		{ name: "Huế", temp: 27, status: "Âm u", humidity: "71%", wind: "15 km/h", feels: "28°C" },
	];
	const randomCity = cities[Math.floor(Math.random() * cities.length)];
	document.getElementById("weather-city").textContent = randomCity.name;
	document.getElementById("weather-temp").textContent = `${randomCity.temp}°C`;
	document.getElementById("weather-status").textContent = randomCity.status;
	document.getElementById("weather-humidity").textContent = randomCity.humidity;
	document.getElementById("weather-wind").textContent = randomCity.wind;
	document.getElementById("weather-feels").textContent = randomCity.feels;
}

fakeWeatherData();
setInterval(fakeWeatherData, 18_000);
loadNotes();

function finalizeBoot() {
	bootScreen.classList.add("hidden");
	systemInterface.classList.add("system-ready");
	setTimeout(() => {
		bootScreen.remove();
	}, 900);
	playStartupSound();
	showWindow("notes");
	showWindow("weather");
}

function runBootSequence() {
	const timeline = [
		{ value: 24, delay: 360 },
		{ value: 41, delay: 280 },
		{ value: 43, delay: 560 },
		{ value: 67, delay: 920 },
		{ value: 69, delay: 360 },
		{ value: 82, delay: 760 },
		{ value: 85, delay: 310 },
		{ value: 93, delay: 780 },
		{ value: 100, delay: 470 },
	];

	let accumulated = 0;
	timeline.forEach((step, index) => {
		accumulated += step.delay;
		setTimeout(() => {
			bootProgress.style.width = `${step.value}%`;
			if (index === timeline.length - 1) {
				setTimeout(finalizeBoot, 300);
			}
		}, accumulated);
	});
}

runBootSequence();
