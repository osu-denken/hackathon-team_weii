import '../../frontend/play/styles.css';
// WebSocket の差し替えは、main.js より先に評価される必要がある
import './peerSocketShim.js';
import '../../frontend/play/main.js';
