import { preferences } from './preferences';
let context: AudioContext | undefined,
  musicClock: ReturnType<typeof setTimeout> | undefined,
  note = 0,
  intensity = 0;
const melody = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23];
const bass = [130.81, 130.81, 146.83, 174.61];
// 0 = relaxed, 1 = final seconds or last two standing, 2 = sudden death.
export function setIntensity(level: number) {
  intensity = level;
}
function playMusic() {
  musicClock = setTimeout(playMusic, [480, 360, 300][intensity] ?? 480);
  if (document.hidden || !preferences.music) return;
  const i = note++;
  tone(
    melody[i % melody.length] * (intensity === 2 ? 0.94 : 1),
    0.22,
    preferences.music * 0.11,
    'triangle',
  );
  if (intensity && i % 2 === 0)
    tone(bass[(i / 2) % bass.length], 0.18, preferences.music * 0.16, 'square');
}
export async function activateAudio() {
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') await context.resume();
    if (!musicClock) playMusic();
  } catch {
    /* Audio is optional when a browser refuses activation. */
  }
}
function tone(
  freq: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
  delay = 0,
  slide = 0,
) {
  if (!context || context.state !== 'running' || !preferences.master) return;
  const osc = context.createOscillator(),
    gain = context.createGain(),
    now = context.currentTime + delay;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), now + duration);
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
    | 'warning'
    | 'reward'
    | 'go'
    | 'tick'
    | 'stinger'
    | 'fanfare'
    | 'whoosh',
  level = 1,
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
  const volume = preferences.effects * 0.22;
  switch (event) {
    case 'reward': {
      // Arpeggio climbs with the combo multiplier so chains sound like they are building.
      const root = 523.25 * Math.pow(2, (Math.min(5, level) - 1) / 6);
      [1, 1.25, 1.5].forEach((ratio, i) =>
        tone(root * ratio, 0.12, volume * 0.8, 'square', i * 0.055),
      );
      return;
    }
    case 'go':
      tone(523.25, 0.12, volume, 'square');
      tone(1046.5, 0.35, volume, 'square', 0.1);
      return;
    case 'tick':
      tone(level <= 3 ? 880 : 660, 0.08, volume * (level <= 3 ? 1 : 0.6), 'square');
      tone(90, 0.12, volume * 1.2, 'sine', 0, 0.6);
      return;
    case 'stinger':
      [392, 370, 349.23, 330].forEach((f, i) => tone(f, 0.16, volume, 'sawtooth', i * 0.09));
      return;
    case 'fanfare':
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(f, i === 3 ? 0.55 : 0.14, volume, 'square', i * 0.09),
      );
      return;
    case 'whoosh':
      tone(1400, 0.22, volume * 0.7, 'sawtooth', 0, 0.25);
      return;
    case 'hit':
      tone(160, 0.2, volume * 1.3, 'square', 0, 0.4);
      return;
    case 'eliminate':
      tone(330, 0.5, volume, 'sawtooth', 0, 0.3);
      return;
  }
  const tones = {
    click: 520,
    jump: 660,
    land: 210,
    vault: 740,
    throw: 390,
    pickup: 880,
    place: 980,
    qualify: 1174,
    count: 440,
    finish: 1046,
    warning: 330,
  };
  tone(tones[event], event === 'finish' ? 0.65 : 0.15, volume, 'sine');
}
export function disposeAudio() {
  if (musicClock) clearTimeout(musicClock);
  musicClock = undefined;
  void context?.close();
  context = undefined;
}
