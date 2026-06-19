import { Lock, Monitor } from 'lucide-react';

export default function BrowserMockup({ sessionUrl, screenshot }) {
  // Prevent browser screenshot caching by adding a unique query param
  const screenshotUrl = screenshot ? `${screenshot}?t=${new Date().getTime()}` : null;

  return (
    <div className="browser-mockup">
      <div className="browser-toolbar">
        <div className="browser-dots">
          <div className="browser-dot btn-red"></div>
          <div className="browser-dot btn-orange"></div>
          <div className="browser-dot btn-green"></div>
        </div>
        <div className="browser-address">
          <Lock className="address-lock-icon" />
          <span id="browser-address-text">{sessionUrl || 'about:blank'}</span>
        </div>
      </div>
      <div className="browser-viewport" id="viewport-pane">
        {screenshotUrl ? (
          <img
            src={screenshotUrl}
            alt="Viewport Page State"
            className="viewport-image animate-fade-in"
            id="viewport-img"
          />
        ) : (
          <div className="viewport-placeholder" id="viewport-blank">
            <Monitor className="placeholder-icon" />
            <p>No active website session. Enter a URL in the terminal command line below to connect.</p>
          </div>
        )}
      </div>
    </div>
  );
}
