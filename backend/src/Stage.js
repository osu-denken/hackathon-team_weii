import { PlayerEntity, DEFAULT_HP, BASE_ATTACK, POWER_ATTACK } from './entities/PlayerEntity.js';
import { EnemyEntity } from './entities/EnemyEntity.js';
import { BulletEntity } from './entities/BulletEntity.js';
import { Item } from './Item.js';
import { ItemEntity } from './entities/ItemEntity.js';
import { TICK_MS } from './config.js';

const dtFactor = TICK_MS / 40.0;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const X_MIN = -5;
const X_MAX = 5;

const PLAYER_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];

const SHOOT_COOLDOWN_MS = 250;
const MAX_ACTIVE_BULLETS_PER_PLAYER = 12;
const TRIPLE_SHOT_DURATION_MS = 5000;
const SHIELD_DURATION_MS = 5000;
const HEAL_AMOUNT = 2;
const SCORE_DOUBLE_DURATION_MS = 8000;
const ENEMY_BULLET_SPEED = 0.12;

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_SCORE = 100;
const TIME_LIMIT_MS = 120000;
const RETURN_TO_TITLE_DELAY_MS = 5000;

const STAGE_CONFIG = {};
try {
  for (let i = 1; i <= 3; i++) {
    const configPath = path.join(__dirname, `stages/stage${i}.json`);
    const data = fs.readFileSync(configPath, 'utf-8');
    STAGE_CONFIG[i] = JSON.parse(data);
  }
} catch (e) {
  console.error('Failed to load stage configs:', e);
}

const RESPAWN_MS = 10000;

const DIFFICULTY_SETTINGS = {
  normal: {
    label: 'Normal',
    targetScore: 100,
    timeLimitMs: 120000,
    enemySpeed: EnemyEntity.SPEED,
    enemySpawnIntervalMs: EnemyEntity.SPAWN_INTERVAL_MS,
    enemyBigEvery: EnemyEntity.BIG_EVERY,
    enemySpawnLimit: EnemyEntity.SPAWN_LIMIT,
    enemyHpMultiplier: 1,
    enemyAttack: 1,
  },
  hard: {
    label: 'Hard',
    targetScore: 120,
    timeLimitMs: 90000,
    enemySpeed: EnemyEntity.SPEED * 1.25,
    enemySpawnIntervalMs: Math.max(300, Math.floor(EnemyEntity.SPAWN_INTERVAL_MS * 0.75)),
    enemyBigEvery: Math.max(4, Math.floor(EnemyEntity.BIG_EVERY * 0.75)),
    enemySpawnLimit: Math.max(6, EnemyEntity.SPAWN_LIMIT + 1),
    enemyHpMultiplier: 1.75,
    enemyAttack: 2,
  },
};

const BULLET_HIT_RANGE = 0.5;
const PLAYER_HIT_RANGE = 0.7;
const ITEM_HIT_RANGE = 0.6;

class Stage {
  constructor() {
    this.players = new Map();
    this.enemies = new Map();
    this.bullets = new Map();
    this.itemEntity = null;

    this.enemyCounter = 0;
    this.bulletCounter = 0;
    this.itemCounter = 0;
    this.nextPlayerNumber = 1;
    this.lastEnemySpawnAt = Date.now();
    this.gameStartAt = null;
    this.gameStarted = false;
    this.startCountdownAt = null;
    this.startCountdownMs = 10000;
    this.difficulty = 'normal';
    this.emptySince = null;
    this.pausedAt = null;
    this.mode = 'title';
    this.currentStage = 1;
    this.stageCleared = false;
    this.stageScore = 0;
    this.gameOver = false;
    this.gameOverAt = null;
  }

  resetToTitle(now = Date.now()) {
    this.players.clear();
    this.enemies.clear();
    this.bullets.clear();
    this.itemEntity = null;
    this.enemyCounter = 0;
    this.bulletCounter = 0;
    this.itemCounter = 0;
    this.nextPlayerNumber = 1;
    this.gameStartAt = null;
    this.gameStarted = false;
    this.startCountdownAt = null;
    this.lastEnemySpawnAt = now;
    this.emptySince = null;
    this.pausedAt = null;
    this.mode = 'title';
    this.currentStage = 1;
    this.stageCleared = false;
    this.stageScore = 0;
    this.gameOver = false;
    this.gameOverAt = null;
  }

