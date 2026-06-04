export const MAX_PLAYERS = 4;

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
