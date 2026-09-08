import { preferences } from './preferences';
let context: AudioContext | undefined,
  musicClock: ReturnType<typeof setInterval> | undefined,
  note = 0;
export async function activateAudio() {
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') await context.resume();
    if (!musicClock)
      musicClock = setInterval(() => {
        if (document.hidden || !preferences.music) return;
        const melody = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23];
        tone(melody[note++ % melody.length], 0.22, preferences.music * 0.11, 'triangle');
      }, 480);
  } catch {
    /* Audio is optional when a browser refuses activation. */
  }
}
function tone(freq: number, duration: number, volume: number, type: OscillatorType = 'sine') {
  if (!context || context.state !== 'running' || !preferences.master) return;
  const osc = context.createOscillator(),
    gain = context.createGain(),
    now = context.currentTime;
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume * preferences.master, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}
export const audioDiagnostics: Record<string, number> = {};
export function sound(
  event:
    | 'click'
    | 'jump'
    | 'land'
    | 'vault'
    | 'throw'
    | 'hit'
    | 'pickup'
    | 'place'
    | 'qualify'
    | 'eliminate'
    | 'count'
    | 'finish'
    | 'warning',
) {
  if (
    document.hidden ||
    !context ||
    context.state !== 'running' ||
    !preferences.master ||
    !preferences.effects
  )
    return;
  audioDiagnostics[event] = (audioDiagnostics[event] || 0) + 1;
  const tones = {
    click: 520,
    jump: 660,
    land: 210,
    vault: 740,
    throw: 390,
    hit: 130,
    pickup: 880,
    place: 980,
    qualify: 1174,
    eliminate: 165,
    count: 440,
    finish: 1046,
    warning: 330,
  };
  tone(
    tones[event],
    event === 'finish' ? 0.65 : 0.15,
    preferences.effects * 0.22,
    event === 'hit' ? 'triangle' : 'sine',
  );
}
export function disposeAudio() {
  if (musicClock) clearInterval(musicClock);
  musicClock = undefined;
  void context?.close();
  context = undefined;
}
