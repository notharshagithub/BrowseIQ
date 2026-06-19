import React, { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

export default function TelemetryFeed({ logs, onClear }) {
  const terminalPaneRef = useRef(null);

  useEffect(() => {
    if (terminalPaneRef.current) {
      terminalPaneRef.current.scrollTop = terminalPaneRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="terminal-panel">
      <div className="terminal-header">
        <span className="terminal-title">
          <Terminal className="title-icon-inline" />
          AGENT TELEMETRY FEED
        </span>
        <button className="terminal-clear-btn" onClick={onClear}>
          Clear
        </button>
      </div>
      <div className="terminal-logs" id="terminal-pane" ref={terminalPaneRef}>
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
    </div>
  );
}
