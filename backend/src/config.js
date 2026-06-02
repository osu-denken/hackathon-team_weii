import os from 'os';
import path from 'path';

const PORT = 443; //Number(process.env.PORT) || 3001;
const USE_HTTPS = true; //process.env.USE_HTTPS === 'true';
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || path.resolve('../shared/server-key.pem');
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || path.resolve('../shared/server.pem');

// const FRONTEND_URL = null; // nullの場合は自動に
// const FRONTEND_URL = 'https://hackathon-team-weii.fly.dev/client/';
const FRONTEND_URL = "https://obtundent-britteny-handily.ngrok-free.dev/client/";

const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

const VIRTUAL_INTERFACE_PATTERNS = [
  /virtual/i,
  /vmware/i,
  /vbox/i,
  /virtualbox/i,
  /hyper-?v/i,
  /vethernet/i,
  /docker/i,
  /wsl/i,
  /loopback/i,
  /hamachi/i,
  /tunnel/i,
  /tap/i,
  /tailscale/i,
  /wireguard/i,
  /vpn/i,
];
const PREFERRED_INTERFACE_PATTERNS = [
  /wi-?fi/i,
  /wlan/i,
  /ethernet/i,
  /^en/i,
  /^eth/i,
  /local area connection/i,
];

const STATIC_ROUTES = {
  client: path.resolve('../smartphone'),
  viewer: path.resolve('../frontend'),
  play: path.resolve('../frontend/play'),
  asset: path.resolve('../asset'),
};

const TICK_MS = Number(process.env.TICK_MS) || 40; // ゲームの状態を更新してViewer(フロントエンド)に送る間隔 (40ms = 25fps)

const getLanIPv4 = () => {
  const interfaces = os.networkInterfaces();
  let fallbackPrivateIp = null;

  const isVirtualInterface = (name) => VIRTUAL_INTERFACE_PATTERNS.some((pattern) => pattern.test(name));
  const isPreferredInterface = (name) => PREFERRED_INTERFACE_PATTERNS.some((pattern) => pattern.test(name));

  for (const [name, entries] of Object.entries(interfaces)) {
    if (!entries) continue;

    for (const address of entries) {
      if (address.family !== 'IPv4' || address.internal) continue;

      const [first, second] = address.address.split('.').map(Number);
      const isPrivateIPv4 =
        first === 10 ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168);
      const isLinkLocalIPv4 = first === 169 && second === 254;

      if (isLinkLocalIPv4 || isVirtualInterface(name)) continue;
      if (isPrivateIPv4 && isPreferredInterface(name)) return address.address;

      if (isPrivateIPv4 && !fallbackPrivateIp)
        fallbackPrivateIp = address.address;
    }
  }

  return fallbackPrivateIp;
};

const buildClientUrl = (req) => {
  if (FRONTEND_URL) return FRONTEND_URL;

  const hostHeader = req.headers.host || `localhost:${PORT}`;
  const hostName = req.hostname || hostHeader.split(':')[0];
  const portMatch = hostHeader.match(/:(\d+)$/);
  const port = portMatch ? `:${portMatch[1]}` : '';
  const protocol = req.protocol || 'https';

  if (LOCALHOST_HOSTNAMES.has(hostName)) {
    const lanIp = getLanIPv4();
    if (lanIp) return `${protocol}://${lanIp}${port}/client/`;
  }

  return `${protocol}://${hostHeader}/client/`;
};

export { PORT, USE_HTTPS, SSL_KEY_PATH, SSL_CERT_PATH, FRONTEND_URL, VIRTUAL_INTERFACE_PATTERNS, PREFERRED_INTERFACE_PATTERNS, STATIC_ROUTES, TICK_MS, getLanIPv4, buildClientUrl };