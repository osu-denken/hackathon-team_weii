// This is a browser-friendly mock of backend/src/constants/gameConfig.js
// It removes the 'fs' dependency and imports the JSON files directly via Vite.

import { EnemyEntity } from '../../../backend/src/entities/EnemyEntity.js';

// Import JSON files directly (Vite handles this automatically)
import stage1 from '../../../backend/src/stages/stage1.json';
import stage2 from '../../../backend/src/stages/stage2.json';
import stage3 from '../../../backend/src/stages/stage3.json';

export const X_MIN = -6;
export const X_MAX = 6;

export const PLAYER_COLORS = ['#3D8FCD', '#E25252', '#40AD1D', '#C38F24', '#C846D6', '#47D8B2', '#2549BA'];

export const SHOOT_COOLDOWN_MS = 250;
export const MAX_ACTIVE_BULLETS_PER_PLAYER = 12;
export const TRIPLE_SHOT_DURATION_MS = 5000;
export const SHIELD_DURATION_MS = 5000;
export const HEAL_AMOUNT = 2;
export const SCORE_DOUBLE_DURATION_MS = 8000;
export const ENEMY_BULLET_SPEED = 0.12;

export const TARGET_SCORE = 100;
export const TIME_LIMIT_MS = 120000;
export const RETURN_TO_TITLE_DELAY_MS = 5000;
export const RESPAWN_MS = 10000;
export const ITEM_SPAWN_LIMIT = 5;

export const BULLET_HIT_RANGE = 0.5;
export const PLAYER_HIT_RANGE = 0.7;
export const ITEM_HIT_RANGE = 0.6;

export const STAGE_CONFIG = {
  1: stage1,
  2: stage2,
  3: stage3
};

export const DIFFICULTY_SETTINGS = {
  normal: {
    label: 'Normal',
    targetScore: 100,
    timeLimitMs: 120000,
    enemySpeed: EnemyEntity.SPEED,
    enemySpawnIntervalMs: EnemyEntity.SPAWN_INTERVAL_MS,
    enemyBigEvery: EnemyEntity.BIG_EVERY,
    enemySpawnLimit: EnemyEntity.SPAWN_LIMIT,
    enemyHpMultiplier: 1,
    enemyAttack: 1,
  },
  hard: {
    label: 'Hard',
    targetScore: 120,
    timeLimitMs: 90000,
    enemySpeed: EnemyEntity.SPEED * 1.25,
    enemySpawnIntervalMs: Math.max(300, Math.floor(EnemyEntity.SPAWN_INTERVAL_MS * 0.75)),
    enemyBigEvery: Math.max(4, Math.floor(EnemyEntity.BIG_EVERY * 0.75)),
    enemySpawnLimit: Math.max(6, EnemyEntity.SPAWN_LIMIT + 1),
    enemyHpMultiplier: 1.75,
    enemyAttack: 2,
  },
};
