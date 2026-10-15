// 키보드(WASD)와 마우스 시점 입력 (채팅 등 UI가 열리면 state.enabled = false 로 막음)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function createInput(canvas) {
  const keys = new Set();
  const state = { yaw: 0, pitch: 0.4, enabled: true };

  addEventListener('keydown', (e) => { if (state.enabled) keys.add(e.code); });
  addEventListener('keyup', (e) => keys.delete(e.code));
  canvas.addEventListener('click', () => canvas.requestPointerLock());
  addEventListener('mousemove', (e) => {
    if (!state.enabled || document.pointerLockElement !== canvas) return;
    state.yaw -= e.movementX * 0.0025;
    state.pitch = clamp(state.pitch + e.movementY * 0.0025, -0.2, 1.3);
  });

  // 카메라 기준 이동 방향 (정규화된 x,z)
  function moveDir() {
    const f = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
    const r = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    if (!f && !r) return { x: 0, z: 0 };
    const sy = Math.sin(state.yaw), cy = Math.cos(state.yaw);
    const x = -sy * f + cy * r, z = -cy * f - sy * r;
    const len = Math.hypot(x, z);
    return { x: x / len, z: z / len };
  }

  return { state, moveDir };
}