const enemies = new Map();

let enemyCounter = 0;

const ENEMY_SPEED = 0.05;
const ENEMY_SPAWN_LIMIT = 5;
const ENEMY_SPAWN_INTERVAL_MS = 1000;

const BIG_ENEMY_HP = 3;
const NORMAL_ENEMY_HP = 1;
const BIG_ENEMY_EVERY = 8;

let lastEnemySpawnAt = Date.now();

const spawn = (type) => {
  const id = `enemy-${enemyCounter++}`;
  const maxHp = type === 'big' ? BIG_ENEMY_HP : NORMAL_ENEMY_HP;
  enemies.set(id, {
    id,
    x: (Math.random() * 6) - 3,
    y: 10,
    hp: maxHp,
    maxHp,
    type,
  });
};

const maybeSpawn = (now = Date.now()) => {
  if (enemies.size < ENEMY_SPAWN_LIMIT && now - lastEnemySpawnAt >= ENEMY_SPAWN_INTERVAL_MS) {
    const type = enemyCounter % BIG_ENEMY_EVERY === 0 ? 'big' : 'normal';
    spawn(type);
    lastEnemySpawnAt = now;
  }
};

const update = () => {
  enemies.forEach((enemy, id) => {
    enemy.y -= ENEMY_SPEED;
    if (enemy.y < -5) {
      enemies.delete(id);
    }
  });
};

const list = () => Array.from(enemies.values()).map((enemy) => ({
  id: enemy.id,
  x: enemy.x,
  y: enemy.y,
  hp: enemy.hp,
  maxHp: enemy.maxHp,
  type: enemy.type,
}));

const applyDamage = (id, amount) => {
  const enemy = enemies.get(id);
  if (!enemy) {
    return { hit: false, killed: false };
  }

  enemy.hp -= amount;
  if (enemy.hp <= 0) {
    enemies.delete(id);
    return {
      hit: true,
      killed: true,
      type: enemy.type,
      x: enemy.x,
      y: enemy.y,
    };
  }

  return { hit: true, killed: false, type: enemy.type, x: enemy.x, y: enemy.y };
};

const removeById = (id) => {
  enemies.delete(id);
};

export {
  maybeSpawn,
  update,
  list,
  removeById,
  applyDamage,
};
