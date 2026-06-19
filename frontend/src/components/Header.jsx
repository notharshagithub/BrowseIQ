import { Network } from 'lucide-react';

export default function Header({ status }) {
  // Map status values to badge CSS classes and label texts
  const getStatusDetails = (statusVal) => {
    switch (statusVal) {
      case 'connected':
        return { dotClass: 'connected', label: 'CONNECTED' };
      case 'connecting':
        return { dotClass: 'active', label: 'CONNECTING' };
      case 'running':
        return { dotClass: 'active', label: 'RUNNING' };
      case 'error':
        return { dotClass: 'error', label: 'ERROR' };
      case 'failed':
        return { dotClass: 'error', label: 'FAILED' };
      default:
        return { dotClass: '', label: 'STANDBY' };
    }
  };

  const { dotClass, label } = getStatusDetails(status);

  return (
    <header className="app-header">
      <div className="logo-group">
        <Network className="logo-icon-svg" />
        <span className="logo-text">BrowseIQ</span>
      </div>
      <div className="status-badge" id="app-status">
        <span className={`status-dot ${dotClass}`} id="status-indicator"></span>
        <span id="status-label">{label}</span>
      </div>
    </header>
  );
}
