import { PlayerEntity, DEFAULT_HP } from './PlayerEntity.js';
import { EnemyEntity } from './EnemyEntity.js';
import { BulletEntity } from './BulletEntity.js';
import { Item } from './Item.js';
import { ItemEntity } from './ItemEntity.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const X_MIN = -5;
const X_MAX = 5;

const BASE_ATTACK = 1;
const POWER_ATTACK = 2;

const PLAYER_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];

const ENEMY_SPEED = 0.05;
const ENEMY_SPAWN_LIMIT = 5;
const ENEMY_SPAWN_INTERVAL_MS = 1000;
const BIG_ENEMY_HP = 3;
const NORMAL_ENEMY_HP = 1;
const BIG_ENEMY_EVERY = 8;

const BULLET_SPEED = 0.2;
const BULLET_SPREAD = 0.05;

const ITEM_SPEED = 0.06;

const SHOOT_COOLDOWN_MS = 250;
const MAX_ACTIVE_BULLETS_PER_PLAYER = 12;
const POWER_DURATION_MS = 5000;
const HEAL_AMOUNT = 2;

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
    this.gameStartAt = Date.now();
  }

  addPlayer(id) {
    if (this.players.has(id)) {
      return this.players.get(id);
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
    return player;
  }

  removePlayer(id) {
    this.players.delete(id);
    if (this.players.size === 0) {
      this.nextPlayerNumber = 1;
    }
  }

  getPlayer(id) {
    return this.players.get(id) || null;
  }

  movePlayer(id, delta) {
    const player = this.getPlayer(id);
    if (!player) {
      return;
    }

    const moveDelta = clamp(Number(delta) || 0, -1, 1);
    player.move(moveDelta, X_MIN, X_MAX);
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

    if (player.powerUntil > now) {
      this.spawnTripleBullets(player, POWER_ATTACK);
    } else {
      this.spawnSingleBullet(player, BASE_ATTACK);
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

    if (item.type === 'power') {
      player.applyPower(now, POWER_DURATION_MS, POWER_ATTACK);
    }
  }

  update(now) {
    this.updatePlayerPowers(now);
    this.maybeSpawnEnemy(now);
    this.updateEnemies();
    this.updateBullets();
    this.updateItem();
    this.handleBulletCollisions();
    this.handleEnemyTouches();
    this.handleItemPickup();
  }

  buildGameState(now) {
    const totalScore = this.getTotalScore();
    const timeRemainingMs = Math.max(0, TIME_LIMIT_MS - (now - this.gameStartAt));
    const cleared = totalScore >= TARGET_SCORE && timeRemainingMs > 0;

    return {
      totalScore,
      targetScore: TARGET_SCORE,
      timeLimitMs: TIME_LIMIT_MS,
      timeRemainingMs,
      cleared,
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
        powerRemainingMs: Math.max(0, player.powerUntil - now),
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
    });
  }

  maybeSpawnEnemy(now) {
    if (this.enemies.size >= ENEMY_SPAWN_LIMIT) {
      return;
    }

    if (now - this.lastEnemySpawnAt < ENEMY_SPAWN_INTERVAL_MS) {
      return;
    }

    const type = this.enemyCounter % BIG_ENEMY_EVERY === 0 ? 'big' : 'normal';
    const hp = type === 'big' ? BIG_ENEMY_HP : NORMAL_ENEMY_HP;
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
      enemy.update(ENEMY_SPEED);
      if (enemy.y < -5) {
        this.enemies.delete(id);
      }
    });
  }

  updateBullets() {
    this.bullets.forEach((bullet, id) => {
      bullet.update();
      if (bullet.y > 6 || bullet.x < -6 || bullet.x > 6) {
        this.bullets.delete(id);
      }
    });
  }

  updateItem() {
    if (!this.itemEntity) {
      return;
    }

    this.itemEntity.update(ITEM_SPEED);
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

  handleEnemyTouches() {
    this.enemies.forEach((enemy, enemyId) => {
      this.players.forEach((player) => {
        const dx = Math.abs(enemy.x - player.x);
        const dy = Math.abs(enemy.y - player.y);
        if (dx <= PLAYER_HIT_RANGE && dy <= PLAYER_HIT_RANGE) {
          player.damage(1);
          this.enemies.delete(enemyId);
        }
      });
    });
  }

  handleItemPickup() {
    if (!this.itemEntity) {
      return;
    }

    this.players.forEach((player) => {
      const dx = Math.abs(this.itemEntity.x - player.x);
      const dy = Math.abs(this.itemEntity.y - player.y);
      if (dx <= ITEM_HIT_RANGE && dy <= ITEM_HIT_RANGE) {
        const payload = this.itemEntity.toPayload();
        if (payload.type === 'heal') {
          player.heal(HEAL_AMOUNT);
        } else {
          if (player.heldItem) {
            return;
          }
          player.setHeldItem(payload);
        }
        this.itemEntity = null;
      }
    });
  }

  spawnSingleBullet(player, damage) {
    const bullet = new BulletEntity({
      id: `bullet-${this.bulletCounter++}`,
      x: player.x,
      y: 0,
      vx: 0,
      vy: BULLET_SPEED,
      ownerId: player.id,
      damage,
    });
    this.bullets.set(bullet.id, bullet);
  }

  spawnTripleBullets(player, damage) {
    [-BULLET_SPREAD, 0, BULLET_SPREAD].forEach((vx) => {
      const bullet = new BulletEntity({
        id: `bullet-${this.bulletCounter++}`,
        x: player.x,
        y: 0,
        vx,
        vy: BULLET_SPEED,
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
