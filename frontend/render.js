import { state, serverInfo } from './state.js';
import {
  spriteCache, spriteColors, itemSpriteCache, guideSpriteCache, 
  stageBackgroundCache, bulletSprite, enemyBulletSprite 
} from './assets.js';

export const canvas = document.getElementById('stage');
export const ctx = canvas.getContext('2d');

const IDLE_GUIDE_DELAY_MS = 3500;
const IDLE_GUIDE_FADE_MS = 700;

export const getGameScale = () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w >= 2000 && h >= 1080) return 2.0;
  if (w >= 1600 && h >= 900) return 1.5;
  if (w >= 1200 && h >= 800) return 1.2;
  return 1.0;
};

export const resize = () => {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const gameScale = getGameScale();
  
  const desiredScale = dpr * gameScale;
  const integerScale = Math.ceil(desiredScale);
  
  canvas.width = Math.floor(rect.width * (integerScale / gameScale));
  canvas.height = Math.floor(rect.height * (integerScale / gameScale));
  
  ctx.setTransform(integerScale, 0, 0, integerScale, 0, 0);
  ctx.imageSmoothingEnabled = false;
};

const toCanvasX = (x, width) => width / 2 + x * 70;
const toCanvasY = (y, height) => height - 120 - y * 42;

const drawGrid = (width, height) => {
  ctx.save();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
  ctx.lineWidth = 1;
  for (let gx = width / 2 - 320; gx <= width / 2 + 320; gx += 64) {
    ctx.globalAlpha = gx === width / 2 ? 0.75 : 0.18;
    ctx.beginPath();
    ctx.moveTo(gx, 34);
    ctx.lineTo(gx, height - 96);
    ctx.stroke();
  }
  for (let gy = height - 120; gy >= 36; gy -= 48) {
    ctx.globalAlpha = gy === height - 120 ? 0.4 : 0.14;
    ctx.beginPath();
    ctx.moveTo(36, gy);
    ctx.lineTo(width - 36, gy);
    ctx.stroke();
  }
  ctx.restore();
};

const drawItem = (item, width, height) => {
  const x = toCanvasX(item.x, width);
  const y = toCanvasY(item.y, height);
  const sprite = itemSpriteCache.get(item.type);
  if (sprite && sprite.complete) {
    const size = 36;
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.35)';
    ctx.shadowBlur = 16;
    ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
    ctx.restore();
    return;
  }
  ctx.save();
  if (item.type === 'health_potion') {
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x - 10, y - 10, 20, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 3, y - 8, 6, 16);
    ctx.fillRect(x - 8, y - 3, 16, 6);
  } else if (item.type === 'health_increase') {
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(x - 4, y - 2, 6, Math.PI, 0);
    ctx.arc(x + 4, y - 2, 6, Math.PI, 0);
    ctx.lineTo(x, y + 10);
    ctx.fill();
  } else if (item.type === 'score_up') {
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.type === 'shield') {
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#8b5cf6';
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 6);
    ctx.lineTo(x + 4, y + 6);
    ctx.lineTo(x - 2, y - 6);
    ctx.lineTo(x + 10, y - 6);
    ctx.lineTo(x - 4, y + 6);
    ctx.lineTo(x + 2, y + 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
};

const drawEnemy = (enemy, width, height) => {
  const x = toCanvasX(enemy.x, width);
  const y = toCanvasY(enemy.y, height);
  const isBig = enemy.type === 'big';
  const radius = isBig ? 24 : 16;
  const color = isBig ? '#f43f5e' : '#ef4444';
  const border = isBig ? '#fbbf24' : '#ffffff';

  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  const points = isBig ? 6 : 4;
  for (let i = 0; i < points; i++) {
    const angle = (Math.PI * 2 * i) / points - Math.PI / 4;
    const offset = radius + (i % 2 === 0 ? 6 : 0);
    const px = x + Math.cos(angle) * offset;
    const py = y + Math.sin(angle) * offset;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const angle = (Math.PI * 2 * i) / points - Math.PI / 4;
    const offset = radius + (i % 2 === 0 ? 6 : 0);
    const px = x + Math.cos(angle) * offset;
    const py = y + Math.sin(angle) * offset;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  const hp = enemy.hp ?? 0;
  const maxHp = enemy.maxHp ?? 1;
  const hpRatio = Math.max(0, Math.min(1, hp / maxHp));
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x - 24, y - radius - 18, 48, 8);
  ctx.fillStyle = '#fb7185';
  ctx.fillRect(x - 24, y - radius - 18, 48 * hpRatio, 8);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 24, y - radius - 18, 48, 8);
};

