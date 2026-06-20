import { Network } from 'lucide-react';

export default function Header({ status, currentView, onViewChange }) {
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
      <div className="logo-group" style={{ cursor: 'pointer' }} onClick={() => onViewChange('home')}>
        <Network className="logo-icon-svg" />
        <span className="logo-text">BrowseIQ</span>
      </div>
      
      <nav className="header-nav">
        <button 
          className={`nav-link-btn ${currentView === 'home' ? 'active' : ''}`}
          onClick={() => onViewChange('home')}
        >
          Home
        </button>
        <button 
          className={`nav-link-btn ${currentView === 'workspace' ? 'active' : ''}`}
          onClick={() => onViewChange('workspace')}
        >
          Workspace
        </button>
      </nav>

      <div className="status-badge" id="app-status">
        <span className={`status-dot ${dotClass}`} id="status-indicator"></span>
        <span id="status-label">{label}</span>
      </div>
    </header>
  );
}
