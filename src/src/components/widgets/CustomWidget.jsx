/**
 * CustomWidget.jsx - Sandboxed Custom HTML/CSS/JS Widget
 * Feature F31: Sandboxed container rendering creator HTML/CSS via isolated iframe srcdoc with defensive sanitization
 */

import React, { useEffect, useRef } from 'react';
import WidgetContainer from './WidgetContainer.jsx';
import { sanitizeHtml, sanitizeCss } from '../../core/utils/sanitizer.js';

const DEFAULT_HTML = `
<div class="custom-card">
  <h3>أهلاً بكم في البث</h3>
  <p>تابعونا على وسائل التواصل للمزيد من التحديات!</p>
</div>
`;

const DEFAULT_CSS = `
.custom-card {
  padding: 16px 20px;
  background: rgba(15, 12, 18, 0.85);
  border: 1px solid #2DD4BF;
  border-radius: 14px;
  color: #ffffff;
  font-family: sans-serif;
  text-align: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}
.custom-card h3 {
  margin: 0 0 8px 0;
  color: #2DD4BF;
}
.custom-card p {
  margin: 0;
  font-size: 14px;
  color: #d1d5db;
}
`;

export function CustomWidget({
  id = 'custom-html',
  type = 'custom-html',
  config = {},
  isOverlayMode = false,
  eventBus,
}) {
  const {
    html = DEFAULT_HTML,
    css = DEFAULT_CSS,
    js = '',
    sandboxMode = 'iframe', // 'iframe' | 'sanitized-dom'
  } = config;

  const iframeRef = useRef(null);

  // Relay eventBus messages to iframe window via postMessage
  useEffect(() => {
    if (!eventBus || typeof eventBus.on !== 'function') return;

    const handleStreamEvent = (evt) => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage(
            { type: 'MN_STREAM_EVENT', event: evt },
            '*'
          );
        } catch {}
      }
    };

    const unsub = eventBus.on('stream_event', handleStreamEvent);
    return () => unsub();
  }, [eventBus]);

  if (sandboxMode === 'sanitized-dom') {
    const cleanHtml = sanitizeHtml(html);
    const cleanCss = sanitizeCss(css);

    return (
      <WidgetContainer id={id} type={type} config={config} isOverlayMode={isOverlayMode} eventBus={eventBus}>
        <div className="mn-customwidget-dom" style={{ width: '100%', height: '100%' }}>
          <style>{cleanCss}</style>
          <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
        </div>
      </WidgetContainer>
    );
  }

  // Strict sandboxed iframe srcdoc
  // sandbox="allow-scripts" WITHOUT allow-same-origin or allow-top-navigation
  const srcdocContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <style>
        body {
          margin: 0;
          padding: 0;
          background: transparent !important;
          overflow: hidden;
        }
        ${sanitizeCss(css)}
      </style>
    </head>
    <body>
      ${html}
      ${js ? `<script>${js}</script>` : ''}
    </body>
    </html>
  `;

  return (
    <WidgetContainer
      id={id}
      type={type}
      config={config}
      isOverlayMode={isOverlayMode}
      eventBus={eventBus}
    >
      <div className="mn-customwidget" style={{ width: '100%', height: '100%' }}>
        <iframe
          ref={iframeRef}
          title={`custom-widget-${id}`}
          sandbox="allow-scripts"
          srcDoc={srcdocContent}
          style={{ width: '100%', height: '100%', border: 'none', background: 'transparent' }}
        />
      </div>
    </WidgetContainer>
  );
}

export default CustomWidget;
