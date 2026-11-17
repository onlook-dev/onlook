/** ⚠️ `./chromeBridge.js` is imported first and that is load-bearing: the entry
 *  below calls the bridge at module scope. */
import './chromeBridge.js';
import '@renderer/chrome/entry.js';
