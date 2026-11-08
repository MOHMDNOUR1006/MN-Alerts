/**
 * Core events re-export ensuring backward compatibility across both
 * `src/core/events/eventBus.js` and `src/services/eventBus.js` import paths.
 */
export { EventBus, eventBus, default } from '../../services/eventBus.js';
