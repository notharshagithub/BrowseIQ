import { useState, useEffect } from 'react';
import Header from './components/Header';
import BrowserMockup from './components/BrowserMockup';
import TelemetryFeed from './components/TelemetryFeed';
import Homepage from './components/Homepage';
import { getSessionStatus, connectBrowser, runAutopilotTask, disconnectBrowser } from './services/api';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

export default function App() {
  const [view, setView] = useState('home'); // 'home' or 'workspace'
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
        const data = await getSessionStatus();
        if (data.session_active && data.is_healthy) {
          setSessionUrl(data.current_url);
          setStatus('connected');
          setScreenshot('/screenshots/web_latest.png');
          setLogs(prev => [
            ...prev,
            { tag: 'system', text: `Restored active session at: ${data.current_url}`, type: 'observation' }
          ]);
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
      await disconnectBrowser();
      setSessionUrl(null);
      setScreenshot(null);
      setStatus('standby');
      addLog('system', 'Session closed and browser cleaned up.', 'thought');
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
        const data = await connectBrowser(navUrl);
        setSessionUrl(data.url);
        setScreenshot(data.screenshot);
        setStatus('connected');
        addLog('system', `Successfully connected: ${data.url}`, 'observation');
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
        const data = await runAutopilotTask(input, taskSteps);
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

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.35, ease: 'easeIn' } }
  };

  return (
    <div className="app-root-container">
      <Header status={status} currentView={view} onViewChange={setView} />
      
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait">
          {view === 'home' ? (
            <Homepage key="home" onLaunchWorkspace={() => setView('workspace')} />
          ) : (
            <motion.section 
              key="workspace"
              className="dashboard-container single-column"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ height: '100%', overflow: 'hidden' }}
            >
              <div className="viewer-container">
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
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
