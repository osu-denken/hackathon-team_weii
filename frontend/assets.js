export const spriteCache = new Map();
export const spriteColors = new Map();
export const itemSpriteCache = new Map();
export const guideSpriteCache = new Map();
export const stageBackgroundCache = new Map();
export const bulletSprite = new Image();
export const enemyBulletSprite = new Image();

export const sampleSpriteColor = (img) => {
  if (!img.naturalWidth || !img.naturalHeight) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const context = canvas.getContext('2d');
  context.drawImage(img, 0, 0);

  const sampleX = Math.min(51, img.naturalWidth - 1);
  const sampleY = Math.min(22, img.naturalHeight - 1);
  const pixel = context.getImageData(sampleX, sampleY, 1, 1).data;
  return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
};

export const loadSprites = () => {
  // These `...Paths` variables are loaded globally via <script src="/asset/scripts/sprites.js">
  if (typeof spritePaths !== 'undefined') {
    Object.entries(spritePaths).forEach(([key, src]) => {
      const img = new Image();
      img.onload = () => {
        const color = sampleSpriteColor(img);
        if (color) {
          spriteColors.set(Number(key), color);
        }
      };
      img.src = src;
      spriteCache.set(Number(key), img);
    });
  }

  if (typeof itemSpritePaths !== 'undefined') {
    Object.entries(itemSpritePaths).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      itemSpriteCache.set(key, img);
    });
  }

  if (typeof guideSpritePaths !== 'undefined') {
    Object.entries(guideSpritePaths).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      guideSpriteCache.set(key, img);
    });
  }

  if (typeof stageBackgroundPaths !== 'undefined') {
    Object.entries(stageBackgroundPaths).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      stageBackgroundCache.set(Number(key), img);
    });
  }

  if (typeof bulletSpritePath !== 'undefined') {
    bulletSprite.src = bulletSpritePath;
  }
  if (typeof enemyBulletSpritePath !== 'undefined') {
    enemyBulletSprite.src = enemyBulletSpritePath;
  }
};
