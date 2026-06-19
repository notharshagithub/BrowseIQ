import os
import sys
import logging
from typing import Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn

import agent.config as config
from agent.agent import WebsiteAutomationAgent

# Set up logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main_web")

app = FastAPI(title="BrowseIQ Web Interface")

# Initialize persistent BrowseIQ Agent
agent = WebsiteAutomationAgent()

# Ensure screenshots and static directories exist
STATIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "static"))
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(config.SCREENSHOTS_DIR, exist_ok=True)

# Mount screenshots directory to serve images dynamically
app.mount("/screenshots", StaticFiles(directory=config.SCREENSHOTS_DIR), name="screenshots")
# Mount static assets if static folder exists
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

class ConnectRequest(BaseModel):
    url: str

class TaskRequest(BaseModel):
    task: str
    max_steps: Optional[int] = None

def get_web_screenshot_path(abs_path: Optional[str]) -> Optional[str]:
    """Converts absolute screenshot file path to web-accessible URL."""
    if not abs_path:
        return None
    try:
        rel_path = os.path.relpath(abs_path, config.SCREENSHOTS_DIR)
        return f"/screenshots/{rel_path.replace(os.sep, '/')}"
    except Exception:
        return None

@app.get("/", response_class=HTMLResponse)
async def read_index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if not os.path.exists(index_file):
        raise HTTPException(status_code=404, detail="Frontend file static/index.html not found.")
    return FileResponse(index_file)

@app.post("/api/connect")
async def connect(data: ConnectRequest):
    target_url = data.url.strip()
    if not target_url:
        target_url = config.TARGET_URL
        
    if not target_url.startswith(("http://", "https://")):
        target_url = "https://" + target_url

    # Check session health and launch if needed
    if not agent.is_session_healthy:
        agent.close_session()
        logger.info(f"Launching browser (headless={config.HEADLESS})...")
        if not agent.start_session(headless=config.HEADLESS):
            raise HTTPException(status_code=500, detail="Failed to initialize browser context.")

    logger.info(f"Navigating to {target_url}...")
    if not agent.navigate_to(target_url):
        agent.close_session()
        raise HTTPException(status_code=500, detail=f"Failed to navigate to target URL: {target_url}")

    # Capture initial view screenshot
    screenshot_res = agent.browser_manager.take_screenshot("initial_connect.png")
    screenshot_url = get_web_screenshot_path(screenshot_res.get("path"))

    return {
        "success": True,
        "message": f"Connected to {target_url}",
        "url": target_url,
        "screenshot": screenshot_url
    }

@app.post("/api/run-task")
async def run_task(data: TaskRequest):
    task_desc = data.task.strip()
    if not task_desc:
        raise HTTPException(status_code=400, detail="Task description cannot be empty.")

    if not agent.is_session_healthy:
        raise HTTPException(status_code=400, detail="No active web session. Connect to a website first.")

    max_steps = data.max_steps or config.MAX_STEPS
    logger.info(f"Executing task: '{task_desc}' (max_steps={max_steps})...")
    
    success = agent.run_task(task_desc, max_steps=max_steps)
    
    # Capture latest screenshot
    screenshot_res = agent.browser_manager.take_screenshot("web_latest.png")
    screenshot_url = get_web_screenshot_path(screenshot_res.get("path"))

    return {
        "success": success,
        "logs": agent.step_logs,
        "screenshot": screenshot_url,
        "summary": agent.success_summary or agent.last_failure_reason or ("Task completed." if success else "Task failed.")
    }

@app.get("/api/status")
async def get_status():
    return {
        "session_active": agent.session_active,
        "is_healthy": agent.is_session_healthy,
        "current_url": agent.current_url,
        "last_failure_reason": agent.last_failure_reason
    }

@app.post("/api/disconnect")
async def disconnect():
    if agent.session_active:
        agent.close_session()
    return {"success": True, "message": "Browser session closed."}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
