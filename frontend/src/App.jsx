import { useState, useEffect } from 'react';
import Header from './components/Header';
import BrowserMockup from './components/BrowserMockup';
import TelemetryFeed from './components/TelemetryFeed';
import './App.css';

export default function App() {
  const [status, setStatus] = useState('standby');
  const [sessionUrl, setSessionUrl] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [commandInput, setCommandInput] = useState('');
  const [taskSteps, setTaskSteps] = useState(5);
  const [logs, setLogs] = useState([
    { tag: 'system', text: 'BrowseIQ interface initialized. Waiting for web host connect...', type: 'thought' }
  ]);

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

  const handleCommandSubmit = async () => {
    const input = commandInput.trim();
    if (!input) return;

    // Reset input prompt value instantly
    setCommandInput('');

    // Shortcut: Disconnect command
    if (input.toLowerCase() === '/disconnect' || input.toLowerCase() === 'disconnect') {
      await handleDisconnect();
      return;
    }

    // Shortcut: Clear command
    if (input.toLowerCase() === '/clear' || input.toLowerCase() === 'clear') {
      handleClearLogs();
      return;
    }

    // Check if input should be treated as a target URL connection command
    const isUrl = (str) => {
      if (str.startsWith('http://') || str.startsWith('https://')) return true;
      // Heuristic: No spaces, contains a dot
      if (!str.includes(' ') && str.includes('.')) return true;
      return false;
    };

    const navPrefixes = ['go to ', 'open ', 'visit ', 'navigate to '];
    let navUrl = null;
    for (const prefix of navPrefixes) {
      if (input.toLowerCase().startsWith(prefix)) {
        navUrl = input.substring(prefix.length).trim();
        break;
      }
    }

    if (isUrl(input)) {
      navUrl = input;
    }

    if (navUrl) {
      // Connect Target Site Action
      if (!navUrl.startsWith('http://') && !navUrl.startsWith('https://')) {
        navUrl = 'https://' + navUrl;
      }
      
      setStatus('connecting');
      addLog('system', `Attempting connection to target url: '${navUrl}'...`, 'thought');

      try {
        const response = await fetch('/api/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: navUrl }),
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
      }
    } else {
      // Autopilot Agent Task Action
      if (!sessionUrl) {
        addLog('system', "Warning: Browser session is not connected. Enter a URL first (e.g. 'google.com' or 'open wikipedia.org') to connect.", 'error');
        return;
      }

      // UX Requirement: Clear log feeds automatically on start of new task run loop
      setLogs([]);
      setStatus('running');

      setLogs([
        { tag: 'system', text: `Starting autonomous loop for: '${input}'`, type: 'thought' }
      ]);

      try {
        const response = await fetch('/api/run-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task: input, max_steps: taskSteps }),
        });

        const data = await response.json();

        if (response.ok) {
          setScreenshot(data.screenshot);

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
      }
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
    addLog('system', 'Log console feed cleared.', 'thought');
  };

  return (
    <div className="app-root-container">
      <Header status={status} />
      
      <main className="dashboard-container single-column">
        {/* Workspace Viewer & Terminal Console (No sidebar) */}
        <section className="viewer-container">
          <BrowserMockup
            sessionUrl={sessionUrl}
            screenshot={screenshot}
          />
          <TelemetryFeed
            logs={logs}
            onClear={handleClearLogs}
            inputValue={commandInput}
            setInputValue={setCommandInput}
            maxSteps={taskSteps}
            setMaxSteps={setTaskSteps}
            status={status}
            onSubmit={handleCommandSubmit}
            onDisconnect={handleDisconnect}
            sessionUrl={sessionUrl}
          />
        </section>
      </main>
    </div>
  );
}
