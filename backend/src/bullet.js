const bullets = new Map();

let bulletCounter = 0;

const BULLET_SPEED = 0.2;

const spawn = (x) => {
  const id = `bullet-${bulletCounter++}`;
  bullets.set(id, {
    id,
    x,
    y: 0,
  });
};

const update = () => {
  bullets.forEach((bullet, id) => {
    bullet.y += BULLET_SPEED;
    if (bullet.y > 6) {
      bullets.delete(id);
    }
  });
};

const list = () => Array.from(bullets.values()).map((bullet) => ({
  id: bullet.id,
  x: bullet.x,
  y: bullet.y,
}));

export {
  spawn,
  update,
  list,
};
