// 클라이언트 진입점: 렌더러/씬 구성, 모듈 조립, 게임 루프
import * as THREE from 'three';
import { FOG_NEAR, FOG_FAR, SKY_COLOR, NET_MOVE_HZ, BIOME_NAME } from '/shared/config.js';
import { createNetwork } from './network/network.js';
import { createChunkManager } from './world/chunkManager.js';
import { createWater } from './world/water.js';
import { createInput } from './player/input.js';
import { createLocalPlayer } from './player/localPlayer.js';
import { createRemotePlayers } from './player/remotePlayers.js';

const loginEl = document.getElementById('login');
const nickEl = document.getElementById('nick');
const hudEl = document.getElementById('hud');
let started = false;

document.getElementById('start').onclick = () => start(nickEl.value);
nickEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') start(nickEl.value); });

async function start(raw) {
  if (started) return;
  started = true;
  const nickname = raw.trim().slice(0, 16) || '모험가';
  loginEl.style.display = 'none';

  const net = createNetwork();
  net.on('disconnect', () => location.reload());
  const info = await net.join(nickname);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_COLOR);
  scene.fog = new THREE.Fog(SKY_COLOR, FOG_NEAR, FOG_FAR);
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, FOG_FAR + 60);
  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x556b3a, 1.0));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(100, 200, 50);
  scene.add(sun);
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const chunks = createChunkManager(scene, net);
  const water = createWater(scene);
  const remotes = createRemotePlayers(scene, chunks);
  info.players.forEach(remotes.add);
  net.on('player:join', remotes.add);
  net.on('player:leave', remotes.remove);
  net.on('player:move', remotes.setTarget);

  const input = createInput(renderer.domElement);
  const me = createLocalPlayer({ scene, camera, chunks, input, spawn: info.spawn, nickname });
  net.on('player:correct', (p) => me.setPosition(p.x, p.z));

  const clock = new THREE.Clock();
  let sendTimer = 0, last = { x: NaN, z: NaN, ry: NaN };

  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);

    chunks.update(me.position.x, me.position.z);
    me.update(dt);
    remotes.update(dt);
    water.update(me.position.x, me.position.z);

    sendTimer += dt;
    if (sendTimer >= 1 / NET_MOVE_HZ) {
      sendTimer = 0;
      const s = me.getState();
      if (s.x !== last.x || s.z !== last.z || s.ry !== last.ry) { net.sendMove(s); last = s; }
      const b = chunks.biomeAt(s.x, s.z);
      hudEl.textContent =
        `위치 ${s.x.toFixed(0)}, ${s.z.toFixed(0)}  지형: ${b === null ? '로딩 중...' : BIOME_NAME[b]}\n` +
        `청크 ${chunks.loadedCount}개  접속자 ${remotes.count + 1}명\n` +
        `클릭: 시점 고정 / WASD: 이동`;
    }
    renderer.render(scene, camera);
  }
  loop();
}