const drawPlayer = (player, index, width, height) => {
  const isDead = player.dead ?? false;
  if (isDead) {
    const respawnRemainingMs = player.deadUntil && player.deadUntil > Date.now() ? player.deadUntil - Date.now() : 0;
    if (respawnRemainingMs > 3000) {
      return;
    }
    if (Math.floor(Date.now() / 100) % 2 === 0) {
      return;
    }
  }

  const x = toCanvasX(player.x, width);
  const y = height - 130;
  const fallbackColor = player.color || ['#22d3ee', '#fbbf24'][index] || '#38bdf8';
  const hp = player.hp ?? 0;
  const maxHp = player.maxHp ?? 1;
  const hpRatio = Math.max(0, Math.min(1, hp / maxHp));
  const number = player.number ?? index + 1;
  const charNum = player.characterNumber || number;
  const sprite = spriteCache.get(charNum);
  const sampledColor = spriteColors.get(charNum);
  const color = sampledColor || fallbackColor;
  const spriteSize = 70;
  const lastControlAt = player.lastControlAt ?? 0;
  const idleMs = Date.now() - lastControlAt;
  const guideVisible = !isDead && idleMs >= IDLE_GUIDE_DELAY_MS;

  const shieldUntil = player.shieldUntil ?? 0;
  const hasShield = shieldUntil > Date.now();
  const shieldPulse = hasShield ? (Math.sin(Date.now() / 150) * 0.5 + 0.5) : 0;

  if (sprite && sprite.complete) {
    ctx.save();
    if (hasShield) {
      ctx.shadowColor = `rgba(56, 189, 248, ${0.6 + shieldPulse * 0.4})`;
      ctx.shadowBlur = 28 + shieldPulse * 14;
    } else {
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
    }
    ctx.drawImage(sprite, x - spriteSize / 2, y - spriteSize / 2, spriteSize, spriteSize);
    ctx.restore();
  } else {
    ctx.save();
    ctx.shadowColor = hasShield ? '#38bdf8' : color;
    ctx.shadowBlur = hasShield ? 28 + shieldPulse * 14 : 20;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (hasShield) {
    ctx.save();
    const shieldRadius = spriteSize / 2 + 10 + shieldPulse * 4;
    const shieldAlpha = 0.25 + shieldPulse * 0.2;
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.7 + shieldPulse * 0.3})`;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 6;
      const px = x + Math.cos(angle) * shieldRadius;
      const py = y + Math.sin(angle) * shieldRadius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = `rgba(56, 189, 248, ${shieldAlpha * 0.3})`;
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  const displayName = player.name || `P${number}`;
  ctx.fillText(displayName, x, y + 52);

  const barWidth = 60;
  const barHeight = 10;
  const barY = y - 52;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x - barWidth / 2, barY, barWidth, barHeight);
  ctx.fillStyle = '#34d399';
  ctx.fillRect(x - barWidth / 2, barY, barWidth * hpRatio, barHeight);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - barWidth / 2, barY, barWidth, barHeight);

  ctx.imageSmoothingEnabled = false;

  if (guideVisible) {
    const guideFade = Math.min(1, (idleMs - IDLE_GUIDE_DELAY_MS) / IDLE_GUIDE_FADE_MS);
    const guideAlpha = Math.max(0, Math.min(1, guideFade));
    const bob = Math.sin(Date.now() / 240 + index) * 5;
    const guideBaseY = barY - 34 + bob;
    const phone = guideSpriteCache.get('phone');
    const arrow = guideSpriteCache.get('arrow');
    const phoneWidth = 64;
    const phoneHeight = 64;
    const arrowWidth = 24;
    const arrowHeight = 24;

    ctx.save();
    ctx.globalAlpha = guideAlpha;

    let rotate = Math.sin(Date.now() / 260 + index) * 0.12;

    if (arrow && arrow.complete) {
      ctx.save();
      ctx.translate(x - 32, guideBaseY);
      ctx.scale(-1, 1);
      ctx.rotate(rotate);
      ctx.drawImage(arrow, -arrowWidth / 2, -arrowHeight / 2, arrowWidth, arrowHeight);
      ctx.restore();

      ctx.save();
      ctx.translate(x + 32, guideBaseY);
      ctx.scale(1, -1);
      ctx.rotate(rotate);
      ctx.drawImage(arrow, -arrowWidth / 2, -arrowHeight / 2, arrowWidth, arrowHeight);
      ctx.restore();
    }

    if (phone && phone.complete) {
      ctx.save();
      ctx.translate(x, guideBaseY + 2);
      ctx.rotate(rotate);
      ctx.drawImage(phone, -phoneWidth / 2, -phoneHeight / 2, phoneWidth, phoneHeight);
      ctx.restore();
    }

    ctx.fillStyle = '#d9f4ff';
    ctx.font = '700 16px sans-serif';
    ctx.fillText('スマホをかたむけてね！', x, guideBaseY - 28);
    ctx.restore();
  }
};

const stars = Array.from({ length: 120 }).map(() => ({
  x: Math.random(),
  y: Math.random(),
  size: Math.random() * 1.5 + 0.5,
  speed: Math.random() * 0.0015 + 0.0005,
  brightness: Math.random(),
  glow: Math.random() > 0.85
}));

const drawStars = (width, height) => {
  ctx.save();
  stars.forEach((star) => {
    star.y += star.speed;
    if (star.y > 1.0) {
      star.y = 0;
      star.x = Math.random();
    }

    star.brightness += (Math.random() - 0.5) * 0.08;
    star.brightness = Math.max(0.2, Math.min(1.0, star.brightness));

    if (star.glow) {
      ctx.shadowColor = '#bae6fd';
      ctx.shadowBlur = 8;
      ctx.fillStyle = `rgba(224, 242, 254, ${star.brightness})`;
    } else {
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(186, 230, 253, ${star.brightness * 0.6})`;
    }

    ctx.beginPath();
    ctx.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
};

