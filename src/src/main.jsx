import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Inspect URL before rendering to determine runtime mode (Decoupled OBS Overlay vs Creator Dashboard)
const url = new URL(window.location.href);
const isObs = url.pathname.startsWith('/overlay') || url.searchParams.get('obs') === '1';

if (isObs) {
  // 1. Instantly enforce transparency on DOM root before mounting (prevents black flash in OBS CEF)
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';
  document.body.classList.add('obs-overlay-runtime');

  // 2. Dynamically import ONLY the lightweight overlay runtime (<130KB chunk)
  // Completely excludes Firebase SDK, FundingView, and App.css
  import('./components/overlay/StandaloneOverlay.jsx').then(({ default: StandaloneOverlay }) => {
    createRoot(document.getElementById('root')).render(<StandaloneOverlay />);
  });
} else {
  // 3. Dynamically import heavy Creator Dashboard & Overlay Studio SPA
  import('./App.jsx').then(({ default: App }) => {
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
}
