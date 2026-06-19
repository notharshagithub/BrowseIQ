import { useState, useEffect } from 'react';
import Header from './components/Header';
import NavigationCard from './components/NavigationCard';
import TaskCard from './components/TaskCard';
import BrowserMockup from './components/BrowserMockup';
import TelemetryFeed from './components/TelemetryFeed';
import './App.css';

export default function App() {
  const [status, setStatus] = useState('standby');
  const [targetUrl, setTargetUrl] = useState('https://www.google.com');
  const [sessionUrl, setSessionUrl] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [taskDesc, setTaskDesc] = useState('');
  const [taskSteps, setTaskSteps] = useState(5);
  const [logs, setLogs] = useState([
    { tag: 'system', text: 'BrowseIQ interface initialized. Waiting for web host connect...', type: 'thought' }
  ]);
  const [loadingConnect, setLoadingConnect] = useState(false);
  const [loadingTask, setLoadingTask] = useState(false);

  // Check active browser status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/status');
        if (response.ok) {
          const data = await response.json();
          if (data.session_active && data.is_healthy) {
            setSessionUrl(data.current_url);
            setStatus('connected');
            setScreenshot('/screenshots/web_latest.png');
            setLogs(prev => [
              ...prev,
              { tag: 'system', text: `Restored active session at: ${data.current_url}`, type: 'observation' }
            ]);
          }
        }
      } catch (err) {
        console.error('Failed to retrieve session status:', err);
      }
    };
    checkStatus();
  }, []);

  const addLog = (tag, text, type = 'thought') => {
    setLogs(prev => [...prev, { tag, text, type }]);
  };

  const handleConnect = async () => {
    if (!targetUrl.trim()) {
      addLog('system', 'Warning: Navigation target URL cannot be empty.', 'error');
      return;
    }

    setLoadingConnect(true);
    setStatus('connecting');
    addLog('system', `Attempting connection to target url: '${targetUrl}'...`, 'thought');

    try {
      const response = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSessionUrl(data.url);
        setScreenshot(data.screenshot);
        setStatus('connected');
        addLog('system', `Successfully connected: ${data.url}`, 'observation');
      } else {
        throw new Error(data.detail || 'Navigation failed.');
      }
    } catch (err) {
      setStatus('error');
      addLog('error', `Connection failure: ${err.message}`, 'error');
      setScreenshot(null);
    } finally {
      setLoadingConnect(false);
    }
  };

  const handleDisconnect = async () => {
    setStatus('connecting');
    addLog('system', 'Closing browser session...', 'thought');

    try {
      const response = await fetch('/api/disconnect', { method: 'POST' });
      if (response.ok) {
        setSessionUrl(null);
        setScreenshot(null);
        setStatus('standby');
        addLog('system', 'Session closed and browser cleaned up.', 'thought');
      } else {
        throw new Error('Failed to disconnect cleanly.');
      }
    } catch (err) {
      setStatus('error');
      addLog('error', `Disconnect error: ${err.message}`, 'error');
    }
  };

  const handleLaunchTask = async () => {
    if (!taskDesc.trim()) {
      addLog('system', 'Warning: Task description cannot be empty.', 'error');
      return;
    }

    // Clear task text input field (UX improvement)
    const taskInputToSubmit = taskDesc;
    setTaskDesc('');

    // Clear terminal log screen automatically (UX improvement)
    setLogs([]);

    setLoadingTask(true);
    setStatus('running');
    
    // We add the initial log after clearing the terminal logs
    setLogs([
      { tag: 'system', text: `Starting autonomous loop for: '${taskInputToSubmit}'`, type: 'thought' }
    ]);

    try {
      const response = await fetch('/api/run-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskInputToSubmit, max_steps: taskSteps }),
      });

      const data = await response.json();

      if (response.ok) {
        setScreenshot(data.screenshot);

        // Append execution steps logs in sequence
        if (data.logs && data.logs.length > 0) {
          data.logs.forEach(log => {
            if (log.type === 'thought') {
              addLog('thought', log.content, 'thought');
            } else if (log.type === 'action') {
              addLog('actuator', log.desc, 'action');
            } else if (log.type === 'observation') {
              const outcome = log.success ? 'Done' : `Failed: ${log.message}`;
              addLog('result', `${log.name} outcome: ${outcome}`, log.success ? 'observation' : 'error');
            }
          });
        }

        if (data.success) {
          setStatus('connected');
          addLog('success', `Task completed: ${data.summary}`, 'observation');
        } else {
          setStatus('failed');
          addLog('failure', `Task stopped: ${data.summary}`, 'error');
        }
      } else {
        throw new Error(data.detail || 'Task execution failed.');
      }
    } catch (err) {
      setStatus('error');
      addLog('error', `Task query crash: ${err.message}`, 'error');
    } finally {
      setLoadingTask(false);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
    addLog('system', 'Log console feed cleared.', 'thought');
  };

  return (
    <div className="app-root-container">
      <Header status={status} />
      
      <main className="dashboard-container">
        {/* Left Control Panel */}
        <aside className="control-panel">
          <NavigationCard
            targetUrl={targetUrl}
            setTargetUrl={setTargetUrl}
            sessionUrl={sessionUrl}
            status={status}
            loadingConnect={loadingConnect}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
          <TaskCard
            taskDesc={taskDesc}
            setTaskDesc={setTaskDesc}
            taskSteps={taskSteps}
            setTaskSteps={setTaskSteps}
            sessionUrl={sessionUrl}
            status={status}
            loadingTask={loadingTask}
            onLaunch={handleLaunchTask}
          />
        </aside>

        {/* Right Workspace Viewer & Terminal Console */}
        <section className="viewer-container">
          <BrowserMockup
            sessionUrl={sessionUrl}
            screenshot={screenshot}
            status={status}
          />
          <TelemetryFeed
            logs={logs}
            onClear={handleClearLogs}
          />
        </section>
      </main>
    </div>
  );
}
