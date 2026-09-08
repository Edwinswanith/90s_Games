import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
type Kind = 'box' | 'sphere' | 'capsule' | 'cylinder' | 'cone' | 'torus' | 'ring' | 'ico' | 'plane';
type Entry = { object: THREE.Object3D; color: THREE.Color };
type Batch = { mesh: THREE.InstancedMesh; entries: Set<Entry> };
function geometry(kind: Kind, args: number[]): THREE.BufferGeometry {
  switch (kind) {
    case 'box':
      return new THREE.BoxGeometry(...args);
    case 'sphere':
      return new THREE.SphereGeometry(...args);
    case 'capsule':
      return new THREE.CapsuleGeometry(...args);
    case 'cylinder':
      return new THREE.CylinderGeometry(...args);
    case 'cone':
      return new THREE.ConeGeometry(...args);
    case 'torus':
      return new THREE.TorusGeometry(...args);
    case 'ring':
      return new THREE.RingGeometry(...args);
    case 'ico':
      return new THREE.IcosahedronGeometry(...args);
    case 'plane':
      return new THREE.PlaneGeometry(...args);
  }
}
const Context = createContext<Map<string, Batch> | null>(null);
export function InstancePool({ children }: { children: ReactNode }) {
  const batches = useMemo(() => new Map<string, Batch>(), []);
  const { scene } = useThree();
  useFrame(() => {
    scene.updateMatrixWorld(true);
    for (const batch of batches.values()) {
      let i = 0;
      for (const entry of batch.entries) {
        let visible = true;
        for (let parent: THREE.Object3D | null = entry.object; parent; parent = parent.parent)
          if (!parent.visible) {
            visible = false;
            break;
          }
        if (!visible) continue;
        batch.mesh.setMatrixAt(i, entry.object.matrixWorld);
        batch.mesh.setColorAt(i, entry.color);
        i++;
      }
      batch.mesh.count = i;
      batch.mesh.instanceMatrix.needsUpdate = true;
      if (batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true;
    }
  }, -1);
  useEffect(
    () => () => {
      for (const b of batches.values()) {
        scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
        b.mesh.dispose();
      }
      batches.clear();
    },
    [batches, scene],
  );
  return <Context.Provider value={batches}>{children}</Context.Provider>;
}
export function Piece({
  kind,
  args,
  position,
  rotation,
  scale,
  color = '#FFF4DD',
  basic = false,
  ref: externalRef,
  ...props
}: {
  kind: Kind;
  args: number[];
  color?: string;
  basic?: boolean;
  position?: any;
  rotation?: any;
  scale?: any;
  [key: string]: any;
}) {
  const batches = useContext(Context)!,
    { scene } = useThree(),
    ref = useRef<THREE.Object3D>(null),
    key = kind + JSON.stringify(args) + basic,
    entry = useRef<Entry | null>(null);
  useLayoutEffect(() => {
    let batch = batches.get(key);
    if (!batch) {
      const material = basic
        ? new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
        : new THREE.MeshStandardMaterial({ roughness: 0.85 });
      const mesh = new THREE.InstancedMesh(geometry(kind, args), material, 1024);
      mesh.frustumCulled = false;
      mesh.castShadow = !basic;
      mesh.receiveShadow = !basic;
      mesh.count = 0;
      mesh.name = `batch-${key}`;
      scene.add(mesh);
      batch = { mesh, entries: new Set() };
      batches.set(key, batch);
    }
    const e = { object: ref.current!, color: new THREE.Color(color) };
    entry.current = e;
    batch.entries.add(e);
    return () => {
      batch!.entries.delete(e);
      if (batch!.entries.size === 0) {
        scene.remove(batch!.mesh);
        batch!.mesh.geometry.dispose();
        (batch!.mesh.material as THREE.Material).dispose();
        batch!.mesh.dispose();
        batches.delete(key);
      }
    };
  }, [key, batches, scene]);
  useLayoutEffect(() => {
    entry.current?.color.set(color);
  }, [color]);
  return (
    <object3D
      ref={(value) => {
        ref.current = value;
        if (typeof externalRef === 'function') externalRef(value);
        else if (externalRef) externalRef.current = value;
      }}
      position={position}
      rotation={rotation}
      scale={scale}
      {...props}
    />
  );
}
