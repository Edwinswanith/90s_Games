import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { session } from './network';
import { hype, detect, resetHype, burst } from './hype';
import { preferences } from './preferences';
const MAX = 600;
// Runs the hype detector once per rendered frame against the authoritative state.
export function HypeDirector() {
  const connected = useRef(false);
  useFrame(() => {
    const room = session.room;
    if (!room) {
      if (connected.current) resetHype();
      connected.current = false;
      return;
    }
    connected.current = true;
    detect(room.state, room.sessionId);
  }, -4);
  return null;
}
// Pooled confetti / spark particles, fed by hype.bursts.
export function Particles() {
  const { scene } = useThree();
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.11, 0.11, 0.11),
      new THREE.MeshBasicMaterial({ toneMapped: false }),
      MAX,
    );
    m.frustumCulled = false;
    m.count = 0;
    m.name = 'hype-particles';
    m.setColorAt(0, new THREE.Color());
    return m;
  }, []);
  const pool = useMemo(
    () =>
      Array.from({ length: MAX }, () => ({
        p: new THREE.Vector3(),
        v: new THREE.Vector3(),
        r: new THREE.Euler(),
        life: 0,
        max: 1,
        color: new THREE.Color(),
      })),
    [],
  );
  const cursor = useRef(0);
  useEffect(() => {
    scene.add(mesh);
    return () => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      mesh.dispose();
    };
  }, [mesh, scene]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05);
    for (const b of hype.bursts.splice(0)) {
      for (let i = 0; i < b.count; i++) {
        const q = pool[cursor.current++ % MAX];
        const a = Math.random() * Math.PI * 2,
          up = 2.5 + Math.random() * 4;
        q.p.set(b.x, b.y, b.z);
        q.v.set(Math.cos(a) * (1 + Math.random() * 3), up, Math.sin(a) * (1 + Math.random() * 3));
        q.v.multiplyScalar(b.power);
        q.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
        q.max = q.life = 0.6 + Math.random() * 0.6;
        q.color.set(b.color);
      }
    }
    let n = 0;
    for (const q of pool) {
      if (q.life <= 0) continue;
      q.life -= step;
      q.v.y -= 14 * step;
      q.v.multiplyScalar(1 - 1.2 * step);
      q.p.addScaledVector(q.v, step);
      if (q.p.y < 0.03) {
        q.p.y = 0.03;
        q.v.y *= -0.3;
      }
      q.r.x += step * 8;
      q.r.y += step * 6;
      dummy.position.copy(q.p);
      dummy.rotation.copy(q.r);
      dummy.scale.setScalar(Math.max(0.05, q.life / q.max));
      dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix);
      mesh.setColorAt(n, q.color);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return null;
}
// Speed sparks while boosted and dust when landing, for the local player only.
export function Footwork() {
  const last = useRef({ grounded: true, at: 0 });
  useFrame(({ clock }) => {
    const room = session.room;
    const p = room?.state.players.get(room.sessionId);
    if (!room || !p || room.state.phase !== 'PLAYING') return;
    const t = clock.elapsedTime;
    if (!last.current.grounded && p.grounded && !preferences.reducedMotion)
      burst({ x: p.x, y: p.y + 0.05, z: p.z }, '#D9B580', 6, 0.35);
    if (p.boostUntil > room.state.tick && t - last.current.at > 0.05) {
      last.current.at = t;
      burst({ x: p.x, y: p.y + 0.3, z: p.z }, '#45C8F5', 1, 0.25);
    }
    last.current.grounded = p.grounded;
  });
  return null;
}
// Golden-hour gradient sky: "Chennai, after school".
export function Sky() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color('#5DB7EA') },
          horizon: { value: new THREE.Color('#FFE2B6') },
          sun: { value: new THREE.Vector3(0.45, 0.28, -0.85).normalize() },
        },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 sun; varying vec3 vDir;
          void main(){
            float h = clamp(vDir.y * 1.6 + 0.08, 0.0, 1.0);
            vec3 c = mix(horizon, top, pow(h, 0.75));
            float s = max(dot(normalize(vDir), sun), 0.0);
            c += vec3(1.0, 0.82, 0.5) * (pow(s, 90.0) * 1.2 + pow(s, 8.0) * 0.18);
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  const camera = useThree((s) => s.camera);
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => mesh.current?.position.copy(camera.position));
  return (
    <mesh ref={mesh} material={material} renderOrder={-1}>
      <sphereGeometry args={[140, 32, 16]} />
    </mesh>
  );
}
