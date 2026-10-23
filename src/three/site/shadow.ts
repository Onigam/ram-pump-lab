import * as THREE from 'three';
import { clamp } from '@onigam/lab-kit/three';
import type { SkyRig } from './sky';
import type { Terrain } from './terrain';

// The sun's shadow map follows what the camera looks at: a tight box when the visitor is at the ram, a wide one over the
// whole hillside. The scene module does not receive the camera, so the terrain remembers it from its own draw call.

export function createShadowAim(terrain: Terrain, sky: SkyRig): () => void {
  const camPos = new THREE.Vector3(-60, 80, 150);
  const camDir = new THREE.Vector3(0.2, -0.3, -1).normalize();
  terrain.mesh.onBeforeRender = (_renderer, _scene, camera) => {
    // the shadow pass renders with an orthographic camera: keep the visitor's camera only
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      camera.getWorldPosition(camPos);
      camera.getWorldDirection(camDir);
    }
  };
  const focus = new THREE.Vector3();
  const probe = new THREE.Vector3();
  return () => {
    let t = 4;
    let hit = false;
    for (let i = 0; i < 90 && t < 4000; i++) {
      probe.copy(camPos).addScaledVector(camDir, t);
      if (probe.y <= terrain.surfaceY(probe.x, probe.z)) {
        hit = true;
        break;
      }
      t *= 1.07;
    }
    if (!hit) t = 200;
    focus.copy(camPos).addScaledVector(camDir, t);
    sky.focusShadow(focus, clamp(t * 0.55, 10, 320));
  };
}