  addPlayer(id, now = Date.now()) {
    const existing = this.players.get(id);
    if (existing) {
      return existing;
    }

    if (this.players.size === 0) {
      if (this.mode === 'playing' && this.pausedAt !== null && this.gameStarted && this.gameStartAt !== null) {
        this.gameStartAt += now - this.pausedAt;
      } else if (this.mode === 'title') {
        this.lastEnemySpawnAt = now;
      }

      this.emptySince = null;
      this.pausedAt = null;
      this.mode = 'playing';
    }

    const number = this.nextPlayerNumber++;
    const color = PLAYER_COLORS[(number - 1) % PLAYER_COLORS.length];
    const player = new PlayerEntity({
      id,
      number,
      color,
      maxHp: DEFAULT_HP,
    });

    this.players.set(id, player);

    if (!this.gameStarted) {
      this.startCountdownAt = now;
    }

    return player;
  }

  setDifficulty(difficulty) {
    if (this.gameStarted) {
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(DIFFICULTY_SETTINGS, difficulty)) {
      return;
    }
    this.difficulty = difficulty;
  }

  removePlayer(id, now = Date.now()) {
    this.players.delete(id);
    if (this.players.size === 0) {
      this.nextPlayerNumber = 1;
      if (!this.gameStarted) {
        this.startCountdownAt = null;
      }
      this.emptySince = now;
      if (this.gameStarted) {
        this.pausedAt = now;
      }
      // ハードモードでは全員消滅で即ゲーム終了（タイトルへ戻す）
      if (this.difficulty === 'hard' && this.gameStarted) {
        this.resetToTitle(now);
      }
    }
  }

  getPlayer(id) {
    return this.players.get(id) || null;
  }

  movePlayer(id, delta, now = Date.now()) {
    const player = this.getPlayer(id);
    if (!player) {
      return;
    }
    if (player.isDead()) {
      return;
    }
    const moveDelta = clamp(Number(delta) || 0, -1, 1);
    player.move(moveDelta, X_MIN, X_MAX);
    if (moveDelta !== 0) {
      player.lastControlAt = now;
    }
  }

  resetPlayerPosition(id, now = Date.now()) {
    const player = this.getPlayer(id);
    if (!player) {
      return;
    }
    if (player.isDead()) {
      return;
    }
    player.x = 0;
    player.lastControlAt = now;
  }

  shootPlayer(id, now) {
    const player = this.getPlayer(id);
    if (!player) {
      return false;
    }
    if (player.isDead()) {
      return false;
    }
    if (!player.canShoot(now, SHOOT_COOLDOWN_MS)) {
      return false;
    }

    if (this.countBulletsByOwner(player.id) >= MAX_ACTIVE_BULLETS_PER_PLAYER) {
      return false;
    }

    if (player.hasTripleShot(now)) {
      this.spawnTripleBullets(player, player.attackPower);
    } else {
      this.spawnSingleBullet(player, player.attackPower);
    }

    player.markShot(now);
    return true;
  }

  useHeldItem(id, now) {
    const player = this.getPlayer(id);
    if (!player) {
      return;
    }
    if (player.isDead()) {
      return;
    }
    const item = player.consumeHeldItem();
    if (!item) {
      return;
    }

    if (item.type === 'score_up') {
      player.applyScoreDouble(now, SCORE_DOUBLE_DURATION_MS);
      player.lastControlAt = now;
      return;
    }

    if (item.type === 'shield') {
      player.applyShield(now, SHIELD_DURATION_MS);
      player.lastControlAt = now;
      return;
    }

    if (item.type === 'triple_shot') {
      player.applyTripleShot(now, TRIPLE_SHOT_DURATION_MS);
      player.lastControlAt = now;
      return;
    }
  }

