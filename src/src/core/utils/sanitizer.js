/**
 * sanitizer.js — Pure-JS Defensive HTML and CSS Sanitizer
 * Grounded in: PROJECT.md § 1 & § 3, Security Audit A (Feature F42)
 *
 * Protects against XSS, inline script execution, malicious event handlers,
 * dangerous URI schemes, and layout/iframe breakouts in chat payloads and custom widgets.
 */

const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
};

/**
 * Escapes HTML control characters in string.
 *
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, (match) => HTML_ENTITIES[match] || match);
}

/**
 * Whitelist of safe HTML tags for display rendering.
 */
export const ALLOWED_TAGS = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'blockquote', 'br', 'caption', 'cite', 'code',
  'col', 'colgroup', 'dd', 'del', 'dfn', 'div', 'dl', 'dt', 'em', 'figcaption',
  'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'ins', 'kbd',
  'li', 'mark', 'ol', 'p', 'pre', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'small',
  'span', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead',
  'time', 'tr', 'u', 'ul', 'var', 'wbr'
]);

/**
 * Whitelist of allowed HTML attributes per element.
 */
export const ALLOWED_ATTRIBUTES = new Set([
  'class', 'id', 'title', 'alt', 'src', 'href', 'target', 'rel', 'width', 'height',
  'style', 'dir', 'lang', 'data-*'
]);

/**
 * Safe URI schemes for href and src attributes.
 */
export const SAFE_URL_SCHEMES = /^(https?:|data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,|mailto:|\/)/i;

/**
 * Dangerous URI schemes to reject.
 */
export const DANGEROUS_URL_SCHEMES = /^(javascript:|vbscript:|data:text\/html|data:application\/)/i;

/**
 * Sanitizes CSS strings by stripping expressions, url(javascript:), and dangerous at-rules.
 *
 * @param {string} css
 * @returns {string}
 */
export function sanitizeCss(css) {
  if (typeof css !== 'string') return '';

  let sanitized = css;
  // Remove CSS comments first to prevent bypass tricks
  sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '');

  // Strip expression(...)
  sanitized = sanitized.replace(/expression\s*\([^)]*\)/gi, '');

  // Strip behavior:
  sanitized = sanitized.replace(/behavior\s*:[^;]*;/gi, '');

  // Strip -moz-binding
  sanitized = sanitized.replace(/-moz-binding\s*:[^;]*;/gi, '');

  // Strip @import
  sanitized = sanitized.replace(/@import\s+[^;]*;/gi, '');

  // Strip url(javascript:...) or url(data:text/html...)
  sanitized = sanitized.replace(/url\s*\(\s*(['"]?)\s*(javascript:|data:text\/html|vbscript:)[^)]*\1\s*\)/gi, '');

  return sanitized;
}

/**
 * Pure JavaScript defensive HTML sanitizer.
 * Operates safely in both Node.js and browser runtimes.
 *
 * @param {string} html
 * @param {object} [options]
 * @param {Set<string>} [options.allowedTags]
 * @param {boolean} [options.allowStyles=true]
 * @returns {string}
 */
export function sanitizeHtml(html, options = {}) {
  if (typeof html !== 'string') return '';
  if (!html.trim()) return '';

  const allowedTags = options.allowedTags || ALLOWED_TAGS;
  const allowStyles = options.allowStyles !== false;

  // 1. Remove dangerous blocks completely (tags AND inner content)
  let clean = html;
  const dangerousBlocks = [
    /<script\b[^>]*>([\s\S]*?)<\/script>/gi,
    /<iframe\b[^>]*>([\s\S]*?)<\/iframe>/gi,
    /<object\b[^>]*>([\s\S]*?)<\/object>/gi,
    /<embed\b[^>]*>([\s\S]*?)<\/embed>/gi,
    /<applet\b[^>]*>([\s\S]*?)<\/applet>/gi,
    /<meta\b[^>]*>/gi,
    /<link\b[^>]*>/gi,
    /<base\b[^>]*>/gi,
    /<form\b[^>]*>([\s\S]*?)<\/form>/gi,
  ];

  for (const regex of dangerousBlocks) {
    clean = clean.replace(regex, '');
  }

  // 2. Parse and filter tags & attributes using regex tokenization
  const tagRegex = /<\/?([a-z0-9-]+)(\s+[^>]*?)?(\/?)>/gi;

  clean = clean.replace(tagRegex, (match, tagName, attrs, selfClosing) => {
    const lowerTag = tagName.toLowerCase();

    // If tag is not allowed, strip it
    if (!allowedTags.has(lowerTag)) {
      return '';
    }

    const isClosing = match.startsWith('</');
    if (isClosing) {
      return `</${lowerTag}>`;
    }

    // Sanitize attributes
    let sanitizedAttrs = '';
    if (attrs) {
      const attrRegex = /([a-z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/gi;
      let attrMatch;

      while ((attrMatch = attrRegex.exec(attrs)) !== null) {
        const attrName = attrMatch[1].toLowerCase();
        let attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';

        // Strip any event handler attribute starting with "on" (e.g. onload, onerror, onclick)
        if (attrName.startsWith('on')) {
          continue;
        }

        // Validate URLs for href, src, poster
        if (attrName === 'href' || attrName === 'src' || attrName === 'poster') {
          const trimmedVal = attrValue.trim();
          if (DANGEROUS_URL_SCHEMES.test(trimmedVal) || !SAFE_URL_SCHEMES.test(trimmedVal)) {
            continue;
          }
        }

        // Enforce safe link targets
        if (lowerTag === 'a' && attrName === 'target') {
          attrValue = '_blank';
        }

        // Validate and sanitize style attribute
        if (attrName === 'style') {
          if (!allowStyles) continue;
          attrValue = sanitizeCss(attrValue);
        }

        // Check attribute whitelist or data-* prefix
        const isAllowedAttr = ALLOWED_ATTRIBUTES.has(attrName) || attrName.startsWith('data-');
        if (isAllowedAttr) {
          sanitizedAttrs += ` ${attrName}="${escapeHtml(attrValue)}"`;
        }
      }
    }

    // Force rel="noopener noreferrer" for <a> links
    if (lowerTag === 'a') {
      if (!sanitizedAttrs.includes('rel=')) {
        sanitizedAttrs += ' rel="noopener noreferrer"';
      }
    }

    const closeSlash = selfClosing || ['br', 'hr', 'img', 'wbr'].includes(lowerTag) ? ' /' : '';
    return `<${lowerTag}${sanitizedAttrs}${closeSlash}>`;
  });

  return clean;
}

export default {
  escapeHtml,
  sanitizeHtml,
  sanitizeCss,
  ALLOWED_TAGS,
  ALLOWED_ATTRIBUTES,
};
