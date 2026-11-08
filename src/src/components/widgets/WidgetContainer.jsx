/**
 * WidgetContainer.jsx - Standard Container & ErrorBoundary for all Stream Widgets
 * Grounded in: PROJECT.md § 3 (StreamWidgetProps) & OBS CEF Compatibility
 *
 * Enforces:
 * - Proper StreamWidgetProps validation
 * - Strict OBS CEF transparency (background: transparent !important in overlay mode)
 * - Error boundary isolation so a rendering error in one widget never crashes the OBS scene
 * - Scoped BEM class naming (.mn-widget-container, .mn-widget-[type])
 */

import React, { Component } from 'react';
import './Widgets.css';

export class WidgetErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[WidgetContainer ErrorBoundary] Crash in widget "${this.props.type || 'unknown'}":`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // In OBS Overlay mode, render transparently to avoid disruptive on-air error screens
      if (this.props.isOverlayMode) {
        return null;
      }
      return (
        <div className="mn-widget-error-fallback" style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', fontSize: '13px' }}>
          <strong>Widget Error ({this.props.type}):</strong> {this.state.error?.message || 'Render failure'}
        </div>
      );
    }
    return this.props.children;
  }
}

export function WidgetContainer({
  id,
  type,
  _config = {},
  isOverlayMode = false,
  _eventBus,
  children,
  className = '',
  style = {},
}) {
  const containerClass = [
    'mn-widget-container',
    `mn-widget-${type}`,
    isOverlayMode ? 'mn-widget-overlay-mode' : 'mn-widget-studio-mode',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const overlayStyle = isOverlayMode
    ? { background: 'transparent !important', ...style }
    : style;

  return (
    <div
      id={id ? `widget-${id}` : undefined}
      data-widget-type={type}
      className={containerClass}
      style={overlayStyle}
    >
      <WidgetErrorBoundary type={type} isOverlayMode={isOverlayMode}>
        {children}
      </WidgetErrorBoundary>
    </div>
  );
}

export default WidgetContainer;
