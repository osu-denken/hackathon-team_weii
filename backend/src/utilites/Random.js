/**
 * シード付き乱数 (mulberry32)。同じシードなら毎回同じ数列になる。
 * @param {number} seed 整数
 * @returns {() => number} 0 以上 1 未満の乱数を返す関数
 */
export const createSeededRandom = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * 文字列や数値のシード指定を整数にする。未指定や不正な値なら null (通常のランダム)。
 */
export const parseSeed = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : null;
};
