import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Label } from './Labels';
import { COLORS } from '../../../packages/shared/src/config';
import {
  kallaCells,
  mapFor,
  raceCheckpoints,
  paandiGroup,
  markerFor,
} from '../../../packages/shared/src/maps';
import { spectatorId } from './RoundUI';
import { session, controls, PredictionRuntime, physicsReady } from './network';
import { InstancePool, Piece } from './Instances';
import { preferences, usePreferences } from './preferences';
import { sound } from './audio';
import { hype, burst } from './hype';
import { HypeDirector, Particles, Footwork, Sky } from './Effects';
export const avatarColors = [
  COLORS.yellow,
  COLORS.coral,
  COLORS.cyan,
  COLORS.mint,
  '#BB98DF',
  COLORS.cream,
];
export let runtime: PredictionRuntime | null = null;
export const renderMetrics = {
  fps: 0,
  frameP95Ms: 0,
  drawCalls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
  frames: 0,
};
function Metrics() {
  const { gl } = useThree(),
    times = useRef<number[]>([]);
  useFrame((_, dt) => {
    times.current.push(dt * 1000);
    if (times.current.length > 300) times.current.shift();
    renderMetrics.frames++;
    if (renderMetrics.frames % 30 === 0) {
      const sorted = [...times.current].sort((a, b) => a - b);
      Object.assign(renderMetrics, {
        fps: 1000 / (times.current.reduce((a, b) => a + b, 0) / times.current.length),
        frameP95Ms: sorted[Math.floor(sorted.length * 0.95)] || 0,
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
      });
    }
  });
  return null;
}
function RoundAudio() {
  const previous = useRef({ countdown: '', wave: '', phase: '' });
  useFrame(() => {
    const state = session.room?.state;
    if (!state) {
      previous.current = { countdown: '', wave: '', phase: '' };
      return;
    }
    const key = `${state.matchId}:${state.roundId}`;
    const countdown =
      state.phase === 'COUNTDOWN' ? `${key}:${Math.ceil((state.deadline - state.tick) / 60)}` : '';
    const wave =
      state.phase === 'PLAYING' && state.wavePhase === 'warning' ? `${key}:${state.wave}` : '';
    const phase = `${key}:${state.phase}`;
    if (countdown && countdown !== previous.current.countdown) sound('count');
    if (wave && wave !== previous.current.wave && state.selectedGame === 'kalla-manna')
      sound('warning');
    if (
      phase !== previous.current.phase &&
      ['ROUND_RESULTS', 'MATCH_RESULTS'].includes(state.phase)
    )
      sound('finish');
    previous.current = { countdown, wave, phase };
  });
  return null;
}
function Box({ position, size, color = COLORS.cream, ...props }: any) {
  return (
    <Piece kind="box" args={[1, 1, 1]} position={position} scale={size} color={color} {...props} />
  );
}
export function Character({
  id,
  cosmetic = 0,
  hero = false,
}: {
  id: string;
  cosmetic?: number;
  hero?: boolean;
}) {
  const previous = useRef({
    ground: true,
    landAt: 0,
    mode: 'idle',
    item: '',
    lives: 2,
    round: '',
    alive: true,
    qualified: false,
    throwUntil: 0,
    protectionUntil: 0,
    notice: '',
  });
  const group = useRef<THREE.Group>(null),
    left = useRef<THREE.Group>(null),
    right = useRef<THREE.Group>(null),
    arms = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const root = group.current;
    if (!root) return;
    const p = session.room?.state.players.get(id),
      t = clock.elapsedTime;
    if (p) {
      const s = session.room!.state,
        v = runtime?.position(p) ?? p,
        final = s.phase === 'MATCH_RESULTS',
        prev = previous.current;
      let x = v.x,
        y = v.y,
        z = v.z;
      if (final) {
        const result = JSON.parse(s.matchResults || '{}'),
          index = result.groups?.findIndex((g: any) => g.slots.includes(id)) ?? 0,
          ids = result.groups?.[index]?.slots ?? [],
          offset = ids.indexOf(id) - (ids.length - 1) / 2;
        x = ([0, -3, 3][index] ?? (index - 3) * 1.2) + offset * 0.8;
        y = index < 3 ? [1.6, 1, 0.6][index] : 0;
        z = index < 3 ? 0 : 2.5;
      }
      root.position.set(x, y, z);
      root.rotation.y = final ? 0.5 : v.facing;
      root.rotation.x =
        p.mode === 'vault' ? -0.3 : !p.alive ? Math.min(1.4, (s.tick - p.eliminatedTick) / 25) : 0;
      root.rotation.z =
        p.mode === 'stumble' && !preferences.reducedMotion ? Math.sin(t * 25) * 0.12 : 0;
      const run = Math.hypot(p.vx, p.vz) > 0.4 && !final;
      left.current!.rotation.x = run ? Math.sin(t * 13) * 0.75 : !p.grounded ? 0.35 : 0;
      right.current!.rotation.x = run ? -Math.sin(t * 13) * 0.75 : !p.grounded ? -0.25 : 0;
      arms.current!.rotation.x = final
        ? -2.4 + Math.sin(t * 4) * 0.15
        : p.mode === 'vault'
          ? -1.8
          : s.tick < p.throwUntil && p.throwUntil - s.tick > 30
            ? -1.7
            : p.placingUntil
              ? -0.8 + Math.sin(t * 9) * 0.2
              : p.item
                ? -0.8
                : !p.grounded
                  ? -0.6
                  : run
                    ? Math.sin(t * 13) * 0.2
                    : preferences.reducedMotion
                      ? 0
                      : Math.sin(t * 2) * 0.035;
      if (!prev.ground && p.grounded) prev.landAt = t;
      const squash = !preferences.reducedMotion && t - prev.landAt < 0.16 ? 0.9 : 1;
      root.scale.set(1 / squash, squash, 1);
      root.visible = p.alive || s.phase !== 'PLAYING' || s.tick - p.eliminatedTick < 40;
      const round = `${s.matchId}:${s.roundId}`;
      if (id === session.room!.sessionId && s.phase === 'PLAYING' && prev.round === round) {
        if (prev.ground && !p.grounded && p.vy > 0) sound('jump');
        if (!prev.ground && p.grounded) sound('land');
        if (p.mode === 'vault' && prev.mode !== 'vault') sound('vault');
        if (p.throwUntil > prev.throwUntil) sound('throw');
        if (p.lives < prev.lives || p.protectionUntil > prev.protectionUntil) sound('hit');
        if (p.item && !prev.item) sound('pickup');
        if (p.notice === 'Stone placed' && prev.notice !== p.notice) sound('place');
        if (p.qualified && !prev.qualified) sound('qualify');
        if (!p.alive && prev.alive) sound('eliminate');
      }
      Object.assign(prev, {
        ground: p.grounded,
        mode: p.mode,
        item: p.item,
        lives: p.lives,
        round,
        alive: p.alive,
        qualified: p.qualified,
        throwUntil: p.throwUntil,
        protectionUntil: p.protectionUntil,
        notice: p.notice,
      });
    } else if (hero) {
      root.position.set(0, 0.35 + (preferences.reducedMotion ? 0 : Math.sin(t * 1.8) * 0.035), 0);
      root.rotation.y = 0.45;
      arms.current!.rotation.z = Math.sin(t * 1.8) * 0.04;
    }
  }, -2);
  const player = session.room?.state.players.get(id),
    teamGame = session.room?.state.selectedGame === 'seven-stones';
  const skin = ['#AE704D', '#D89568', '#825035', '#C08053', '#EDB38B', '#985F43'][cosmetic % 6],
    outfit = avatarColors[cosmetic % 6],
    hat = Math.floor(cosmetic / 6);
  return (
    <group ref={group}>
      {player && (
        <Label
          position={[0, 1.95, 0]}
          width={1.85}
          height={0.4}
          text={`${teamGame ? (player.team === 0 ? '◆ ' : '▲ ') : ''}${player.name}${player.cpu ? ' · CPU' : ''}`}
          background={teamGame ? (player.team === 0 ? COLORS.ocean : COLORS.mango) : COLORS.cream}
        />
      )}
      {player && player.protectionUntil > (session.room?.state.tick ?? 0) && (
        <Piece
          kind="ring"
          args={[0.6, 0.67, 24]}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.03, 0]}
          color={COLORS.cyan}
          basic
        />
      )}
      {cosmetic % 3 === 1 && (
        <Box position={[0, 0.92, 0.23]} size={[0.36, 0.1, 0.07]} color={COLORS.cream} />
      )}
      {cosmetic % 3 === 2 && (
        <Box position={[0, 0.84, 0.23]} size={[0.08, 0.4, 0.07]} color={COLORS.cream} />
      )}
      <Piece position={[0, 0.79, 0]} kind="capsule" args={[0.23, 0.35, 4, 12]} color={outfit} />
      <Hat kind={hat} />
      <Piece position={[0, 1.28, 0]} kind="sphere" args={[0.35, 16, 12]} color={skin} />
      <Piece
        position={[0, 1.48, -0.035]}
        scale={[1, 0.52, 1]}
        kind="sphere"
        args={[0.355, 16, 12]}
        color="#302B35"
      />
      {[-0.12, 0.12].map((x) => (
        <Piece
          key={x}
          position={[x, 1.3, 0.316]}
          kind="sphere"
          args={[0.036, 8, 8]}
          color={COLORS.ink}
        />
      ))}
      <Piece
        position={[0, 1.15, 0.329]}
        rotation={[0, 0, Math.PI]}
        kind="torus"
        args={[0.062, 0.014, 6, 12, Math.PI]}
        color="#743E34"
      />
      <group ref={arms} position={[0, 0.84, 0]}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.31, 0, 0]} rotation={[0, 0, s * 0.13]}>
            <Piece kind="capsule" args={[0.085, 0.26, 3, 8]} color={skin} />
            <Piece position={[0, 0.14, 0]} kind="sphere" args={[0.1, 8, 8]} color={outfit} />
          </group>
        ))}
      </group>
      {[left, right].map((ref, i) => (
        <group ref={ref} key={i} position={[(i === 0 ? -1 : 1) * 0.13, 0.46, 0]}>
          <Piece
            position={[0, -0.09, 0]}
            kind="capsule"
            args={[0.1, 0.2, 3, 8]}
            color={COLORS.ink}
          />
          <Piece
            position={[0, -0.34, 0.065]}
            scale={[0.9, 0.65, 1.3]}
            kind="sphere"
            args={[0.14, 10, 8]}
            color={COLORS.cream}
          />
        </group>
      ))}
      {(hero || id === session.room?.sessionId) && (
        <Piece
          position={[0, 0.025, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          kind="ring"
          args={[0.47, 0.56, 32]}
          color={COLORS.yellow}
          basic
        />
      )}
    </group>
  );
}
// Level-unlocked headwear. Appearance only: no effect on hitboxes or movement.
function Hat({ kind }: { kind: number }) {
  if (kind === 1)
    return (
      <>
        <Piece
          position={[0, 1.55, 0]}
          scale={[1, 0.5, 1]}
          kind="sphere"
          args={[0.37, 14, 10]}
          color={COLORS.blue}
        />
        <Box position={[0, 1.55, 0.3]} size={[0.42, 0.04, 0.3]} color={COLORS.blue} />
      </>
    );
  if (kind === 2)
    return (
      <>
        {Array.from({ length: 9 }, (_, i) => (
          <Piece
            key={i}
            position={[
              Math.sin((i / 9) * Math.PI * 2) * 0.34,
              1.5,
              Math.cos((i / 9) * Math.PI * 2) * 0.34,
            ]}
            kind="sphere"
            args={[0.06, 6, 5]}
            color={i % 2 ? COLORS.white : COLORS.mint}
          />
        ))}
      </>
    );
  if (kind === 3 || kind === 5)
    return (
      <>
        <Piece
          position={[0, 1.66, 0]}
          kind="cylinder"
          args={[0.3, 0.3, 0.16, 10]}
          color={kind === 5 ? '#F2B61C' : COLORS.coral}
        />
        {Array.from({ length: 5 }, (_, i) => (
          <Piece
            key={i}
            position={[
              Math.sin((i / 5) * Math.PI * 2) * 0.28,
              1.8,
              Math.cos((i / 5) * Math.PI * 2) * 0.28,
            ]}
            kind="cone"
            args={[0.07, 0.15, 4]}
            color={kind === 5 ? '#F2B61C' : COLORS.yellow}
          />
        ))}
        {kind === 5 && (
          <Piece position={[0, 1.68, 0.3]} kind="ico" args={[0.06, 0]} color={COLORS.coral} />
        )}
      </>
    );
  if (kind === 4)
    return (
      <>
        {[-0.12, 0.12].map((x) => (
          <Box key={x} position={[x, 1.31, 0.33]} size={[0.17, 0.09, 0.03]} color={COLORS.ink} />
        ))}
        <Box position={[0, 1.33, 0.33]} size={[0.44, 0.025, 0.03]} color={COLORS.ink} />
      </>
    );
  return null;
}
function Croucher({ box: b }: any) {
  return (
    <group position={[b.x, 0, b.z]} scale={[1, b.h / 0.9, 1]}>
      <Piece
        position={[0, 0.57, 0]}
        rotation={[0, 0, Math.PI / 2]}
        kind="capsule"
        args={[0.2, 0.9, 4, 10]}
        color={COLORS.cyan}
      />
      {[-0.62, 0.62].map((x) => (
        <Piece
          key={x}
          position={[x, 0.25, 0]}
          kind="capsule"
          args={[0.11, 0.28, 3, 8]}
          color={COLORS.ink}
        />
      ))}
      <Piece position={[0.7, 0.68, 0]} kind="sphere" args={[0.22, 10, 8]} color="#C08053" />
      <Piece
        position={[0.7, 0.8, -0.03]}
        scale={[1, 0.4, 1]}
        kind="sphere"
        args={[0.23, 10, 8]}
        color="#302B35"
      />
    </group>
  );
}
function ItemView({ id }: { id: string }) {
  const group = useRef<THREE.Group>(null),
    trail = useRef(0);
  useFrame((_, dt) => {
    const item = session.room?.state.items.get(id);
    if (!item || !group.current) return;
    const root = group.current;
    root.position.set(item.x, item.y, item.z);
    if (item.kind === 'tyre') {
      root.rotation.z -= (item.vx * Math.min(dt, 0.05)) / 0.45;
      return;
    }
    // Live balls leave a short spark trail so throws read at a glance.
    if (item.status === 'LIVE' && !preferences.reducedMotion && (trail.current += dt) > 0.03) {
      trail.current = 0;
      burst({ x: item.x, y: item.y, z: item.z }, COLORS.yellow, 1, 0.15);
    }
    if (item.status === 'CARRIED') {
      const p = session.room?.state.players.get(item.owner);
      if (p) {
        const v = runtime?.position(p) ?? p;
        root.position.set(
          v.x + Math.sin(v.facing) * 0.48,
          v.y + 0.85,
          v.z + Math.cos(v.facing) * 0.48,
        );
      }
    }
    root.rotation.x += item.status === 'LIVE' ? 0.16 : 0;
  }, -2);
  const item = session.room?.state.items.get(id);
  return (
    <group ref={group}>
      {item?.kind === 'tyre' ? (
        <>
          <Piece kind="torus" args={[0.34, 0.12, 8, 18]} color="#26222B" />
          <Piece
            kind="cylinder"
            args={[0.23, 0.23, 0.08, 10]}
            rotation={[Math.PI / 2, 0, 0]}
            color={COLORS.coral}
          />
          <Box position={[0, 0.18, 0]} size={[0.06, 0.2, 0.09]} color={COLORS.cream} />
        </>
      ) : item?.kind === 'stone' ? (
        <Piece kind="cylinder" args={[0.3, 0.34, 0.15, 7]} color={COLORS.stone} />
      ) : (
        <>
          <Piece kind="sphere" args={[0.18, 14, 10]} color={COLORS.coral} />
          <Piece
            rotation={[Math.PI / 2, 0, 0]}
            kind="torus"
            args={[0.177, 0.023, 6, 18]}
            color={COLORS.cream}
          />
        </>
      )}
    </group>
  );
}
// Pulsing ring under the local player while an enemy ball is on its way: a readable "dodge now".
function Threat() {
  const ring = useRef<THREE.Object3D>(null);
  useFrame(({ clock }) => {
    const room = session.room,
      me = room?.state.players.get(room.sessionId);
    if (!ring.current) return;
    let danger = false;
    if (room && me?.alive && room.state.phase === 'PLAYING') {
      const v = runtime?.position(me) ?? me;
      for (const b of room.state.items.values()) {
        if (b.status !== 'LIVE' || b.owner === room.sessionId) continue;
        const owner = room.state.players.get(b.owner);
        if (room.state.selectedGame === 'seven-stones' && owner?.team === me.team) continue;
        const dx = v.x - b.x,
          dz = v.z - b.z,
          d = Math.hypot(dx, dz);
        if (d < 4.5 && d > 0.01 && (b.vx * dx + b.vz * dz) / d > 5) danger = true;
      }
      ring.current.position.set(v.x, 0.05, v.z);
    }
    ring.current.visible = danger;
    ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 30) * 0.12);
  });
  return (
    <group ref={ring as any}>
      <Piece
        kind="ring"
        args={[0.62, 0.8, 28]}
        rotation={[-Math.PI / 2, 0, 0]}
        color={COLORS.coral}
        basic
      />
      <Label
        text="DODGE!"
        position={[0, 2.35, 0]}
        width={1.2}
        height={0.34}
        background={COLORS.coral}
        color={COLORS.cream}
      />
    </group>
  );
}
function Aim() {
  const { camera, gl } = useThree();
  const line = useRef<THREE.Mesh>(null);
  useEffect(() => {
    const canvas = gl.domElement,
      ray = new THREE.Raycaster(),
      plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    function aim(e: PointerEvent) {
      const p = session.room?.state.players.get(session.room.sessionId);
      if (!p) return;
      const r = canvas.getBoundingClientRect();
      ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          -((e.clientY - r.top) / r.height) * 2 + 1,
        ),
        camera,
      );
      const target = new THREE.Vector3();
      if (ray.ray.intersectPlane(plane, target)) {
        const me = runtime?.position(p) ?? p,
          dx = target.x - me.x,
          dz = target.z - me.z,
          d = Math.hypot(dx, dz);
        if (d > 0.01) {
          controls.aimX = dx / d;
          controls.aimZ = dz / d;
        }
      }
    }
    function down(e: PointerEvent) {
      if (e.button !== 0) return;
      canvas.setPointerCapture(e.pointerId);
      controls.aiming = true;
      aim(e);
    }
    function up() {
      if (controls.aiming) controls.actionPulse = true;
      controls.aiming = false;
    }
    canvas.addEventListener('pointermove', aim);
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerup', up);
    const cancel = () => {
      controls.aiming = false;
    };
    canvas.addEventListener('pointercancel', cancel);
    return () => {
      canvas.removeEventListener('pointermove', aim);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', cancel);
    };
  }, [camera, gl]);
  useFrame(() => {
    const p = session.room?.state.players.get(session.room.sessionId);
    if (!line.current) return;
    line.current.visible = !!p?.item.startsWith('ball') && controls.aiming;
    if (p) {
      const v = runtime?.position(p) ?? p;
      line.current.position.set(v.x + controls.aimX * 3, 0.07, v.z + controls.aimZ * 3);
      line.current.rotation.set(-Math.PI / 2, 0, -Math.atan2(controls.aimX, controls.aimZ));
    }
  });
  return <Piece ref={line} kind="plane" args={[0.06, 6]} color={COLORS.cream} basic />;
}
function Scenery() {
  return (
    <group>
      {[-13, -7, 0, 7, 13].map((x, i) => (
        <group key={x} position={[x, 0, -13]}>
          <Box position={[0, 2, 0]} size={[5.8, 4, 4]} color={i % 2 ? COLORS.cream : '#E9B37D'} />
          <Box position={[0, 4.1, 0]} size={[6.2, 0.35, 4.4]} color={COLORS.terracotta} />
          <Box position={[0, 1, -2.05]} size={[1.3, 2, 0.12]} color={COLORS.blue} />
          <Box
            position={[0, 1, 2.05]}
            size={[2.7, 2, 0.12]}
            color={i % 2 ? COLORS.indigo : COLORS.leaf}
          />
          <Box
            position={[0, 2.35, 2.5]}
            size={[3.8, 0.15, 1.2]}
            color={i % 2 ? COLORS.yellow : COLORS.coral}
          />
          {[-1.65, 1.65].map((a) => (
            <Box key={a} position={[a, 3, 2.02]} size={[0.65, 0.8, 0.12]} color={COLORS.blue} />
          ))}
        </group>
      ))}
      {[-12, 12].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <Box position={[0, 1.5, 0]} size={[0.35, 3, 0.35]} color="#845C47" />
          <Piece position={[0, 3, 0]} kind="ico" args={[1.7, 1]} color={COLORS.leaf} />
          <Piece position={[0.8, 3.5, 0.2]} kind="ico" args={[1.1, 1]} color="#8CB676" />
        </group>
      ))}
      <Label
        text="KUTTI KADAI · குட்டிக் கடை"
        position={[0, 2.95, -10.7]}
        width={3.4}
        height={0.7}
      />
      <group position={[-9, 0, -10.5]}>
        {[-0.65, 0.65].map((x) => (
          <Piece
            key={x}
            kind="torus"
            args={[0.42, 0.045, 6, 16]}
            position={[x, 0.5, 0]}
            color={COLORS.ink}
          />
        ))}
        <Box position={[0, 0.85, 0]} size={[1.15, 0.08, 0.08]} color={COLORS.coral} />
        <Box
          position={[0.4, 1, 0]}
          rotation={[0, 0, -0.4]}
          size={[0.08, 0.8, 0.08]}
          color={COLORS.coral}
        />
        <Box position={[-0.3, 1.18, 0]} size={[0.4, 0.08, 0.2]} color={COLORS.ink} />
        <Box position={[0.5, 1.5, 0]} size={[0.4, 0.06, 0.06]} color={COLORS.ink} />
      </group>
      {[-11, 10.8].map((x) => (
        <group key={x} position={[x, 0, -10.5]}>
          <Piece
            kind="cylinder"
            args={[0.35, 0.25, 0.55, 10]}
            position={[0, 0.28, 0]}
            color={COLORS.terracotta}
          />
          <Piece kind="ico" args={[0.4, 0]} position={[0, 0.75, 0]} color={COLORS.leaf} />
        </group>
      ))}
      <Box position={[-7, 0.65, -10]} size={[3, 0.18, 0.65]} color={COLORS.terracotta} />
      {[-8, -6].map((x) => (
        <Box key={x} position={[x, 0.3, -10]} size={[0.18, 0.6, 0.5]} color={COLORS.ink} />
      ))}
      {Array.from({ length: 15 }, (_, i) => (
        <Piece
          key={i}
          position={[-10 + i * 1.4, 5.4 - Math.sin((i / 14) * Math.PI) * 0.9, -7]}
          rotation={[0, 0, Math.PI]}
          kind="cone"
          args={[0.26, 0.48, 3]}
          color={[COLORS.yellow, COLORS.coral, COLORS.cyan][i % 3]}
        />
      ))}
    </group>
  );
}
function KallaGrid() {
  const s = session.room!.state,
    safeIds: number[] = JSON.parse(s.safeTiles || '[]');
  return (
    <>
      <Label text="◆ STONE · கல்" position={[-4, 1, -8.5]} width={2.8} />
      <Label text="● SAND · மண்" position={[4, 1, -8.5]} width={2.8} />
      {kallaCells.map((c) => {
        const safe = safeIds.includes(c.index),
          warning = s.wavePhase === 'warning',
          danger = !safe && s.wavePhase === 'active';
        return (
          <group key={c.index} position={[c.x, 0, c.z]}>
            {c.material === 'stone' ? (
              <>
                {[-0.5, 0.5].map((z) => (
                  <Box
                    key={z}
                    position={[0, 0.013, z]}
                    size={[2.3, 0.014, 0.045]}
                    color="#707E8F"
                  />
                ))}
                <Box position={[0.2, 0.013, 0]} size={[0.045, 0.014, 1.1]} color="#707E8F" />
              </>
            ) : (
              Array.from({ length: 5 }, (_, i) => (
                <Piece
                  key={i}
                  kind="sphere"
                  args={[0.05, 6, 4]}
                  scale={[1, 0.15, 1]}
                  position={[Math.sin(i * 3) * 0.8, 0.013, Math.cos(i * 2) * 0.8]}
                  color="#C3A06B"
                />
              ))
            )}
            <Piece
              position={[0, 0.025, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              kind="ring"
              args={[0.48, 0.54, c.material === 'stone' ? 4 : 16]}
              color={COLORS.ink}
              basic
            />
            {safe && s.wavePhase !== 'recovery' && (
              <>
                {[-1, 1].map((sign) => (
                  <group key={sign}>
                    <Box
                      position={[sign * 1.29, 0.025, 0]}
                      size={[0.08, 0.02, 2.58]}
                      color={COLORS.cream}
                    />
                    <Box
                      position={[0, 0.025, sign * 1.29]}
                      size={[2.58, 0.02, 0.08]}
                      color={COLORS.cream}
                    />
                  </group>
                ))}
                {warning && (
                  <Piece
                    kind="cone"
                    args={[0.16, 0.35, 3]}
                    position={[0, 0.3, 0]}
                    color={COLORS.cream}
                  />
                )}
              </>
            )}
            {danger && (
              <>
                <Piece
                  kind="plane"
                  args={[2.55, 2.55]}
                  position={[0, 0.019, 0]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  color={COLORS.coral}
                  basic
                />
                {[-0.5, 0.5].map((x) => (
                  <Box
                    key={x}
                    position={[x, 0.033, 0]}
                    rotation={[0, Math.PI / 4, 0]}
                    size={[0.12, 0.012, 1.8]}
                    color={COLORS.ink}
                  />
                ))}
              </>
            )}
          </group>
        );
      })}
    </>
  );
}
function PaandiGrid() {
  const s = session.room!.state,
    p = s.players.get(session.room!.sessionId);
  return (
    <>
      {[0, 1, 2].flatMap((section) =>
        Array.from({ length: 8 }, (_, gate) => {
          const g = paandiGroup(section, gate),
            marked =
              gate === markerFor(s.seed, section) && !(p?.section === section && p.markerRetrieved),
            next = p?.section === section && p.gate === gate;
          return (
            <group key={`${section}-${gate}`} position={[0, 0.018, g.z]}>
              <Box
                position={[0, 0, 0]}
                size={[g.w + 0.24, 0.01, g.d + 0.24]}
                color={next ? COLORS.cyan : COLORS.cream}
              />
              <Box
                position={[0, 0.012, 0]}
                size={[g.w - 0.04, 0.01, g.d - 0.04]}
                color={marked ? COLORS.mango : COLORS.sand}
              />
              {[3, 5, 7].includes(gate) && (
                <Box position={[0, 0.024, 0]} size={[0.06, 0.02, g.d]} color={COLORS.cream} />
              )}
              {next && (
                <Box
                  position={[0, 0.02, 0]}
                  size={[g.w - 0.3, 0.012, g.d - 0.3]}
                  color={COLORS.cyan}
                />
              )}
              <Label
                text={marked ? '× SKIP' : gate === 0 ? 'START' : String(gate)}
                position={[0, 0.3, 0]}
                width={1.5}
                height={0.33}
                color={marked ? COLORS.coral : COLORS.ink}
              />
              {marked && (
                <Piece
                  position={[0.25, 0.09, 0]}
                  kind="cylinder"
                  args={[0.12, 0.14, 0.07, 7]}
                  color={COLORS.stone}
                />
              )}
            </group>
          );
        }),
      )}
      {[0, 1, 2].map((section) => (
        <Box
          key={section}
          position={[3.8, 0.025, -5 - section * 18]}
          size={[0.13, 0.02, 14]}
          color={COLORS.cream}
        />
      ))}
      <Box position={[4, 0.028, -48]} size={[3, 0.025, 0.35]} color={COLORS.yellow} />
      <Box position={[2.4, 1.5, -48]} size={[0.2, 3, 0.2]} color={COLORS.cyan} />
      <Box position={[5.6, 1.5, -48]} size={[0.2, 3, 0.2]} color={COLORS.cyan} />
      <Box position={[4, 3, -48]} size={[3.4, 0.3, 0.3]} color={COLORS.yellow} />
    </>
  );
}
// Bouncing arrow over the local player's next Paandi group: where to land is never a guess.
function NextHop() {
  const arrow = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const room = session.room,
      p = room?.state.players.get(room.sessionId);
    if (!arrow.current) return;
    const show = !!p && room!.state.phase === 'PLAYING' && p.section < 3 && !p.qualified;
    arrow.current.visible = show;
    if (!show) return;
    const g = paandiGroup(p!.section, p!.gate);
    const bob = preferences.reducedMotion ? 0 : Math.abs(Math.sin(clock.elapsedTime * 5)) * 0.3;
    arrow.current.position.set(0, 1.1 + bob, g.z);
  });
  return (
    <group ref={arrow}>
      <Piece kind="cone" args={[0.28, 0.5, 4]} rotation={[Math.PI, 0, 0]} color={COLORS.cyan} />
    </group>
  );
}
function Podium() {
  const confetti = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (confetti.current && !preferences.reducedMotion)
      confetti.current.position.y = 1 - Math.sin(clock.elapsedTime * 0.7) * 0.4;
  }, -2);
  return (
    <>
      <Box position={[0, 0.8, 0]} size={[2.5, 1.6, 2.5]} color={COLORS.yellow} />
      <Box position={[-3, 0.5, 0]} size={[2.5, 1, 2.5]} color={COLORS.cyan} />
      <Box position={[3, 0.3, 0]} size={[2.5, 0.6, 2.5]} color={COLORS.mint} />
      <group ref={confetti}>
        {!preferences.reducedMotion &&
          Array.from({ length: 24 }, (_, i) => (
            <Box
              key={i}
              position={[Math.sin(i * 6.3) * 5, 2 + (i % 6) * 0.55, Math.cos(i * 4.1) * 3]}
              rotation={[i * 0.2, 0, i]}
              size={[0.13, 0.04, 0.2]}
              color={[COLORS.yellow, COLORS.coral, COLORS.cyan][i % 3]}
            />
          ))}
      </group>
    </>
  );
}
function World({ cosmetic }: { cosmetic: number }) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3());
  const room = session.room;
  const state = room?.state;
  const active = state && state.phase !== 'LOBBY';
  const map = mapFor(active ? state.selectedGame : 'courtyard');
  useEffect(() => {
    let cancelled = false;
    void physicsReady.then(() => {
      if (cancelled || !room?.state.players.get(room.sessionId)) return;
      runtime?.dispose();
      runtime = new PredictionRuntime(room);
    });
    return () => {
      cancelled = true;
      runtime?.dispose();
      runtime = null;
    };
  }, [
    room,
    state?.roundId,
    session.connectionEpoch,
    active,
    !!(room && state?.players.get(room.sessionId)),
  ]);
  useFrame((_, dt) => {
    runtime?.update(performance.now());
    const p = room?.state.players.get(spectatorId || room.sessionId);
    let x = 0,
      y = 0,
      z = 0;
    if (p) {
      const v = runtime?.position(p) ?? p;
      x = v.x;
      y = v.y;
      z = v.z;
    }
    const home = !room || state?.phase === 'MATCH_RESULTS';
    if (home) {
      x = 0;
      y = 0;
      z = 0;
    }
    const arena =
      !home && active && ['kalla-manna', 'eripandhu', 'seven-stones'].includes(state.selectedGame);
    if (arena) {
      x *= 0.15;
      z *= 0.15;
      y = 0;
    }
    const target = new THREE.Vector3(
      x + (home ? 9 : 0),
      y + (home ? 8 : arena ? 18 : state?.selectedGame === 'paandi' ? 12 : 7),
      z + (home ? 13 : arena ? 17 : 9),
    );
    if (preferences.reducedMotion) camera.position.copy(target);
    else camera.position.lerp(target, 1 - Math.exp(-5 * dt));
    look.current.lerp(new THREE.Vector3(x + (home ? 2.5 : 0), y + 0.65, z), 1 - Math.exp(-5 * dt));
    if (preferences.shake && !preferences.reducedMotion && p && p.stunUntil > (state?.tick ?? 0))
      camera.position.x += Math.sin(performance.now() * 0.07) * 0.055;
    camera.lookAt(look.current);
    // Impact punch from hype events: decaying random offset, plus a short FOV kick on boosts.
    if (hype.shake > 0.001) {
      const k = hype.shake * hype.shake * 0.45;
      camera.position.x += (Math.random() - 0.5) * k;
      camera.position.y += (Math.random() - 0.5) * k;
      hype.shake *= Math.exp(-7 * dt);
    }
    const perspective = camera as THREE.PerspectiveCamera;
    const me = room?.state.players.get(room.sessionId);
    const boosted = !preferences.reducedMotion && !!me && me.boostUntil > (state?.tick ?? 0);
    const fov = 47 + (boosted ? 6 : 0) + hype.fovKick * 5;
    hype.fovKick *= Math.exp(-4 * dt);
    if (Math.abs(perspective.fov - fov) > 0.05) {
      perspective.fov += (fov - perspective.fov) * (1 - Math.exp(-8 * dt));
      perspective.updateProjectionMatrix();
    }
  }, -3);
  return (
    <>
      <color attach="background" args={['#F6DDB4']} />
      <fog attach="fog" args={['#F6DDB4', 38, 90]} />
      <Sky />
      <ambientLight intensity={0.95} />
      <hemisphereLight args={['#DDF1FF', '#D8A874', 1.6]} />
      <directionalLight
        position={[10, 16, 6]}
        color="#FFE6C2"
        intensity={2.9}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-bias={-0.0003}
      />
      <Box
        position={[0, active && state.selectedGame === 'pachai-kuthirai' ? -4 : -0.55, 0]}
        size={[90, 0.4, 150]}
        color="#D9B580"
      />
      {map.boxes.map((b) =>
        b.kind === 'npc' ? (
          <Croucher key={b.id} box={b} />
        ) : (
          <Box
            key={b.id}
            position={[b.x, b.y, b.z]}
            size={[b.w, b.h, b.d]}
            color={b.color ?? (b.kind === 'ground' ? COLORS.sand : COLORS.cream)}
          />
        ),
      )}
      {active && state.selectedGame === 'kalla-manna' && <KallaGrid />}
      {active && state.selectedGame === 'pachai-kuthirai' ? (
        <>
          {raceCheckpoints.map((z, i) => (
            <group key={z}>
              <Box position={[-5.2, 1.7, z]} size={[0.22, 3.4, 0.22]} color={COLORS.blue} />
              <Box position={[5.2, 1.7, z]} size={[0.22, 3.4, 0.22]} color={COLORS.blue} />
              <Box
                position={[0, 3.4, z]}
                size={[10.6, 0.35, 0.3]}
                color={i === 3 ? COLORS.yellow : COLORS.cyan}
              />
              <Box position={[0, 0.013, z]} size={[10, 0.02, 0.3]} color={COLORS.cream} />
            </group>
          ))}
          {[-15, -36, -60, -84].map((z) => (
            <group key={z} position={[14, 0, z]}>
              <Box position={[0, 1.7, 0]} size={[4, 3.4, 6]} />
              <Box position={[0, 3.5, 0]} size={[4.5, 0.25, 6.5]} color={COLORS.terracotta} />
            </group>
          ))}
        </>
      ) : (
        <Scenery />
      )}
      {active && state.selectedGame === 'paandi' && (
        <>
          <PaandiGrid />
          <NextHop />
        </>
      )}
      {room && (
        <>
          <Aim />
          <Threat />
          {Array.from(state!.items.keys()).map((id) => (
            <ItemView key={id} id={id} />
          ))}
        </>
      )}
      {active && state.selectedGame === 'seven-stones' && (
        <Piece
          position={[0, 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          kind="ring"
          args={[1.1, 1.3, 32]}
          color={COLORS.cream}
          basic
        />
      )}
      {active && state.suddenDeath && (
        <>
          {[-1, 1].map((sign) => (
            <group key={sign}>
              <Box
                position={[0, 0.04, sign * state.boundary * 0.8]}
                size={[state.boundary * 2, 0.03, 0.12]}
                color={COLORS.coral}
              />
              <Box
                position={[sign * state.boundary, 0.04, 0]}
                size={[0.12, 0.03, state.boundary * 1.6]}
                color={COLORS.coral}
              />
            </group>
          ))}
        </>
      )}
      {state?.phase === 'MATCH_RESULTS' && <Podium />}
      {!room ? (
        <>
          <Piece
            position={[0, 0.12, 0]}
            kind="cylinder"
            args={[2.1, 2.3, 0.4, 48]}
            color={COLORS.blue}
          />
          <Piece
            position={[0, 0.33, 0]}
            kind="cylinder"
            args={[2.08, 2.08, 0.04, 48]}
            color={COLORS.cream}
          />
          <group scale={1.8}>
            <Character id="hero" hero cosmetic={cosmetic} />
          </group>
        </>
      ) : (
        Array.from(state!.players.values()).map((p) => (
          <Character key={p.slotId} id={p.slotId} cosmetic={p.cosmetic} />
        ))
      )}
    </>
  );
}
export function Scene({ cosmetic = 0 }: { cosmetic?: number }) {
  const prefs = usePreferences();
  return (
    <Canvas
      shadows={prefs.quality === 'low' ? false : 'percentage'}
      dpr={
        prefs.quality === 'low'
          ? 1
          : prefs.quality === 'high'
            ? Math.min(2, devicePixelRatio)
            : Math.min(1.5, devicePixelRatio)
      }
      camera={{ position: [9, 8, 13], fov: 47 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <InstancePool>
        <Metrics />
        <RoundAudio />
        <HypeDirector />
        <World cosmetic={cosmetic} />
        <Particles />
        <Footwork />
      </InstancePool>
    </Canvas>
  );
}
