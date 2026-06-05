import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const p2pDir = path.resolve(__dirname, '..');

try {
  // 1. Generate host.html from frontend/index.html
  const frontendHtmlPath = path.resolve(__dirname, '../../frontend/index.html');
  let hostHtml = fs.readFileSync(frontendHtmlPath, 'utf8');

  // Replace script
  hostHtml = hostHtml.replace('<script type="module" src="main.js"></script>', '<script type="module" src="/src/host.js"></script>');
  // Replace title
//  hostHtml = hostHtml.replace('<title>Viewer of "phone ∧ shoot"</title>', '<title>Host (P2P) - "phone ∧ shoot"</title>');
  // Remove CSS link (handled by Vite import in JS)
  hostHtml = hostHtml.replace(/<link rel="stylesheet" href="styles\.css"[^>]*>/, '');
  // Make asset scripts relative
  hostHtml = hostHtml.replace('src="/asset/scripts/sprites.js"', 'src="./asset/scripts/sprites.js"');

  // Inject Room ID display after qr-overlay
  hostHtml = hostHtml.replace(
    '<div class="overlay-qr"><img id="qr-overlay" alt="QR" /></div>',
    `<div class="overlay-qr">
                    <img id="qr-overlay" alt="QR" />
                </div>
                <div id="room-id-display" style="position: absolute; left: 12px; top: 180px; color: white; padding: 4px 8px; font-size: 14px; border-radius: 4px; z-index: 50; user-select: all; font-family: monospace; white-space: nowrap;">Room ID 取得中...</div>`
  );

  fs.writeFileSync(path.resolve(p2pDir, 'host.html'), hostHtml);
  console.log('Successfully generated p2p/host.html from frontend/index.html');

  // 2. Generate client.html from smartphone/index.html
  const smartphoneHtmlPath = path.resolve(__dirname, '../../smartphone/index.html');
  let clientHtml = fs.readFileSync(smartphoneHtmlPath, 'utf8');

  // Replace script
  clientHtml = clientHtml.replace('<script type="module" src="main.js"></script>', '<script type="module" src="/src/client.js"></script>');
  // Replace title
//  clientHtml = clientHtml.replace('<title>Controller of "phone ∧ shoot"</title>', '<title>Controller (P2P) - "phone ∧ shoot"</title>');
  // Remove CSS link (handled by Vite import in JS)
  clientHtml = clientHtml.replace(/<link rel="stylesheet" href="styles\.css[^>]*>/, '');
  // Make asset scripts relative
  clientHtml = clientHtml.replace('src="/asset/scripts/sprites.js"', 'src="./asset/scripts/sprites.js"');

  // Inject Room ID Panel replacing hidden input
  clientHtml = clientHtml.replace(
    '<input type="hidden" id="ws-url" value="">',
    `<!-- ルームID入力欄 -->
                <div id="room-id-panel" style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px;">
                    <div style="font-size:11px;color:#888;">ルームID (ホスト画面を参照)</div>
                    <input type="text" id="ws-url" value="" placeholder="ルームIDを入力"
                        style="width:100%;box-sizing:border-box;padding:8px 10px;background:#1a1a1a;border:1px solid #444;color:#fff;font-size:14px;">
                </div>`
  );

  fs.writeFileSync(path.resolve(p2pDir, 'client.html'), clientHtml);
  console.log('Successfully generated p2p/client.html from smartphone/index.html');

} catch (err) {
  console.error('Error generating HTML files:', err);
  process.exit(1);
}
