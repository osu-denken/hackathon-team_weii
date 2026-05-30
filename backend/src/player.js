const players = new Map();
const socketToPlayerId = new Map();

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const join = (ws, id) => {
  players.set(id, { id, x: 0 });
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
  player.x += moveDelta;
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
}));

export {
  join,
  leave,
  move,
  getPlayerBySocket,
  list,
};
