// Socket.io 이벤트 처리: 접속, 청크 요청, 이동 검증(서버 권위), 플레이어 동기화
import { getChunkPayload } from '../world/chunkStore.js';
import { getHeight, getBiome } from '../world/terrain.js';
import { PLAYER_SPEED, SEA_LEVEL, BIOME, WORLD_RADIUS_CHUNKS, CHUNK_SIZE } from '../../shared/config.js';

const players = new Map(); // socket.id → { id, nick, x, y, z, ry, lastT }  (나중에 level/exp/job/stats 추가)
const WORLD_LIMIT = WORLD_RADIUS_CHUNKS * CHUNK_SIZE;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const publicInfo = (p) => ({ id: p.id, nick: p.nick, x: p.x, y: p.y, z: p.z, ry: p.ry });

function sanitizeNick(raw) {
  const s = String(raw ?? '').replace(/[<>]/g, '').trim().slice(0, 16);
  return s || '모험가';
}

function findSpawn() {
  for (let r = 0; r < 4000; r += 16) {
    const steps = Math.max(1, Math.floor(r / 8));
    for (let k = 0; k < steps; k++) {
      const a = (k / steps) * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const h = getHeight(x, z);
      if (h > SEA_LEVEL + 1 && h < 20) {
        const b = getBiome(x, z, h);
        if (b === BIOME.GRASS || b === BIOME.FOREST) return { x, y: h, z };
      }
    }
  }
  return { x: 0, y: getHeight(0, 0), z: 0 };
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    let reqCount = 0, windowStart = Date.now();

    socket.on('join', (data, ack) => {
      if (typeof ack !== 'function' || players.has(socket.id)) return;
      const s = findSpawn();
      const p = { id: socket.id, nick: sanitizeNick(data?.nickname), x: s.x, y: s.y, z: s.z, ry: 0, lastT: Date.now() };
      const others = [...players.values()].map(publicInfo);
      players.set(socket.id, p);
      ack({ id: p.id, spawn: { x: p.x, y: p.y, z: p.z }, players: others });
      socket.broadcast.emit('player:join', publicInfo(p));
    });

    socket.on('chunk:get', (req, ack) => {
      if (typeof ack !== 'function') return;
      const now = Date.now();
      if (now - windowStart > 1000) { windowStart = now; reqCount = 0; }
      const ok = players.has(socket.id) && ++reqCount <= 300 &&
        Number.isInteger(req?.cx) && Number.isInteger(req?.cz) &&
        Math.abs(req.cx) <= WORLD_RADIUS_CHUNKS && Math.abs(req.cz) <= WORLD_RADIUS_CHUNKS;
      ack(ok ? getChunkPayload(req.cx, req.cz) : null);
    });

    socket.on('player:move', (m) => {
      const p = players.get(socket.id);
      if (!p || !isNum(m?.x) || !isNum(m?.z) || !isNum(m?.ry)) return;
      const now = Date.now();
      const dt = Math.min((now - p.lastT) / 1000, 1);
      p.lastT = now;
      const dist = Math.hypot(m.x - p.x, m.z - p.z);
      const maxDist = PLAYER_SPEED * 1.25 * Math.max(dt, 0.05) + 1;
      const h = getHeight(m.x, m.z);
      if (dist > maxDist || Math.abs(m.x) > WORLD_LIMIT || Math.abs(m.z) > WORLD_LIMIT || h < SEA_LEVEL - 1) {
        socket.emit('player:correct', { x: p.x, z: p.z }); // 속도/물/범위 위반 → 되돌림
        return;
      }
      p.x = m.x; p.z = m.z; p.y = h; p.ry = m.ry;
      socket.broadcast.emit('player:move', publicInfo(p));
    });

    socket.on('disconnect', () => {
      if (players.delete(socket.id)) socket.broadcast.emit('player:leave', socket.id);
    });
  });
}