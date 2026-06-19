const btnConnect = document.getElementById("btn-connect");
const btnDisconnect = document.getElementById("btn-disconnect");
const btnRunTask = document.getElementById("btn-run-task");
const targetUrlInput = document.getElementById("target-url");
const taskDescInput = document.getElementById("task-desc");
const taskStepsSelect = document.getElementById("task-steps");

const statusIndicator = document.getElementById("status-indicator");
const statusLabel = document.getElementById("status-label");

const browserAddressText = document.getElementById("browser-address-text");
const viewportBlank = document.getElementById("viewport-blank");
const viewportImg = document.getElementById("viewport-img");

const terminalPane = document.getElementById("terminal-pane");
const terminalClear = document.getElementById("terminal-clear");

// UI State tracker
let sessionUrl = null;

function addLogLine(tag, text, type = "thought") {
    const line = document.createElement("div");
    line.className = "log-line";
    
    const tagSpan = document.createElement("span");
    tagSpan.className = `log-tag-${type}`;
    tagSpan.textContent = `[${tag.toUpperCase()}]`;
    
    const textSpan = document.createElement("span");
    textSpan.textContent = text;
    
    line.appendChild(tagSpan);
    line.appendChild(textSpan);
    terminalPane.appendChild(line);
    
    // Auto scroll
    terminalPane.scrollTop = terminalPane.scrollHeight;
}

function setStatus(status, label) {
    statusIndicator.className = "status-dot " + status;
    statusLabel.textContent = label.toUpperCase();
}

function setViewportScreenshot(url) {
    if (url) {
        viewportBlank.style.display = "none";
        viewportImg.src = url + "?t=" + new Date().getTime(); // Prevent cache
        viewportImg.style.display = "block";
    } else {
        viewportImg.style.display = "none";
        viewportBlank.style.display = "flex";
    }
}

// 1. Connect Target Web Site
btnConnect.addEventListener("click", async () => {
    const url = targetUrlInput.value.trim();
    btnConnect.disabled = true;
    btnConnect.innerHTML = `<span class="loader"></span> <span>Connecting...</span>`;
    setStatus("active", "connecting");
    
    addLogLine("system", `Attempting connection to target url: '${url}'...`, "thought");

    try {
        const response = await fetch("/api/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url })
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            sessionUrl = data.url;
            browserAddressText.textContent = data.url;
            setViewportScreenshot(data.screenshot);
            
            setStatus("connected", "connected");
            btnDisconnect.disabled = false;
            btnRunTask.disabled = false;
            
            addLogLine("system", `Successfully connected: ${data.url}`, "observation");
        } else {
            throw new Error(data.detail || "Navigation failed.");
        }
    } catch (err) {
        setStatus("error", "error");
        addLogLine("error", `Connection failure: ${err.message}`, "error");
        setViewportScreenshot(null);
    } finally {
        btnConnect.disabled = false;
        btnConnect.innerHTML = `<span>Connect Target Site</span>`;
    }
});

// 2. Disconnect Session
btnDisconnect.addEventListener("click", async () => {
    btnDisconnect.disabled = true;
    try {
        const response = await fetch("/api/disconnect", { method: "POST" });
        if (response.ok) {
            sessionUrl = null;
            browserAddressText.textContent = "about:blank";
            setViewportScreenshot(null);
            setStatus("standby", "standby");
            btnRunTask.disabled = true;
            addLogLine("system", "Session closed and browser cleaned up.", "thought");
        }
    } catch (err) {
        addLogLine("error", `Disconnect error: ${err.message}`, "error");
    } finally {
        btnDisconnect.disabled = true;
    }
});

// 3. Launch Agentic Autonomous Loop
btnRunTask.addEventListener("click", async () => {
    const task = taskDescInput.value.trim();
    const maxSteps = parseInt(taskStepsSelect.value);
    
    if (!task) {
        addLogLine("system", "Warning: Task description cannot be empty.", "error");
        return;
    }

    // Clear the task input textarea to keep the UX clean
    taskDescInput.value = "";

    // Clear telemetry logs pane automatically when starting a new loop
    terminalPane.innerHTML = "";

    btnRunTask.disabled = true;
    btnConnect.disabled = true;
    btnDisconnect.disabled = true;
    btnRunTask.innerHTML = `<span class="loader"></span> <span>Running Autopilot...</span>`;
    
    setStatus("active", "running");
    addLogLine("system", `Starting autonomous loop for: '${task}'`, "thought");

    try {
        const response = await fetch("/api/run-task", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task, max_steps: maxSteps })
        });

        const data = await response.json();
        
        if (response.ok) {
            // Update latest screenshot
            setViewportScreenshot(data.screenshot);
            
            // Render step-by-step logs returned from the backend agent trace
            if (data.logs && data.logs.length > 0) {
                data.logs.forEach(log => {
                    if (log.type === "thought") {
                        addLogLine("thought", log.content, "thought");
                    } else if (log.type === "action") {
                        addLogLine("actuator", log.desc, "action");
                    } else if (log.type === "observation") {
                        const status = log.success ? "Done" : `Failed: ${log.message}`;
                        addLogLine("result", `${log.name} outcome: ${status}`, log.success ? "observation" : "error");
                    }
                });
            }
            
            if (data.success) {
                setStatus("connected", "connected");
                addLogLine("success", `Task completed: ${data.summary}`, "observation");
            } else {
                setStatus("error", "failed");
                addLogLine("failure", `Task stopped: ${data.summary}`, "error");
            }
        } else {
            throw new Error(data.detail || "Task execution failed.");
        }
    } catch (err) {
        setStatus("error", "error");
        addLogLine("error", `Task query crash: ${err.message}`, "error");
    } finally {
        btnRunTask.disabled = false;
        btnConnect.disabled = false;
        btnDisconnect.disabled = false;
        btnRunTask.innerHTML = `<span>Launch Agentic Loop</span>`;
    }
});

// 4. Clear logs panel
terminalClear.addEventListener("click", () => {
    terminalPane.innerHTML = "";
    addLogLine("system", "Log console feed cleared.", "thought");
});

// Initialize Lucide icons on DOM ready
document.addEventListener("DOMContentLoaded", () => {
    if (window.lucide) {
        window.lucide.createIcons();
    }
});
