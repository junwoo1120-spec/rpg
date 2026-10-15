// 캡슐 몸 + 방향 표시 + 닉네임표를 가진 캐릭터 모델 생성/해제 (플레이어·NPC 공용)
import * as THREE from 'three';

export function lerpAngle(a, b, t) {
  const d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return a + d * t;
}

function makeNameplate(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.strokeText(text, 128, 32);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, 128, 32);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), fog: false }));
  sprite.scale.set(3, 0.75, 1);
  sprite.position.y = 2.4;
  return sprite;
}

// 그룹 원점 = 발 위치. 앞쪽 = 로컬 +Z
export function createAvatar(nickname, color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.0, 4, 12), new THREE.MeshLambertMaterial({ color }));
  body.position.y = 0.9;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.4), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  nose.position.set(0, 1.2, 0.45);
  g.add(body, nose, makeNameplate(nickname));
  return g;
}

export function disposeAvatar(g) {
  g.traverse((o) => {
    o.geometry?.dispose();
    if (o.material) { o.material.map?.dispose(); o.material.dispose(); }
  });
  g.removeFromParent();
}