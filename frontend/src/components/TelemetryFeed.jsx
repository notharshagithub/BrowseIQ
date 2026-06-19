import { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

export default function TelemetryFeed({
  logs,
  onClear,
  inputValue,
  setInputValue,
  maxSteps,
  setMaxSteps,
  status,
  onSubmit,
  onDisconnect,
  sessionUrl
}) {
  const terminalLogsRef = useRef(null);

  // Auto-scroll when logs change
  useEffect(() => {
    if (terminalLogsRef.current) {
      terminalLogsRef.current.scrollTop = terminalLogsRef.current.scrollHeight;
    }
  }, [logs]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      onSubmit();
    }
  };

  return (
    <div className="terminal-panel">
      <div className="terminal-header">
        <span className="terminal-title">
          <Terminal className="title-icon-inline" />
          AGENT TELEMETRY FEED
        </span>
        <div className="terminal-header-actions">
          {sessionUrl && (
            <button
              className="terminal-action-btn disconnect-btn"
              onClick={onDisconnect}
              disabled={status === 'running' || status === 'connecting'}
            >
              Disconnect
            </button>
          )}
          <button className="terminal-action-btn clear-btn" onClick={onClear}>
            Clear Feed
          </button>
        </div>
      </div>
      
      <div className="terminal-logs" id="terminal-pane" ref={terminalLogsRef}>
        {logs.length === 0 ? (
          <div className="log-line">
            <span className="log-tag-thought">[SYSTEM]</span>
            <span>Console feed is empty.</span>
          </div>
        ) : (
          logs.map((log, index) => {
            let typeClass = 'log-tag-thought';
            if (log.type === 'action') {
              typeClass = 'log-tag-action';
            } else if (log.type === 'observation') {
              typeClass = 'log-tag-observation';
            } else if (log.type === 'error') {
              typeClass = 'log-tag-error';
            }

            return (
              <div className="log-line" key={index}>
                <span className={typeClass}>[{log.tag.toUpperCase()}]</span>
                <span>{log.text}</span>
              </div>
            );
          })
        )}
      </div>

      <div className="terminal-input-container">
        <span className="terminal-prompt">BrowseIQ &gt;</span>
        <input
          type="text"
          className="terminal-input-field"
          placeholder={
            sessionUrl
              ? "Enter task instructions (e.g. 'search for playwright') or type 'disconnect'"
              : "Enter target URL to connect (e.g. 'google.com' or 'https://github.com')"
          }
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={status === 'running' || status === 'connecting'}
        />
        <div className="terminal-controls">
          <select
            className="terminal-steps-select"
            value={maxSteps}
            onChange={(e) => setMaxSteps(Number(e.target.value))}
            disabled={status === 'running' || status === 'connecting'}
            title="Max Step Limit"
          >
            <option value={5}>5 Steps</option>
            <option value={10}>10 Steps</option>
            <option value={15}>15 Steps</option>
          </select>
          <button
            className="terminal-send-btn"
            onClick={onSubmit}
            disabled={status === 'running' || status === 'connecting' || !inputValue.trim()}
          >
            {status === 'running' || status === 'connecting' ? (
              <span className="loader"></span>
            ) : (
              <span>Send</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
