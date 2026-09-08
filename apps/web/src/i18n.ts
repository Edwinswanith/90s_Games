import { preferences } from './preferences';
// Tamil UI and game translations are draft translations pending a native-speaker review.
const strings = {
  create: ['Create a party', 'விளையாட்டுக் குழு உருவாக்கு'],
  join: ['Join with a code', 'குறியீட்டுடன் சேருங்கள்'],
  practice: ['Practise a game with CPUs', 'கணினி வீரர்களுடன் பயிற்சி'],
  ready: ['Ready to play', 'விளையாடத் தயார்'],
  start: ['Start match', 'போட்டியைத் தொடங்கு'],
  back: ['Back to the courtyard', 'மைதானத்திற்குத் திரும்பு'],
  settings: ['Your corner.', 'உங்கள் விருப்பங்கள்.'],
  name: ['YOUR NAME', 'உங்கள் பெயர்'],
  games: ['Games', 'விளையாட்டுகள்'],
  wardrobe: ['Wardrobe', 'ஆடைகள்'],
  play: ['Play', 'விளையாடு'],
  language: ['Language', 'மொழி'],
  master: ['Master volume', 'மொத்த ஒலி'],
  music: ['Music', 'இசை'],
  effects: ['Effects', 'விளையாட்டு ஒலி'],
  quality: ['Graphics', 'காட்சித் தரம்'],
  motion: ['Reduced motion', 'குறைந்த அசைவு'],
  shake: ['Screen shake', 'திரை அதிர்வு'],
  section: ['SECTION', 'பகுதி'],
  outward: ['OUTWARD', 'வெளிப்பயணம்'],
  return: ['RETURN', 'திரும்புக'],
  loading: ['Loading…', 'ஏற்றுகிறது…'],
} as const;
export function t(key: keyof typeof strings) {
  return strings[key][preferences.language === 'ta' ? 1 : 0];
}
