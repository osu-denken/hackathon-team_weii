// 同時に参加できる人数。URL の ?maxPlayers=N で変更できる (-1 で無制限、既定は 4)
export const DEFAULT_MAX_PLAYERS = 4;

export const parseMaxPlayers = (value) => {
  if (value === null || value === undefined || value === '') return DEFAULT_MAX_PLAYERS;
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_MAX_PLAYERS;
  if (n < 0) return Infinity;
  return Math.max(1, Math.floor(n));
};

export const MAX_PLAYERS = parseMaxPlayers(new URLSearchParams(window.location.search).get('maxPlayers'));

export const state = {
  players: [],
  enemies: [],
  bullets: [],
  items: [],
  game: {
    stageScore: 0,
    totalPlayerScore: 0,
    targetScore: 100,
    timeLimitMs: 0,
    timeRemainingMs: 0,
    cleared: false,
    gameOver: false,
    showReturnNotice: false,
    returnToTitleRemainingMs: 0,
    showTitle: true,
    waitingForStart: true,
    countdownRemainingMs: 10000,
    countdownStarted: false,
    playerCount: 0,
    difficulty: 'normal',
    stage: 1,
    stageLabel: 'Stage 1',
  },
};

export const serverInfo = {
  serverTimeOffset: 0
};

// 乱数のシード。URL の ?seed=整数 を付けると、敵の出現位置とアイテムの出方が毎回同じになる
export const SEED = (() => {
  const raw = new URLSearchParams(window.location.search).get('seed');
  if (raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : null;
})();
