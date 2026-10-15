// 서버가 보낸 높이/바이옴 배열로 청크 지형 geometry를 만드는 모듈
import * as THREE from 'three';
import { CHUNK_SIZE, VERTS, BIOME_COLOR } from '/shared/config.js';

const COLORS = BIOME_COLOR.map((hex) => new THREE.Color(hex));

// 모든 청크가 같은 삼각형 구조라 인덱스 배열은 한 번만 계산
const INDEX = (() => {
  const idx = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE * 6);
  let n = 0;
  for (let j = 0; j < CHUNK_SIZE; j++) {
    for (let i = 0; i < CHUNK_SIZE; i++) {
      const a = j * VERTS + i, b = a + 1, c = a + VERTS, d = c + 1;
      idx[n++] = a; idx[n++] = c; idx[n++] = b;
      idx[n++] = b; idx[n++] = c; idx[n++] = d;
    }
  }
  return idx;
})();

// 월드 좌표 기반 해시 → 이웃 청크 경계에서도 색이 이어짐
function hash(x, z) {
  let h = (Math.imul(x, 374761393) + Math.imul(z, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export const terrainMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

export function buildChunkGeometry(cx, cz, heights, biomes) {
  const n = VERTS * VERTS;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  for (let j = 0; j < VERTS; j++) {
    for (let i = 0; i < VERTS; i++) {
      const k = j * VERTS + i;
      pos[k * 3] = i; pos[k * 3 + 1] = heights[k]; pos[k * 3 + 2] = j; // 메쉬 위치는 청크 원점 기준
      const c = COLORS[biomes[k]];
      const v = 0.92 + hash(cx * CHUNK_SIZE + i, cz * CHUNK_SIZE + j) * 0.16;
      col[k * 3] = c.r * v; col[k * 3 + 1] = c.g * v; col[k * 3 + 2] = c.b * v;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(INDEX, 1));
  g.computeVertexNormals();
  return g;
}