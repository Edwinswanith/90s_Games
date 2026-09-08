import { useEffect, useState } from 'react';
import { runtime, renderMetrics } from './Scene';
import { session } from './network';
export function Diagnostics() {
  const [visible, setVisible] = useState(false),
    [, refresh] = useState(0);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const key = (e: KeyboardEvent) => {
      if (e.code === 'F3') {
        e.preventDefault();
        setVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => refresh((v) => v + 1), 250);
    return () => clearInterval(timer);
  }, [visible]);
  if (!visible) return null;
  const room = session.room,
    p = room?.state.players.get(room.sessionId);
  return (
    <pre
      style={{
        position: 'absolute',
        bottom: 55,
        right: 20,
        zIndex: 12,
        background: '#152347eb',
        color: '#FFF4DD',
        padding: 16,
        borderRadius: 10,
        fontSize: 11,
        pointerEvents: 'none',
      }}
    >
      DEV · F3 to hide{'\n'}
      {JSON.stringify(
        {
          position: p ? [p.x, p.y, p.z].map((v) => Number(v.toFixed(2))) : null,
          velocity: p ? [p.vx, p.vy, p.vz].map((v) => Number(v.toFixed(2))) : null,
          grounded: p?.grounded,
          serverTick: room?.state.tick,
          inputBacklog: runtime?.input.pendingCount,
          processed: runtime?.input.lastProcessed,
          correction: runtime?.sim.drift,
          fps: Math.round(renderMetrics.fps),
          drawCalls: renderMetrics.drawCalls,
        },
        null,
        2,
      )}
    </pre>
  );
}
