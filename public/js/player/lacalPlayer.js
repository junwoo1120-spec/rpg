// 내 캐릭터: 입력 → 이동(물/미로딩 지형 차단, 바이옴 속도) → 지면 밀착 → 3인칭 카메라
import * as THREE from 'three';
import { PLAYER_SPEED, SEA_LEVEL, BIOME_SPEED } from '/shared/config.js';
import { createAvatar, lerpAngle } from './avatar.js';

const CAMERA_DISTANCE = 9;

export function createLocalPlayer({ scene, camera, chunks, input, spawn, nickname }) {
  const avatar = createAvatar(nickname, 0x3b82f6);
  scene.add(avatar);
  const pos = new THREE.Vector3(spawn.x, spawn.y, spawn.z);
  let facing = 0;

  const canStand = (x, z) => {
    const h = chunks.heightAt(x, z);
    return h !== null && h > SEA_LEVEL + 0.15; // 미로딩 지형/물은 못 감
  };

  function tryMove(dx, dz) {
    if (canStand(pos.x + dx, pos.z + dz)) { pos.x += dx; pos.z += dz; }
    else if (canStand(pos.x + dx, pos.z)) pos.x += dx;
    else if (canStand(pos.x, pos.z + dz)) pos.z += dz;
  }

  function updateCamera() {
    const { yaw, pitch } = input.state;
    const target = new THREE.Vector3(pos.x, pos.y + 1.6, pos.z);
    const cp = Math.cos(pitch);
    const cam = new THREE.Vector3(
      target.x + Math.sin(yaw) * cp * CAMERA_DISTANCE,
      target.y + Math.sin(pitch) * CAMERA_DISTANCE,
      target.z + Math.cos(yaw) * cp * CAMERA_DISTANCE
    );
    const gh = chunks.heightAt(cam.x, cam.z);
    if (gh !== null) cam.y = Math.max(cam.y, gh + 1); // 카메라가 땅속으로 안 들어가게
    camera.position.copy(cam);
    camera.lookAt(target);
  }

  function update(dt) {
    const dir = input.moveDir();
    if (dir.x || dir.z) {
      const biome = chunks.biomeAt(pos.x, pos.z);
      const step = PLAYER_SPEED * (BIOME_SPEED[biome] ?? 1) * dt;
      tryMove(dir.x * step, dir.z * step);
      facing = Math.atan2(dir.x, dir.z);
    }
    const h = chunks.heightAt(pos.x, pos.z);
    if (h !== null) pos.y = h;
    avatar.position.copy(pos);
    avatar.rotation.y = lerpAngle(avatar.rotation.y, facing, 1 - Math.exp(-15 * dt));
    updateCamera();
  }

  return {
    position: pos,
    update,
    setPosition(x, z) { pos.x = x; pos.z = z; },   // 서버 보정용
    getState: () => ({ x: pos.x, z: pos.z, ry: facing }),
  };
}
