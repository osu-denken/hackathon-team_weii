const scriptUrl = document.currentScript ? document.currentScript.src : window.location.origin + '/asset/scripts/sprites.js';
const imagesBase = new URL('../images/', scriptUrl).href;

window.spritePaths = {
  1: imagesBase + 'character-1.png',
  2: imagesBase + 'character-2.png',
  3: imagesBase + 'character-3.png',
  4: imagesBase + 'character-4.png',
  5: imagesBase + 'character-5.png',
  6: imagesBase + 'character-6.png',
  7: imagesBase + 'character-7.png',
  8: imagesBase + 'character-8.png',
};

window.itemSpritePaths = {
  health_potion: imagesBase + 'health_potion.png',
  health_increase: imagesBase + 'heart_increase.png',
  score_up: imagesBase + 'score_up.png',
  shield: imagesBase + 'shield.png',
  triple_shot: imagesBase + 'triple_shot.png',
  empty: imagesBase + 'empty.png',
};

window.guideSpritePaths = {
  controller: imagesBase + 'guide_controller.png',
  device: imagesBase + 'guide_device.png',
  player: imagesBase + 'guide_player.png',
};
window.bulletSpritePath = imagesBase + 'bullet.png';
window.enemyBulletSpritePath = imagesBase + 'enemy_bullet.png';
window.stageBackgroundPaths = {
  2: imagesBase + 'stage-second.png',
  3: imagesBase + 'stage-final.png',
};
