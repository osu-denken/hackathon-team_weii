import { STAGE_CONFIG, RETURN_TO_TITLE_DELAY_MS, SHOOT_COOLDOWN_MS, MAX_ACTIVE_BULLETS_PER_PLAYER } from '../constants/gameConfig.js';

export class PayloadBuilder {
  static buildGameState(stage, now) {
    const stageScore = stage.getStageScore();
    const totalPlayerScore = stage.getTotalPlayerScore();
    const stageConfig = STAGE_CONFIG[stage.currentStage] || STAGE_CONFIG[1];

    if (!stage.gameStarted) {
      const countdownRemainingMs = stage.startCountdownAt
        ? Math.max(0, stage.startCountdownMs - (now - stage.startCountdownAt))
        : stage.startCountdownMs;

      return {
        stageScore,
        totalPlayerScore,
        targetScore: stageConfig.targetScore,
        timeLimitMs: stage.startCountdownMs,
        timeRemainingMs: countdownRemainingMs,
        cleared: false,
        waitingForStart: true,
        countdownRemainingMs,
        countdownStarted: stage.startCountdownAt !== null,
        playerCount: stage.players.size,
        difficulty: stage.difficulty,
        stageNumber: 1,
        showReturnNotice: false,
        returnToTitleRemainingMs: 0,
        showTitle: true,
        stage: stage.currentStage,
        stageLabel: stageConfig.label,
        serverNow: now,
      };
    }

    const timeRemainingMs = Math.max(0, stageConfig.timeLimitMs - (now - stage.gameStartAt));
    const cleared = stageScore >= stageConfig.targetScore;
    const gameOver = stage.gameOver;
    const returnToTitleRemainingMs = stage.emptySince === null
      ? 0
      : Math.max(0, RETURN_TO_TITLE_DELAY_MS - (now - stage.emptySince));
    const showReturnNotice = stage.players.size === 0 && returnToTitleRemainingMs > 0;
    const showTitle = stage.players.size === 0 && (
      stage.mode === 'title' || (stage.emptySince !== null && now - stage.emptySince >= RETURN_TO_TITLE_DELAY_MS)
    );

    return {
      stageScore,
      totalPlayerScore,
      targetScore: stageConfig.targetScore,
      timeLimitMs: stageConfig.timeLimitMs,
      timeRemainingMs,
      cleared,
      gameOver,
      difficulty: stage.difficulty,
      stageNumber: stage.getStageNumber(stageScore, stageConfig.targetScore),
      showReturnNotice,
      returnToTitleRemainingMs,
      showTitle,
      waitingForStart: false,
      countdownRemainingMs: 0,
      countdownStarted: false,
      playerCount: stage.players.size,
      stage: stage.currentStage,
      stageLabel: stageConfig.label,
      serverNow: now,
    };
  }

  static buildViewerPayload(stage, now) {
    return {
      type: 'update',
      players: PayloadBuilder.listPlayers(stage),
      enemies: PayloadBuilder.listEnemies(stage),
      bullets: PayloadBuilder.listBullets(stage),
      items: PayloadBuilder.listItems(stage),
      game: PayloadBuilder.buildGameState(stage, now),
    };
  }

  static buildPlayerState(stage, player, now) {
    const cooldownRemainingMs = Math.max(0, SHOOT_COOLDOWN_MS - (now - player.lastShotAt));
    return {
      type: 'playerState',
      player: {
        id: player.id,
        hp: player.hp,
        maxHp: player.maxHp,
        score: player.score,
        attackPower: player.attackPower,
        lastControlAt: player.lastControlAt,
        powerRemainingMs: Math.max(0, player.powerUntil - now),
        shieldRemainingMs: Math.max(0, player.shieldUntil - now),
        tripleShotRemainingMs: Math.max(0, player.tripleShotUntil - now),
        scoreDoubleRemainingMs: Math.max(0, player.scoreDoubleUntil - now),
        number: player.number,
        color: player.color,
        name: player.name,
        characterNumber: player.characterNumber,
        heldItem: player.heldItem,
        bulletsActive: stage.countBulletsByOwner(player.id),
        bulletsMax: MAX_ACTIVE_BULLETS_PER_PLAYER,
        canShoot: player.canShoot(now, SHOOT_COOLDOWN_MS),
        cooldownRemainingMs,
        dead: player.isDead(),
        respawnRemainingMs: player.deadUntil && player.deadUntil > now ? player.deadUntil - now : 0,
      },
      items: PayloadBuilder.listItems(stage),
      game: PayloadBuilder.buildGameState(stage, now),
    };
  }

  static listPlayers(stage) {
    return Array.from(stage.players.values()).map((player) => player.toPayload());
  }

  static listEnemies(stage) {
    return Array.from(stage.enemies.values()).map((enemy) => enemy.toPayload());
  }

  static listBullets(stage) {
    return Array.from(stage.bullets.values()).map((bullet) => bullet.toPayload());
  }

  static listItems(stage) {
    return Array.from(stage.itemEntities.values()).map((itemEntity) => itemEntity.toPayload());
  }

  static makeDelta(current, previous) {
    if (current === previous) return undefined;
    if (current === null || previous === null
       || typeof current !== 'object' || typeof previous !== 'object')
      return current;
    
    if (Array.isArray(current)) {
      if (!Array.isArray(previous) || current.length !== previous.length) return current;
      for (let i = 0; i < current.length; i++) {
        if (PayloadBuilder.makeDelta(current[i], previous[i]) !== undefined) {
          return current;
        }
      }
      
      return undefined;
    }

    const delta = {};
    let hasChanges = false;
    for (const key in current) {
      const d = PayloadBuilder.makeDelta(current[key], previous[key]);
      if (d !== undefined) {
        delta[key] = d;
        hasChanges = true;
      }
    }
    return hasChanges ? delta : undefined;
  }
}
