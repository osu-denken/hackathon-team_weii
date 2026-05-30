const players = new Map();
const socketToPlayerId = new Map();

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const X_MIN = -5;
const X_MAX = 5;

const BASE_ATTACK = 1;
const POWER_ATTACK = 2;
const MAX_HP = 5;

const join = (ws, id) => {
  players.set(id, {
    id,
    x: 0,
    hp: MAX_HP,
    maxHp: MAX_HP,
    score: 0,
    attackPower: BASE_ATTACK,
    powerUntil: 0,
    lastShotAt: 0,
  });
  socketToPlayerId.set(ws, id);
};

const leave = (ws) => {
  const id = socketToPlayerId.get(ws);
  if (!id) {
    return;
  }

  players.delete(id);
  socketToPlayerId.delete(ws);
};

const move = (ws, delta) => {
  const id = socketToPlayerId.get(ws);
  if (!id) {
    return;
  }

  const player = players.get(id);
  if (!player) {
    return;
  }

  const moveDelta = clamp(Number(delta) || 0, -1, 1);
  player.x = clamp(player.x + moveDelta, X_MIN, X_MAX);
};

const addScore = (id, value) => {
  const player = players.get(id);
  if (!player) {
    return;
  }

  player.score += value;
};

const totalScore = () => Array.from(players.values()).reduce((sum, player) => sum + player.score, 0);

const heal = (id, amount) => {
  const player = players.get(id);
  if (!player) {
    return;
  }

  player.hp = clamp(player.hp + amount, 0, player.maxHp);
};

const applyPower = (id, now, durationMs) => {
  const player = players.get(id);
  if (!player) {
    return;
  }

  player.attackPower = POWER_ATTACK;
  player.powerUntil = now + durationMs;
};

const updatePowers = (now) => {
  players.forEach((player) => {
    if (player.attackPower !== BASE_ATTACK && player.powerUntil <= now) {
      player.attackPower = BASE_ATTACK;
      player.powerUntil = 0;
    }
  });
};

const canShoot = (id, now, cooldownMs) => {
  const player = players.get(id);
  if (!player) {
    return false;
  }

  return now - player.lastShotAt >= cooldownMs;
};

const markShot = (id, now) => {
  const player = players.get(id);
  if (!player) {
    return;
  }

  player.lastShotAt = now;
};

const getPlayerBySocket = (ws) => {
  const id = socketToPlayerId.get(ws);
  if (!id) {
    return null;
  }

  return players.get(id) || null;
};

const list = () => Array.from(players.values()).map((player) => ({
  id: player.id,
  x: player.x,
  hp: player.hp,
  maxHp: player.maxHp,
  score: player.score,
}));

export {
  join,
  leave,
  move,
  getPlayerBySocket,
  list,
  addScore,
  totalScore,
  heal,
  applyPower,
  updatePowers,
  canShoot,
  markShot,
};
