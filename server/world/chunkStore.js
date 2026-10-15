// 생성된 청크를 LRU 캐시에 보관하고 전송용 바이너리 페이로드로 돌려주는 모듈
import { generateChunk } from './terrain.js';

const MAX_CACHED = 1500;
const cache = new Map();

export function getChunkPayload(cx, cz) {
  const key = `${cx},${cz}`;
  let payload = cache.get(key);
  if (payload) {
    cache.delete(key);
    cache.set(key, payload); // 최근 사용 순서로 갱신
    return payload;
  }
  const { heights, biomes } = generateChunk(cx, cz);
  payload = { cx, cz, heights: Buffer.from(heights.buffer), biomes: Buffer.from(biomes.buffer) };
  cache.set(key, payload);
  if (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value);
  return payload;
}