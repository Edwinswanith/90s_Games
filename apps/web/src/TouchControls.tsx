import { tr } from './gameCopy';
import { useEffect, useRef, useState } from 'react';
import { controls, clearControls, session } from './network';
import styles from './App.module.css';
export function TouchControls() {
  const [touch, setTouch] = useState(matchMedia('(pointer:coarse)').matches),
    stick = useRef<number | null>(null),
    aim = useRef<number | null>(null);
  useEffect(() => {
    const query = matchMedia('(pointer:coarse)'),
      change = () => setTouch(query.matches);
    query.addEventListener('change', change);
    return () => {
      query.removeEventListener('change', change);
      clearControls();
    };
  }, []);
  if (!touch || !session.room) return null;
  const game = session.room.state.selectedGame;
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stick.current !== e.pointerId) return;
    const r = e.currentTarget.getBoundingClientRect(),
      dx = (e.clientX - r.left - r.width / 2) / 40,
      dz = (e.clientY - r.top - r.height / 2) / 40,
      length = Math.max(1, Math.hypot(dx, dz));
    controls.moveX = dx / length;
    controls.moveZ = dz / length;
    e.currentTarget.style.setProperty('--stick-x', `${controls.moveX * 30}px`);
    e.currentTarget.style.setProperty('--stick-y', `${controls.moveZ * 30}px`);
  };
  const release = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stick.current !== e.pointerId) return;
    stick.current = null;
    controls.moveX = controls.moveZ = 0;
    e.currentTarget.style.setProperty('--stick-x', '0px');
    e.currentTarget.style.setProperty('--stick-y', '0px');
  };
  return (
    <>
      <div
        className={styles.touchStick}
        aria-label="Movement stick"
        onPointerDown={(e) => {
          if (stick.current !== null) return;
          stick.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e);
        }}
        onPointerMove={move}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <span />
      </div>
      <div className={styles.touchButtons}>
        <button
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            controls.jump = true;
            controls.jumpPulse = true;
          }}
          onPointerUp={() => (controls.jump = false)}
          onPointerCancel={() => (controls.jump = false)}
        >
          {tr('JUMP')}
        </button>
        {!['kalla-manna', 'pachai-kuthirai'].includes(game) && (
          <button
            onPointerDown={(e) => {
              aim.current = e.pointerId;
              e.currentTarget.setPointerCapture(e.pointerId);
              controls.aiming = true;
            }}
            onPointerMove={(e) => {
              if (aim.current !== e.pointerId) return;
              const r = e.currentTarget.getBoundingClientRect(),
                x = e.clientX - r.left - r.width / 2,
                z = e.clientY - r.top - r.height / 2,
                d = Math.hypot(x, z);
              if (d > 8) {
                controls.aimX = x / d;
                controls.aimZ = z / d;
              }
            }}
            onPointerUp={(e) => {
              if (aim.current === e.pointerId) {
                controls.actionPulse = true;
                controls.aiming = false;
                aim.current = null;
              }
            }}
            onPointerCancel={() => {
              controls.aiming = false;
              aim.current = null;
            }}
          >
            {tr('ACTION')}
          </button>
        )}
      </div>
      <div className={styles.rotatePrompt}>
        <h2>{tr('Turn your phone sideways')}</h2>
        <p>{tr('Your seat stays in the party.')}</p>
      </div>
    </>
  );
}
