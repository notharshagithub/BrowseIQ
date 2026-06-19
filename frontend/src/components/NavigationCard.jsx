import { Globe, Link, Link2Off } from 'lucide-react';

export default function NavigationCard({
  targetUrl,
  setTargetUrl,
  sessionUrl,
  status,
  loadingConnect,
  onConnect,
  onDisconnect,
}) {
  const isDisconnectDisabled = !sessionUrl || status === 'running' || status === 'connecting';

  return (
    <div className="section-card">
      <span className="section-title">
        <Globe className="title-icon" />
        Navigation Target
      </span>
      <div className="input-group">
        <label htmlFor="target-url">Website URL</label>
        <input
          type="text"
          id="target-url"
          placeholder="https://google.com"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          disabled={status === 'running' || status === 'connecting'}
        />
      </div>
      <button
        className="btn btn-cyan"
        id="btn-connect"
        onClick={onConnect}
        disabled={loadingConnect || status === 'running' || status === 'connecting'}
      >
        {loadingConnect ? (
          <>
            <span className="loader"></span>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Link className="btn-icon" />
            <span>Connect Target Site</span>
          </>
        )}
      </button>
      <button
        className="btn btn-disconnect"
        id="btn-disconnect"
        onClick={onDisconnect}
        disabled={isDisconnectDisabled}
      >
        <Link2Off className="btn-icon" />
        <span>Disconnect Session</span>
      </button>
    </div>
  );
}
