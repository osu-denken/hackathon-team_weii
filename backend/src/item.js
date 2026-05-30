let currentItem = null;
let itemCounter = 0;

const ITEM_SPEED = 0.06;

const spawn = (type, x = 0, y = 0) => {
  currentItem = {
    id: `item-${itemCounter++}`,
    type,
    x,
    y,
  };
};

const spawnRandom = (x = 0, y = 0) => {
  const type = Math.random() < 0.5 ? 'heal' : 'power';
  spawn(type, x, y);
};

const take = () => {
  if (!currentItem) {
    return null;
  }

  const item = currentItem;
  currentItem = null;
  return item;
};

const list = () => (currentItem ? [currentItem] : []);

const isEmpty = () => currentItem === null;

const update = () => {
  if (!currentItem) {
    return;
  }

  currentItem.y -= ITEM_SPEED;
  if (currentItem.y < -5) {
    currentItem = null;
  }
};

export {
  spawn,
  spawnRandom,
  take,
  list,
  isEmpty,
  update,
};
