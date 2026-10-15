// 노이즈로 높이/바이옴을 계산하고 청크 한 장의 데이터를 생성하는 모듈
import { createNoise2D } from './noise.js';
import { CHUNK_SIZE, VERTS, SEA_LEVEL, BIOME } from '../../shared/config.js';

const SEED = Number(process.env.WORLD_SEED) || 20261015;
const nElev = createNoise2D(SEED);
const nMount = createNoise2D(SEED + 1);
const nDetail = createNoise2D(SEED + 2);
const nTemp = createNoise2D(SEED + 3);
const nWet = createNoise2D(SEED + 4);

function fbm(noise, x, z, octaves) {
  let sum = 0, amp = 1, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise(x * freq, z * freq) * amp;
    norm += amp; amp *= 0.5; freq *= 2;
  }
  return sum / norm;
}
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function getHeight(x, z) {
  const base = fbm(nElev, x * 0.0025, z * 0.0025, 4);                  // 큰 대륙/바다 형태
  const mount = smoothstep(0.05, 0.45, fbm(nMount, x * 0.002 + 100, z * 0.002, 3)); // 산악 마스크
  const detail = fbm(nDetail, x * 0.03, z * 0.03, 2);                  // 잔잔한 굴곡
  return base * 20 + 5 + mount * 45 + detail * 1.5;
}

export function getBiome(x, z, h) {
  if (h < SEA_LEVEL) return BIOME.WATER;
  if (h > 32) return BIOME.MOUNTAIN;
  const temp = fbm(nTemp, x * 0.0015, z * 0.0015, 2);
  const wet = fbm(nWet, x * 0.0015 + 50, z * 0.0015, 2);
  if (temp < -0.25) return BIOME.SNOW;
  if (temp > 0.2 && wet < 0.05) return BIOME.DESERT;
  if (wet > 0.1) return BIOME.FOREST;
  return BIOME.GRASS;
}

// 인덱스 = j * VERTS + i (i: x방향, j: z방향). 이웃 청크와 경계 버텍스를 공유
export function generateChunk(cx, cz) {
  const heights = new Float32Array(VERTS * VERTS);
  const biomes = new Uint8Array(VERTS * VERTS);
  for (let j = 0; j < VERTS; j++) {
    for (let i = 0; i < VERTS; i++) {
      const wx = cx * CHUNK_SIZE + i, wz = cz * CHUNK_SIZE + j;
      const h = getHeight(wx, wz);
      heights[j * VERTS + i] = h;
      biomes[j * VERTS + i] = getBiome(wx, wz, h);
    }
  }
  return { heights, biomes };
}