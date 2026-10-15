// 해수면 평면 하나가 플레이어를 따라다니며 물을 표현하는 모듈
import * as THREE from 'three';
import { SEA_LEVEL } from '/shared/config.js';

export function createWater(scene) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000),
    new THREE.MeshLambertMaterial({ color: 0x3a7bd5, transparent: true, opacity: 0.72 })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = SEA_LEVEL - 0.05;
  scene.add(mesh);
  return { update(x, z) { mesh.position.x = x; mesh.position.z = z; } };
}