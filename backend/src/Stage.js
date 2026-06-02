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
  }

  addPlayer(id, now = Date.now()) {
    const existing = this.players.get(id);
    if (existing) {
      return existing;
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

  removePlayer(id) {
    this.players.delete(id);
    if (this.players.size === 0) {
      this.nextPlayerNumber = 1;
      if (!this.gameStarted) {
        this.startCountdownAt = null;
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

      return {
        totalScore,
        targetScore: TARGET_SCORE,
        timeLimitMs: this.startCountdownMs,
        timeRemainingMs: countdownRemainingMs,
        cleared: false,
        waitingForStart: true,
        countdownRemainingMs,
        countdownStarted: this.startCountdownAt !== null,
        playerCount: this.players.size,
      };
    }

    const timeRemainingMs = Math.max(0, TIME_LIMIT_MS - (now - this.gameStartAt));
    const cleared = totalScore >= TARGET_SCORE;

    return {
      totalScore,
      targetScore: TARGET_SCORE,
      timeLimitMs: TIME_LIMIT_MS,
      timeRemainingMs,
      cleared,
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
    if (this.enemies.size >= EnemyEntity.SPAWN_LIMIT) {
      return;
    }

    if (now - this.lastEnemySpawnAt < EnemyEntity.SPAWN_INTERVAL_MS) {
      return;
    }

    const type = this.enemyCounter % EnemyEntity.BIG_EVERY === 0 ? 'big' : 'normal';
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
    this.enemies.forEach((enemy, id) => {
      enemy.update(EnemyEntity.SPEED);
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
