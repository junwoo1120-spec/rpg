// 청크 로드/해제 관리: 주변 청크 요청, 프레임당 1개만 메쉬 생성, 먼 청크 dispose, 지형 높이/바이옴 조회
import * as THREE from 'three';
import { CHUNK_SIZE, VERTS, VIEW_RADIUS, MAX_PENDING_REQUESTS } from '/shared/config.js';
import { buildChunkGeometry, terrainMaterial } from './chunkMesh.js';

const key = (cx, cz) => `${cx},${cz}`;
const R = VIEW_RADIUS;

export function createChunkManager(scene, network) {
  const loaded = new Map();  // key → { cx, cz, mesh, heights, biomes }
  const pending = new Set(); // 요청 중이거나 메쉬 생성 대기 중인 key
  const buildQueue = [];     // 서버 응답 도착 → 메쉬 생성 대기
  let center = { cx: 0, cz: 0 };

  const dist2 = (cx, cz) => (cx - center.cx) ** 2 + (cz - center.cz) ** 2;

  async function request(cx, cz) {
    const k = key(cx, cz);
    pending.add(k);
    const res = await network.requestChunk(cx, cz);
    if (!res) { pending.delete(k); return; }
    buildQueue.push({ cx, cz, heights: new Float32Array(res.heights), biomes: new Uint8Array(res.biomes) });
  }

  function buildOne() {
    while (buildQueue.length) {
      let bi = 0, bd = Infinity;
      for (let i = 0; i < buildQueue.length; i++) {
        const d = dist2(buildQueue[i].cx, buildQueue[i].cz);
        if (d < bd) { bd = d; bi = i; }
      }
      const item = buildQueue.splice(bi, 1)[0];
      const k = key(item.cx, item.cz);
      pending.delete(k);
      if (bd > (R + 1) ** 2) continue; // 도착하는 사이 멀어졌으면 버림
      const mesh = new THREE.Mesh(buildChunkGeometry(item.cx, item.cz, item.heights, item.biomes), terrainMaterial);
      mesh.position.set(item.cx * CHUNK_SIZE, 0, item.cz * CHUNK_SIZE);
      scene.add(mesh);
      loaded.set(k, { cx: item.cx, cz: item.cz, mesh, heights: item.heights, biomes: item.biomes });
      return; // 프레임당 1개
    }
  }

  function unload(k, c) {
    scene.remove(c.mesh);
    c.mesh.geometry.dispose(); // material은 공유라 dispose 안 함
    loaded.delete(k);
  }

  function update(px, pz) {
    center = { cx: Math.floor(px / CHUNK_SIZE), cz: Math.floor(pz / CHUNK_SIZE) };

    const wanted = [];
    for (let dz = -R; dz <= R; dz++) {
      for (let dx = -R; dx <= R; dx++) {
        const d = dx * dx + dz * dz;
        if (d > R * R) continue;
        const cx = center.cx + dx, cz = center.cz + dz;
        const k = key(cx, cz);
        if (!loaded.has(k) && !pending.has(k)) wanted.push({ cx, cz, d });
      }
    }
    wanted.sort((a, b) => a.d - b.d);
    for (const w of wanted) {
      if (pending.size >= MAX_PENDING_REQUESTS) break;
      request(w.cx, w.cz);
    }

    for (const [k, c] of loaded) if (dist2(c.cx, c.cz) > (R + 1) ** 2) unload(k, c);

    buildOne();
  }

  // 월드 좌표 → 로드된 청크 안의 격자 위치 (로드 안 됐으면 null)
  function sample(x, z) {
    const cx = Math.floor(x / CHUNK_SIZE), cz = Math.floor(z / CHUNK_SIZE);
    const c = loaded.get(key(cx, cz));
    if (!c) return null;
    const lx = x - cx * CHUNK_SIZE, lz = z - cz * CHUNK_SIZE;
    const i = Math.min(Math.floor(lx), CHUNK_SIZE - 1), j = Math.min(Math.floor(lz), CHUNK_SIZE - 1);
    return { c, i, j, fx: lx - i, fz: lz - j };
  }

  // 메쉬 삼각형 분할과 동일한 방식으로 보간 → 캐릭터가 지면에 정확히 붙음
  function heightAt(x, z) {
    const s = sample(x, z);
    if (!s) return null;
    const H = s.c.heights, o = s.j * VERTS + s.i;
    const h00 = H[o], h10 = H[o + 1], h01 = H[o + VERTS], h11 = H[o + VERTS + 1];
    return s.fx + s.fz <= 1
      ? h00 + (h10 - h00) * s.fx + (h01 - h00) * s.fz
      : h11 + (h01 - h11) * (1 - s.fx) + (h10 - h11) * (1 - s.fz);
  }

  function biomeAt(x, z) {
    const s = sample(x, z);
    if (!s) return null;
    return s.c.biomes[(s.j + Math.round(s.fz)) * VERTS + s.i + Math.round(s.fx)];
  }

  return { update, heightAt, biomeAt, get loadedCount() { return loaded.size; } };
}