const bullets = new Map();

let bulletCounter = 0;

const BULLET_SPEED = 0.2;
const BULLET_SPREAD = 0.05;

const createBullet = (x, ownerId, damage, vx) => {
  const id = `bullet-${bulletCounter++}`;
  bullets.set(id, {
    id,
    x,
    y: 0,
    vx,
    vy: BULLET_SPEED,
    ownerId,
    damage,
  });
};

const spawnTriple = (x, ownerId, damage = 1) => {
  createBullet(x, ownerId, damage, -BULLET_SPREAD);
  createBullet(x, ownerId, damage, 0);
  createBullet(x, ownerId, damage, BULLET_SPREAD);
};

const update = () => {
  bullets.forEach((bullet, id) => {
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    if (bullet.y > 6 || bullet.x < -6 || bullet.x > 6) {
      bullets.delete(id);
    }
  });
};

const list = () => Array.from(bullets.values()).map((bullet) => ({
  id: bullet.id,
  x: bullet.x,
  y: bullet.y,
}));

const getAll = () => Array.from(bullets.values());

const countByOwner = (ownerId) => {
  let count = 0;
  bullets.forEach((bullet) => {
    if (bullet.ownerId === ownerId) {
      count += 1;
    }
  });

  return count;
};

const removeById = (id) => {
  bullets.delete(id);
};

export {
  spawnTriple,
  update,
  list,
  getAll,
  countByOwner,
  removeById,
};
