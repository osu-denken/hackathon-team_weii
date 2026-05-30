const enemies = new Map();

let enemyCounter = 0;

const ENEMY_SPEED = 0.05;
const ENEMY_SPAWN_LIMIT = 5;
const ENEMY_SPAWN_INTERVAL_MS = 1000;

let lastEnemySpawnAt = Date.now();

const spawn = () => {
  const id = `enemy-${enemyCounter++}`;
  enemies.set(id, {
    id,
    x: (Math.random() * 6) - 3,
    y: 5,
  });
};

const maybeSpawn = (now = Date.now()) => {
  if (enemies.size < ENEMY_SPAWN_LIMIT && now - lastEnemySpawnAt >= ENEMY_SPAWN_INTERVAL_MS) {
    spawn();
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
}));

const removeById = (id) => {
  enemies.delete(id);
};

export {
  maybeSpawn,
  update,
  list,
  removeById,
};