export const draw = () => {
  const rect = canvas.getBoundingClientRect();
  const gameScale = getGameScale();
  const width = rect.width / gameScale;
  const height = rect.height / gameScale;

  const currentStage = state.game.stage || 1;
  const stageBackground = stageBackgroundCache.get(currentStage);
  if (stageBackground && stageBackground.complete && stageBackground.naturalWidth > 0) {
    ctx.drawImage(stageBackground, 0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#040916';
    ctx.fillRect(0, 0, width, height);
  }

  drawStars(width, height);

  drawGrid(width, height);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(40, height - 90, width - 80, 6);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(40, height - 96, width - 80, 2);

  const getRenderCoords = (entity) => {
    if (entity.isPredictable) {
      if (!entity._calc && entity.fx && entity.fy) {
        try {
          entity._calc = new Function('t', 'startX', 'startY', 'vx', 'vy',
            `return { x: ${entity.fx}, y: ${entity.fy} };`
          );
        } catch (e) {
          console.error("Failed to compile entity formula:", e);
          entity._calc = () => ({ x: entity.x, y: entity.y });
        }
      }

      if (entity._calc) {
        const estimatedServerNow = Date.now() - serverInfo.serverTimeOffset;
        const elapsedDt = (estimatedServerNow - entity.createdAt) / 40.0;
        return entity._calc(elapsedDt, entity.startX, entity.startY, entity.vx || 0, entity.vy || 0);
      }
    }
    return { x: entity.x, y: entity.y };
  };

  state.items.forEach((item) => {
    const coords = getRenderCoords(item);
    drawItem({ ...item, ...coords }, width, height);
  });
  state.enemies.forEach((enemy) => {
    const coords = getRenderCoords(enemy);
    drawEnemy({ ...enemy, ...coords }, width, height);
  });
  state.bullets.forEach((bullet) => {
    const coords = getRenderCoords(bullet);
    const x = toCanvasX(coords.x, width);
    const y = toCanvasY(coords.y, height);
    ctx.save();
    const isEnemyBullet = bullet.ownerType === 'enemy';
    if (isEnemyBullet && enemyBulletSprite.complete && enemyBulletSprite.naturalWidth > 0) {
      const drawWidth = 16;
      const drawHeight = 24;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, -1);
      ctx.drawImage(enemyBulletSprite, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();
    } else if (!isEnemyBullet && bulletSprite.complete && bulletSprite.naturalWidth > 0) {
      const drawWidth = 16;
      const drawHeight = 24;
      ctx.drawImage(bulletSprite, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
    } else {
      ctx.fillStyle = isEnemyBullet ? '#ef4444' : '#38bdf8';
      ctx.fillRect(x - 5, y - 8, 10, 16);
    }
    ctx.restore();
  });

  state.players.forEach((player, index) => drawPlayer(player, index, width, height));

  requestAnimationFrame(draw);
};
