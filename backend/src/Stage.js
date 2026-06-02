import { PlayerEntity, DEFAULT_HP, BASE_ATTACK, POWER_ATTACK } from './entities/PlayerEntity.js';
import { EnemyEntity } from './entities/EnemyEntity.js';
import { BulletEntity } from './entities/BulletEntity.js';
import { Item } from './Item.js';
import { ItemEntity } from './entities/ItemEntity.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const X_MIN = -5;
const X_MAX = 5;

const PLAYER_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];

const SHOOT_COOLDOWN_MS = 250;
const MAX_ACTIVE_BULLETS_PER_PLAYER = 12;
const TRIPLE_SHOT_DURATION_MS = 5000;
const SHIELD_DURATION_MS = 5000;
const HEAL_AMOUNT = 2;
const SCORE_UP_AMOUNT = 10;

const TARGET_SCORE = 100;
const TIME_LIMIT_MS = 120000;
const RETURN_TO_TITLE_DELAY_MS = 10000;

const DIFFICULTY_SETTINGS = {
  normal: {
    label: 'Normal',
    targetScore: 100,
    timeLimitMs: 120000,
    enemySpeed: EnemyEntity.SPEED,
    enemySpawnIntervalMs: EnemyEntity.SPAWN_INTERVAL_MS,
    enemyBigEvery: EnemyEntity.BIG_EVERY,
    enemySpawnLimit: EnemyEntity.SPAWN_LIMIT,
  },
  hard: {
    label: 'Hard',
    targetScore: 120,
    timeLimitMs: 90000,
    enemySpeed: EnemyEntity.SPEED * 1.25,
    enemySpawnIntervalMs: Math.max(300, Math.floor(EnemyEntity.SPAWN_INTERVAL_MS * 0.75)),
    enemyBigEvery: Math.max(4, Math.floor(EnemyEntity.BIG_EVERY * 0.75)),
    enemySpawnLimit: Math.max(6, EnemyEntity.SPAWN_LIMIT + 1),
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
  }

  resetToTitle(now = Date.now()) {
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

    const moveDelta = clamp(Number(delta) || 0, -1, 1);
    player.move(moveDelta, X_MIN, X_MAX);
    if (moveDelta !== 0) {
      player.lastControlAt = now;
    }
  }

  shootPlayer(id, now) {
    const player = this.getPlayer(id);
    if (!player) {
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

    const item = player.consumeHeldItem();
    if (!item) {
      return;
    }

    if (item.type === 'score_up') {
      player.score += SCORE_UP_AMOUNT;
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
    if (this.players.size === 0) {
      if (this.emptySince !== null && now - this.emptySince >= RETURN_TO_TITLE_DELAY_MS) {
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
    this.updateEnemies();
    this.updateBullets();
    this.updateItem();
    this.handleBulletCollisions();
    this.handleEnemyTouches(now);
    this.handleItemPickup();
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

  buildGameState(now) {
    const totalScore = this.getTotalScore();

    if (!this.gameStarted) {
      const countdownRemainingMs = this.startCountdownAt
        ? Math.max(0, this.startCountdownMs - (now - this.startCountdownAt))
        : this.startCountdownMs;

      const settings = DIFFICULTY_SETTINGS[this.difficulty] || DIFFICULTY_SETTINGS.normal;
      return {
        totalScore,
        targetScore: settings.targetScore,
        timeLimitMs: this.startCountdownMs,
        timeRemainingMs: countdownRemainingMs,
        cleared: false,
        waitingForStart: true,
        countdownRemainingMs,
        countdownStarted: this.startCountdownAt !== null,
        playerCount: this.players.size,
        difficulty: this.difficulty,
        showReturnNotice: false,
        returnToTitleRemainingMs: 0,
        showTitle: true,
      };
    }

    const settings = DIFFICULTY_SETTINGS[this.difficulty] || DIFFICULTY_SETTINGS.normal;
    const timeRemainingMs = Math.max(0, settings.timeLimitMs - (now - this.gameStartAt));
    const cleared = totalScore >= settings.targetScore;
    const returnToTitleRemainingMs = this.emptySince === null
      ? 0
      : Math.max(0, RETURN_TO_TITLE_DELAY_MS - (now - this.emptySince));
    const showReturnNotice = this.players.size === 0 && returnToTitleRemainingMs > 0;
    const showTitle = this.players.size === 0 && (
      this.mode === 'title' || (this.emptySince !== null && now - this.emptySince >= RETURN_TO_TITLE_DELAY_MS)
    );

    return {
      totalScore,
      targetScore: settings.targetScore,
      timeLimitMs: settings.timeLimitMs,
      timeRemainingMs,
      cleared,
      difficulty: this.difficulty,
      showReturnNotice,
      returnToTitleRemainingMs,
      showTitle,
      waitingForStart: false,
      countdownRemainingMs: 0,
      countdownStarted: false,
      playerCount: this.players.size,
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

  getTotalScore() {
    return Array.from(this.players.values()).reduce((sum, player) => sum + player.score, 0);
  }

  updatePlayerPowers(now) {
    this.players.forEach((player) => {
      player.updatePower(now, BASE_ATTACK);
      player.updateTimers(now);
    });
  }

  maybeSpawnEnemy(now) {
    const settings = DIFFICULTY_SETTINGS[this.difficulty] || DIFFICULTY_SETTINGS.normal;
    if (this.enemies.size >= settings.enemySpawnLimit) {
      return;
    }

    if (now - this.lastEnemySpawnAt < settings.enemySpawnIntervalMs) {
      return;
    }

    const type = this.enemyCounter % settings.enemyBigEvery === 0 ? 'big' : 'normal';
    const hp = type === 'big' ? EnemyEntity.BIG_HP : EnemyEntity.NORMAL_HP;
    const enemy = new EnemyEntity({
      id: `enemy-${this.enemyCounter++}`,
      x: (Math.random() * 6) - 3,
      y: 10,
      type,
      hp,
      maxHp: hp,
    });
    this.enemies.set(enemy.id, enemy);
    this.lastEnemySpawnAt = now;
  }

  updateEnemies() {
    const settings = DIFFICULTY_SETTINGS[this.difficulty] || DIFFICULTY_SETTINGS.normal;
    this.enemies.forEach((enemy, id) => {
      enemy.update(settings.enemySpeed);
      if (enemy.y < -5) {
        this.enemies.delete(id);
      }
    });
  }

  updateBullets() {
    this.bullets.forEach((bullet, id) => {
      bullet.update();
      if (bullet.y > BulletEntity.MAX_Y || bullet.x < -BulletEntity.MAX_X || bullet.x > BulletEntity.MAX_X) {
        this.bullets.delete(id);
      }
    });
  }

  updateItem() {
    if (!this.itemEntity) {
      return;
    }

    this.itemEntity.update(ItemEntity.SPEED);
    if (this.itemEntity.y < -5) {
      this.itemEntity = null;
    }
  }

  handleBulletCollisions() {
    const bulletsToRemove = new Set();
    const enemiesToRemove = new Set();
    const kills = [];

    this.bullets.forEach((bullet) => {
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
          player.score += 1;
        }
      }

      if (kill.enemy.type === 'big' && !this.itemEntity) {
        this.spawnItem(kill.enemy.x, kill.enemy.y);
      }
    });
  }

  handleEnemyTouches(now) {
    this.enemies.forEach((enemy, enemyId) => {
      this.players.forEach((player) => {
        const dx = Math.abs(enemy.x - player.x);
        const dy = Math.abs(enemy.y - player.y);
        if (dx <= PLAYER_HIT_RANGE && dy <= PLAYER_HIT_RANGE) {
          if (player.hasShield(now)) {
            player.consumeShield();
          } else {
            player.damage(1);
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

  spawnSingleBullet(player, damage) {
    const bullet = new BulletEntity({
      id: `bullet-${this.bulletCounter++}`,
      x: player.x,
      y: 0,
      vx: 0,
      vy: BulletEntity.SPEED,
      ownerId: player.id,
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