  update(now) {
    // 全ステージクリア後にタイトルへ戻るカウントダウン中
    if (this.stageCleared && this.currentStage >= 3 && this.emptySince !== null) {
      if (now - this.emptySince >= RETURN_TO_TITLE_DELAY_MS) {
        this.resetToTitle(now);
      }
      return;
    }

    if (this.players.size === 0) {
      if (this.emptySince !== null && now - this.emptySince >= RETURN_TO_TITLE_DELAY_MS) {
        this.resetToTitle(now);
      }
      return;
    }

    if (this.gameOver) {
      if (now - this.gameOverAt >= 5000) {
        this.resetToTitle(now);
      }
      return;
    }

    this.maybeStartGame(now);
    if (!this.gameStarted) {
      return;
    }

    this.updatePlayerPowers(now);

    this.maybeSpawnEnemy(now);
    this.updateEnemies(dtFactor);

    this.maybeSpawnEnemyBullets(now);
    this.updateBullets(dtFactor);

    this.maybeSpawnItem(now);
    this.updateItem(dtFactor);
    this.handleBulletCollisions();
    this.handleEnemyBulletCollisions(now);
    this.handleEnemyTouches(now);
    this.handleItemPickup();

    // Check if stage is cleared and advance to next stage
    const stageConfig = STAGE_CONFIG[this.currentStage] || STAGE_CONFIG[1];
    
    // Check game over by time limit
    const timeRemainingMs = Math.max(0, stageConfig.timeLimitMs - (now - this.gameStartAt));
    if (timeRemainingMs <= 0 && !this.stageCleared) {
      this.gameOver = true;
      this.gameOverAt = now;
      return;
    }

    if (this.stageScore >= stageConfig.targetScore && !this.stageCleared) {
      this.stageCleared = true;
      this.nextStage(now);
    }
    this.handlePlayerDeaths(now);
  }

  maybeStartGame(now) {
    if (this.gameStarted || this.players.size === 0 || this.startCountdownAt === null) {
      return;
    }

    if (now - this.startCountdownAt >= this.startCountdownMs) {
      this.gameStarted = true;
      this.gameStartAt = now;
      this.enemies.clear();
      this.bullets.clear();
      this.itemEntity = null;
      this.enemyCounter = 0;
      this.bulletCounter = 0;
      this.itemCounter = 0;
    }
  }

  nextStage(now) {
    if (this.currentStage >= 3) {
      // 全ステージクリア: タイトルへ戻るまでのカウントダウンを開始
      this.emptySince = now;
      return;
    }
    this.currentStage += 1;
    this.stageCleared = false;
    this.enemies.clear();
    this.bullets.clear();
    this.itemEntity = null;
    this.bulletCounter = 0;
    this.itemCounter = 0;
    this.gameStartAt = now;
    this.lastEnemySpawnAt = now;
    // ステージスコアをリセット（プレイヤーの累積スコアは保持）
    this.stageScore = 0;
  }

  buildGameState(now) {
    const stageScore = this.getStageScore();
    const totalPlayerScore = this.getTotalPlayerScore();
    const stageConfig = STAGE_CONFIG[this.currentStage] || STAGE_CONFIG[1];

    if (!this.gameStarted) {
      const countdownRemainingMs = this.startCountdownAt
        ? Math.max(0, this.startCountdownMs - (now - this.startCountdownAt))
        : this.startCountdownMs;

      return {
        stageScore,
        totalPlayerScore,
        targetScore: stageConfig.targetScore,
        timeLimitMs: this.startCountdownMs,
        timeRemainingMs: countdownRemainingMs,
        cleared: false,
        waitingForStart: true,
        countdownRemainingMs,
        countdownStarted: this.startCountdownAt !== null,
        playerCount: this.players.size,
        difficulty: this.difficulty,
        stageNumber: 1,
        showReturnNotice: false,
        returnToTitleRemainingMs: 0,
        showTitle: true,
        stage: this.currentStage,
        stageLabel: stageConfig.label,
      };
    }

    const timeRemainingMs = Math.max(0, stageConfig.timeLimitMs - (now - this.gameStartAt));
    const cleared = stageScore >= stageConfig.targetScore;
    const gameOver = this.gameOver;
    const returnToTitleRemainingMs = this.emptySince === null
      ? 0
      : Math.max(0, RETURN_TO_TITLE_DELAY_MS - (now - this.emptySince));
    const showReturnNotice = this.players.size === 0 && returnToTitleRemainingMs > 0;
    const showTitle = this.players.size === 0 && (
      this.mode === 'title' || (this.emptySince !== null && now - this.emptySince >= RETURN_TO_TITLE_DELAY_MS)
    );

    return {
      stageScore,
      totalPlayerScore,
      targetScore: stageConfig.targetScore,
      timeLimitMs: stageConfig.timeLimitMs,
      timeRemainingMs,
      cleared,
      gameOver,
      difficulty: this.difficulty,
      stageNumber: this.getStageNumber(stageScore, stageConfig.targetScore),
      showReturnNotice,
      returnToTitleRemainingMs,
      showTitle,
      waitingForStart: false,
      countdownRemainingMs: 0,
      countdownStarted: false,
      playerCount: this.players.size,
      stage: this.currentStage,
      stageLabel: stageConfig.label,
    };
  }

