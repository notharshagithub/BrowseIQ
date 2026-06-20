/**
 * API Client Services for BrowseIQ REST Interface
 */

export async function getSessionStatus() {
  const response = await fetch('/api/status');
  if (!response.ok) {
    throw new Error('Failed to fetch session status');
  }
  return response.json();
}

export async function connectBrowser(url) {
  const response = await fetch('/api/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.detail || 'Navigation connection failed.');
  }
  return data;
}

export async function runAutopilotTask(task, maxSteps) {
  const response = await fetch('/api/run-task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, max_steps: maxSteps }),
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Task execution failed.');
  }
  return data;
}

export async function disconnectBrowser() {
  const response = await fetch('/api/disconnect', {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to disconnect cleanly.');
  }
  return response.json();
}
