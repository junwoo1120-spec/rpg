// 다른 플레이어들을 생성/제거하고 서버 위치를 부드럽게 따라가며 표시
import * as THREE from 'three';
import { createAvatar, disposeAvatar, lerpAngle } from './avatar.js';

export function createRemotePlayers(scene, chunks) {
  const map = new Map(); // id → { avatar, target }

  function add(info) {
    if (map.has(info.id)) return;
    let hue = 0;
    for (const ch of info.id) hue = (hue + ch.charCodeAt(0) * 37) % 360;
    const avatar = createAvatar(info.nick, new THREE.Color().setHSL(hue / 360, 0.6, 0.5));
    avatar.position.set(info.x, info.y, info.z);
    scene.add(avatar);
    map.set(info.id, { avatar, target: { x: info.x, y: info.y, z: info.z, ry: info.ry } });
  }

  function remove(id) {
    const r = map.get(id);
    if (!r) return;
    disposeAvatar(r.avatar);
    map.delete(id);
  }

  function setTarget(info) {
    const r = map.get(info.id);
    if (r) r.target = { x: info.x, y: info.y, z: info.z, ry: info.ry };
  }

  function update(dt) {
    const k = 1 - Math.exp(-12 * dt);
    for (const { avatar, target } of map.values()) {
      avatar.position.x += (target.x - avatar.position.x) * k;
      avatar.position.z += (target.z - avatar.position.z) * k;
      avatar.position.y = chunks.heightAt(avatar.position.x, avatar.position.z) ?? target.y;
      avatar.rotation.y = lerpAngle(avatar.rotation.y, target.ry, k);
    }
  }

  return { add, remove, setTarget, update, get count() { return map.size; } };
}