  buildViewerPayload(now) {
    return {
      type: 'update',
      characters: this.listPlayers(),
      enemies: this.listEnemies(),
      bullets: this.listBullets(),
      items: this.listItems(),
      game: this.buildGameState(now),
    };
  }

  buildPlayerState(player, now) {
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
        number: player.number,
        color: player.color,
        heldItem: player.heldItem,
        bulletsActive: this.countBulletsByOwner(player.id),
        bulletsMax: MAX_ACTIVE_BULLETS_PER_PLAYER,
        canShoot: player.canShoot(now, SHOOT_COOLDOWN_MS),
        cooldownRemainingMs,
        dead: player.isDead(),
        respawnRemainingMs: player.deadUntil && player.deadUntil > now ? player.deadUntil - now : 0,
      },
      item: this.itemEntity ? this.itemEntity.toPayload() : null,
      game: this.buildGameState(now),
    };
  }

  listPlayers() {
    return Array.from(this.players.values()).map((player) => player.toPayload());
  }

  listPlayersRaw() {
    return Array.from(this.players.values());
  }

  listEnemies() {
    return Array.from(this.enemies.values()).map((enemy) => enemy.toPayload());
  }

  listBullets() {
    return Array.from(this.bullets.values()).map((bullet) => bullet.toPayload());
  }

  listItems() {
    return this.itemEntity ? [this.itemEntity.toPayload()] : [];
  }

  // プレイヤーの累積合計スコア（ステージをまたいで保持）
  getTotalPlayerScore() {
    return Array.from(this.players.values()).reduce((sum, player) => sum + player.score, 0);
  }

  // 現在のステージスコア（ステージ開始時にリセットされる）
  getStageScore() {
    return this.stageScore;
  }

  getStageNumber(totalScore, targetScore) {
    const stageTwoThreshold = Math.round(targetScore * 0.5);
    return totalScore >= stageTwoThreshold ? 2 : 1;
  }

  updatePlayerPowers(now) {
    this.players.forEach((player) => {
      player.updatePower(now, BASE_ATTACK);
      player.updateTimers(now);
    });
  }

  maybeSpawnEnemy(now) {
    const stageConfig = STAGE_CONFIG[this.currentStage] || STAGE_CONFIG[1];
    const difficultySettings = DIFFICULTY_SETTINGS[this.difficulty] || DIFFICULTY_SETTINGS.normal;
    
    if (this.enemies.size >= stageConfig.enemySpawnLimit) {
      return;
    }

    if (now - this.lastEnemySpawnAt < stageConfig.enemySpawnIntervalMs) {
      return;
    }

    const type = this.enemyCounter % stageConfig.enemyBigEvery === 0 ? 'big' : 'normal';
    const baseHp = type === 'big' ? EnemyEntity.BIG_HP : EnemyEntity.NORMAL_HP;
    const hp = Math.max(1, Math.round(baseHp * (difficultySettings.enemyHpMultiplier || 1)));
    const attack = difficultySettings.enemyAttack || 1;
    const canShootBullets = stageConfig.canEnemiesShoot;
    const enemy = new EnemyEntity({
      id: `enemy-${this.enemyCounter++}`,
      x: (Math.random() * 6) - 3,
      y: 10,
      type,
      hp,
      maxHp: hp,
      attack,
      canShootBullets,
    });
    this.enemies.set(enemy.id, enemy);
    this.lastEnemySpawnAt = now;
  }

  updateEnemies(dt) {
    const settings = DIFFICULTY_SETTINGS[this.difficulty] || DIFFICULTY_SETTINGS.normal;
    this.enemies.forEach((enemy, id) => {
      enemy.update(settings.enemySpeed * dt);
      if (enemy.y < -5) {
        this.enemies.delete(id);
      }
    });
  }

  maybeSpawnEnemyBullets(now) {
    const stageConfig = STAGE_CONFIG[this.currentStage] || STAGE_CONFIG[1];
    const shootCooldown = stageConfig.enemyShootCooldownMs || EnemyEntity.SHOOT_COOLDOWN_MS;
    const enemyBulletSpeed = stageConfig.enemyBulletSpeed || BulletEntity.SPEED;
    const disableBottomRow = stageConfig.enemyBottomRowShootDisabled;
    const bottomRowThreshold = 2.0;

    this.enemies.forEach((enemy) => {
      if (!enemy.canShoot(now, shootCooldown)) {
        return;
      }

      if (disableBottomRow && enemy.y <= bottomRowThreshold) {
        return;
      }

      let targetPlayer = null;
      let closestDistance = Infinity;
      this.players.forEach((player) => {
        if (player.isDead()) {
          return;
        }
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq < closestDistance) {
          closestDistance = distanceSq;
          targetPlayer = player;
        }
      });

      let vx = 0;
      let vy = -enemyBulletSpeed;
      if (targetPlayer) {
        const dx = targetPlayer.x - enemy.x;
        const dy = targetPlayer.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0.001) {
          vx = (dx / distance) * enemyBulletSpeed;
          vy = (dy / distance) * enemyBulletSpeed;
        }
      }

      const bullet = new BulletEntity({
        id: `enemy-bullet-${this.bulletCounter++}`,
        x: enemy.x,
        y: enemy.y,
        vx,
        vy,
        ownerId: null,
        ownerType: 'enemy',
        damage: enemy.attack,
      });
      this.bullets.set(bullet.id, bullet);
      enemy.markShot(now);
    });
  }

  updateBullets(dt) {
    this.bullets.forEach((bullet, id) => {
      bullet.update(dt);
      if (bullet.y > BulletEntity.MAX_Y || bullet.y < -5 || bullet.x < -BulletEntity.MAX_X || bullet.x > BulletEntity.MAX_X) {
        this.bullets.delete(id);
      }
    });
  }

  updateItem(dt) {
    if (!this.itemEntity) {
      return;
    }

    this.itemEntity.update(ItemEntity.SPEED * dt);
    if (this.itemEntity.y < -5) {
      this.itemEntity = null;
    }
  }

  handleBulletCollisions() {
    const bulletsToRemove = new Set();
    const enemiesToRemove = new Set();
    const kills = [];

    this.bullets.forEach((bullet) => {
      if (bullet.ownerType !== 'player') {
        return;
      }

      this.enemies.forEach((enemy) => {
        const dx = Math.abs(bullet.x - enemy.x);
        const dy = Math.abs(bullet.y - enemy.y);
        if (dx <= BULLET_HIT_RANGE && dy <= BULLET_HIT_RANGE) {
          bulletsToRemove.add(bullet.id);
          enemy.damage(bullet.damage);
          if (enemy.isDead()) {
            enemiesToRemove.add(enemy.id);
            kills.push({ ownerId: bullet.ownerId, enemy });
          }
        }
      });
    });

    bulletsToRemove.forEach((id) => this.bullets.delete(id));
    enemiesToRemove.forEach((id) => this.enemies.delete(id));

    kills.forEach((kill) => {
      if (kill.ownerId) {
        const player = this.players.get(kill.ownerId);
        if (player) {
          const baseScore = kill.enemy.type === 'big' ? 2 : 1;
          const multiplier = player.hasScoreDouble(Date.now()) ? 2 : 1;
          const earned = baseScore * multiplier;
          player.score += earned;       // プレイヤー累積スコア
          this.stageScore += earned;    // ステージスコア
        }
      }

      if (kill.enemy.type === 'big' && !this.itemEntity) {
        this.spawnItem(kill.enemy.x, kill.enemy.y);
      }
    });
  }

  handleEnemyBulletCollisions(now) {
    const bulletsToRemove = new Set();

    this.bullets.forEach((bullet) => {
      if (bullet.ownerType !== 'enemy') {
        return;
      }

      this.players.forEach((player) => {
        if (player.isDead()) {
          return;
        }

        const dx = Math.abs(bullet.x - player.x);
        const dy = Math.abs(bullet.y - player.y);
        if (dx <= BULLET_HIT_RANGE && dy <= BULLET_HIT_RANGE) {
          bulletsToRemove.add(bullet.id);
          if (player.hasShield(now)) {
            player.consumeShield();
          } else {
            player.damage(bullet.damage);
          }
        }
      });
    });

    bulletsToRemove.forEach((id) => this.bullets.delete(id));
  }

  handleEnemyTouches(now) {
    this.enemies.forEach((enemy, enemyId) => {
      this.players.forEach((player) => {
        const dx = Math.abs(enemy.x - player.x);
        const dy = Math.abs(enemy.y - player.y);
        if (dx <= PLAYER_HIT_RANGE && dy <= PLAYER_HIT_RANGE) {
          const attack = typeof enemy.attack === 'number' ? enemy.attack : 1;
          if (player.hasShield(now)) {
            player.consumeShield();
          } else {
            player.damage(attack);
          }
          this.enemies.delete(enemyId);
        }
      });
    });
  }

  handleItemPickup() {
    if (!this.itemEntity) {
      return;
    }

    const itemEntity = this.itemEntity;
    if (!itemEntity) {
      return;
    }

    for (const player of this.players.values()) {
      const dx = Math.abs(itemEntity.x - player.x);
      const dy = Math.abs(itemEntity.y - player.y);
      if (dx <= ITEM_HIT_RANGE && dy <= ITEM_HIT_RANGE) {
        const payload = itemEntity.toPayload();
        if (payload.type === 'health_potion') {
          player.heal(HEAL_AMOUNT);
          this.itemEntity = null;
          break;
        }

        if (player.heldItem) {
          continue;
        }

        player.setHeldItem(payload);
        this.itemEntity = null;
        break;
      }
    }
  }

  handlePlayerDeaths(now) {
    for (const player of Array.from(this.players.values())) {
      if (!player.isDead()) {
        if (player.deadUntil) {
          player.deadUntil = 0;
        }
        continue;
      }

      if (this.difficulty === 'hard') {
        this.removePlayer(player.id, now);
        continue;
      }

      if (!player.deadUntil || player.deadUntil <= 0) {
        player.deadUntil = now + RESPAWN_MS;
      } else if (now >= player.deadUntil) {
        player.hp = player.maxHp;
        player.x = 0;
        player.lastControlAt = now;
        player.deadUntil = 0;
      }
    }
  }

  spawnSingleBullet(player, damage) {
    const bullet = new BulletEntity({
      id: `bullet-${this.bulletCounter++}`,
      x: player.x,
      y: 0,
      vx: 0,
      vy: BulletEntity.SPEED,
      ownerId: player.id,
      ownerType: 'player',
      damage,
    });
    this.bullets.set(bullet.id, bullet);
  }

  spawnTripleBullets(player, damage) {
    [-BulletEntity.SPREAD, 0, BulletEntity.SPREAD].forEach((vx) => {
      const bullet = new BulletEntity({
        id: `bullet-${this.bulletCounter++}`,
        x: player.x,
        y: 0,
        vx,
        vy: BulletEntity.SPEED,
        ownerId: player.id,
        ownerType: 'player',
        damage,
      });
      this.bullets.set(bullet.id, bullet);
    });
  }

  spawnItem(x, y) {
    const item = Item.random();
    this.itemEntity = new ItemEntity({
      id: `item-${this.itemCounter++}`,
      item,
      x,
      y,
    });
  }

  countBulletsByOwner(ownerId) {
    let count = 0;
    this.bullets.forEach((bullet) => {
      if (bullet.ownerId === ownerId) {
        count += 1;
      }
    });

    return count;
  }
}

export { Stage };
