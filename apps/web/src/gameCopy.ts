import type { GameId } from '../../../packages/shared/src/config';
import { preferences } from './preferences';

// Draft Tamil copy: all essential controls, round instructions and failure feedback
// live here so native-speaker review can edit wording without changing game rules.
const tamil: Record<string, string> = {
  'Time limit: remaining survivors share their places.':
    'நேரம் முடிந்தது. மீதமுள்ள வீரர்கள் சம இடம் பெறுகிறார்கள்.',
  'Survival time determines placement.':
    'நிலைத்திருந்த நேரத்தின் அடிப்படையில் இடங்கள் வழங்கப்படுகின்றன.',
  'Finishers rank by crossing time; others by validated route progress.':
    'முடித்தவர்களுக்கு இலக்கைக் கடந்த நேரத்தின்படியும், மற்றவர்களுக்கு முறையாகக் கடந்த பாதையின்படியும் இடம் வழங்கப்படுகிறது.',
  'Finishers rank by crossing time; others by validated section and gate progress.':
    'முடித்தவர்களுக்கு இலக்கைக் கடந்த நேரத்தின்படியும், மற்றவர்களுக்கு முறையாக முடித்த பகுதிகள் மற்றும் கட்டங்களின்படியும் இடம் வழங்கப்படுகிறது.',
  'Last survivors win; simultaneous final eliminations share the result.':
    'கடைசியாக நிலைத்திருப்பவர்கள் வெற்றி பெறுகிறார்கள். இறுதியில் ஒரே நேரத்தில் வெளியேறினால் முடிவு சமமாகும்.',
  'Time limit: lives, then valid hits dealt. Exact ties remain shared.':
    'நேரம் முடிந்தது. மீதமுள்ள வாய்ப்புகள், பின்னர் வெற்றிகரமான அடிகள் கணக்கிடப்படுகின்றன. இரண்டும் சமமானால் சம இடம் கிடைக்கும்.',
  'Both teams matched their building performance. A draw.':
    'இரு அணிகளும் சமமாகக் கற்களை அடுக்கின. போட்டி சமநிலையில் முடிந்தது.',
  'More stones wins; equal positive counts use the earlier progress time.':
    'அதிகக் கற்களை அடுக்கிய அணி வெற்றி பெறும். கற்கள் சமமாக இருந்தால் விரைவாக அடுக்கிய அணி வெற்றி பெறும்.',
  'Total points across five rounds. Equal totals share the title.':
    'ஐந்து சுற்றுகளின் மொத்தப் புள்ளிகள். மொத்தம் சமமானால் வெற்றி பகிரப்படும்.',
  'Move · Jump': 'நகர்க · குதிக்க',
  'Move · Jump / vault': 'நகர்க · குதிக்க / தாண்டுக',
  'Move · Jump · E pick up / throw · Mouse aim':
    'நகர்க · குதிக்க · E எடுக்க / எறிய · சுட்டியால் குறிவைக்க',
  'Move · Jump · E pick up / place / throw': 'நகர்க · குதிக்க · E எடுக்க / அடுக்க / எறிய',
  'Move · Jump · E retrieve': 'நகர்க · குதிக்க · E குறியை எடுக்க',
  'CHOOSE THE NEXT COURTYARD': 'அடுத்த விளையாட்டைத் தேர்ந்தெடுங்கள்',
  'What shall we play?': 'என்ன விளையாடலாம்?',
  'You can change your vote until the timer ends.': 'நேரம் முடியும் வரை உங்கள் வாக்கை மாற்றலாம்.',
  votes: 'வாக்குகள்',
  'Ties and empty votes use a server-seeded choice.':
    'வாக்குகள் சமமானால் அல்லது வாக்குகள் இல்லாவிட்டால், விளையாட்டு சீரற்ற முறையில் தேர்ந்தெடுக்கப்படும்.',
  'PREPARING THE COURTYARD': 'மைதானம் தயாராகிறது',
  ROUND: 'சுற்று',
  SURVIVAL: 'நிலைத்திருத்தல்',
  RACE: 'பந்தயம்',
  ELIMINATION: 'வெளியேற்றம்',
  'TEAM PLAY': 'அணி விளையாட்டு',
  PRECISION: 'துல்லியம்',
  'Loading…': 'ஏற்றுகிறது…',
  'Up next': 'அடுத்து',
  'Get ready': 'தயாராகுங்கள்',
  'Digital adaptation': 'மின்னணு வடிவம்',
  'You return in every round.': 'ஒவ்வொரு சுற்றிலும் மீண்டும் விளையாடுவீர்கள்.',
  'Target {count} qualifiers': 'தகுதிபெறும் இலக்கு: {count} வீரர்கள்',
  'Play for the best round result.': 'இந்தச் சுற்றில் சிறந்த இடத்தைப் பெற விளையாடுங்கள்.',
  'THE STREET HAS SPOKEN': 'போட்டி முடிந்தது',
  'ROUND COMPLETE': 'சுற்று முடிந்தது',
  'A shared celebration!': 'வெற்றியைக் கொண்டாடுவோம்!',
  'Nicely played!': 'நன்றாக விளையாடினீர்கள்!',
  'Tied for the last spot: the whole group advances.':
    'கடைசி இடத்தில் சமநிலை: அந்தக் குழுவினர் அனைவரும் முன்னேறுவார்கள்.',
  '{count} players advance.': '{count} வீரர்கள் முன்னேறுகிறார்கள்.',
  '◆ Ocean': '◆ கடல்',
  '▲ Mango': '▲ மாம்பழம்',
  stones: 'கற்கள்',
  'No progress': 'முன்னேற்றம் இல்லை',
  TIED: 'சமநிலை',
  'Round-by-round points': 'ஒவ்வொரு சுற்றின் புள்ளிகள்',
  Player: 'வீரர்',
  'Back to lobby · play again': 'மைதானத்திற்குத் திரும்பு · மீண்டும் விளையாடு',
  'Waiting for the host': 'குழுத் தலைவருக்காகக் காத்திருக்கிறது',
  'Leave party': 'குழுவிலிருந்து வெளியேறு',
  'Next screen in {count}s': '{count} வினாடிகளில் அடுத்த திரை',
  'IN PLAY': 'விளையாடுகிறார்கள்',
  'TAKE A BREATH': 'சிறிது ஓய்வு',
  'REACH THE HIGHLIGHTED TILES': 'ஒளிரும் கட்டங்களை அடையுங்கள்',
  'STAY SAFE': 'பாதுகாப்பான கட்டத்தில் இருங்கள்',
  'Next call soon': 'அடுத்த அறிவிப்பு விரைவில்',
  '◆ STONE': '◆ கல்',
  '● SAND': '● மண்',
  WAVE: 'அறிவிப்பு',
  'SUDDEN DEATH · ONE HIT': 'இறுதிக்கட்டம் · ஒரு அடியில் வெளியேற்றம்',
  'HOLD MOUSE TO AIM · RELEASE TO THROW': 'சுட்டியை அழுத்திக் குறிவைக்கவும் · விடுவித்து எறியவும்',
  'E / CLICK NEAR A BALL TO PICK UP': 'பந்தின் அருகில் E / சொடுக்கி எடுக்கவும்',
  PROTECTED: 'தற்காலிகப் பாதுகாப்பு',
  'CHECKPOINTS · SPACE NEAR AN NPC TO VAULT':
    'சோதனைப் புள்ளிகள் · குனிந்த வீரரின் அருகில் SPACE அழுத்தித் தாண்டுக',
  'HEAT {count} OF 2': 'ஆட்டம் {count} / 2',
  'SWAP ROLES': 'அணிகளின் பங்குகள் மாறுகின்றன',
  'SCRIPTED KNOCKDOWN': 'கற்கள் சிதறுகின்றன',
  'YOU ARE A BUILDER': 'நீங்கள் கற்களை அடுக்கும் அணியில் உள்ளீர்கள்',
  'YOU ARE A DEFENDER': 'நீங்கள் தடுக்கும் அணியில் உள்ளீர்கள்',
  '◆ OCEAN TEAM': '◆ கடல் அணி',
  '▲ MANGO TEAM': '▲ மாம்பழ அணி',
  'BRING YOUR STONE TO THE STACK · E TO PLACE':
    'கல்லை வட்டத்திற்குக் கொண்டு வாருங்கள் · E அழுத்தி அடுக்குங்கள்',
  'PICK UP A STONE WITH E': 'E அழுத்திக் கல்லை எடுங்கள்',
  'PICK UP A BALL · AIM AND THROW': 'பந்தை எடுத்துக் குறிவைத்து எறியுங்கள்',
  'FOLLOW THE SIDE PATH TO FINISH': 'பக்கப் பாதையில் சென்று இலக்கை அடையுங்கள்',
  'RETURN · NEXT {gate} · {marker}': 'திரும்புக · அடுத்து {gate} · {marker}',
  'MARKER RETRIEVED': 'குறி எடுக்கப்பட்டது',
  'E BESIDE THE MARKER TO RETRIEVE': 'குறியின் அருகில் E அழுத்தி எடுங்கள்',
  'OUTWARD · NEXT {gate} · SKIP THE MARKER':
    'வெளிப்பயணம் · அடுத்து {gate} · குறியுள்ள கட்டத்தைத் தாண்டுங்கள்',
  START: 'தொடக்கம்',
  'Land your feet inside the chalk edge · 12 cm tolerance':
    'கால்களைச் சுண்ணாம்பு எல்லைக்குள் பதியுங்கள் · 12 செ.மீ. வரை சலுகை',
  'You return next round.': 'அடுத்த சுற்றில் மீண்டும் விளையாடுவீர்கள்.',
  'Out of this match.': 'இந்தப் போட்டியிலிருந்து வெளியேறிவிட்டீர்கள்.',
  'Watching the rest of the round.': 'மீதமுள்ள சுற்றைப் பார்க்கிறீர்கள்.',
  'Following {name} · Next →': '{name} பார்க்கிறீர்கள் · அடுத்து →',
  'the courtyard': 'மைதானம்',
  JUMP: 'குதி',
  ACTION: 'செயல்',
  'Turn your phone sideways': 'கைப்பேசியைக் கிடைமட்டமாகத் திருப்புங்கள்',
  'Your seat stays in the party.': 'உங்கள் இடம் குழுவில் இருக்கும்.',
  'How to play': 'விளையாடுவது எப்படி',
  'Controls and accessibility': 'கட்டுப்பாடுகளும் அணுகல்தன்மையும்',
  'Back to this section': 'இந்தப் பகுதியின் தொடக்கத்திற்குத் திரும்பினீர்கள்',
  'Skip the marked cell': 'குறியிட்ட கட்டத்தைத் தாண்டுங்கள்',
  'Land on the highlighted next group': 'ஒளிரும் அடுத்த கட்டத்தில் இறங்குங்கள்',
  'Hop between the chalk groups': 'சுண்ணாம்புக் கட்டங்களுக்கு இடையில் குதிக்க வேண்டும்',
  'Marker retrieved. Hop home.': 'குறி எடுக்கப்பட்டது. தொடக்கத்திற்குக் குதித்துச் செல்லுங்கள்.',
  'Turn back. Retrieve the marker beside it.':
    'திரும்பிச் செல்லுங்கள். குறியின் அருகில் நின்று அதை எடுங்கள்.',
  'All sections complete. Follow the side path to finish.':
    'மூன்று பகுதிகளும் முடிந்தன. பக்கப் பாதையில் இலக்கை அடையுங்கள்.',
  'Section saved. Walk to the next start.':
    'பகுதி முடிந்தது. அடுத்த தொடக்கத்திற்கு நடந்து செல்லுங்கள்.',
  'Back to your checkpoint': 'சேமித்த சோதனைப் புள்ளிக்குத் திரும்பினீர்கள்',
  'Finished!': 'இலக்கை அடைந்தீர்கள்!',
  'Checkpoint saved': 'சோதனைப் புள்ளி சேமிக்கப்பட்டது',
  'Clean vault': 'சரியாகத் தாண்டினீர்கள்',
  'Vault blocked. Reset your approach.': 'தாண்டும் பாதையில் தடை. மீண்டும் அணுகுங்கள்.',
  'Tagged! Back to the start line.': 'அடிபட்டீர்கள்! தொடக்கக் கோட்டுக்குத் திரும்புங்கள்.',
  'Tyre bump! Jump the rolling tyres.': 'டயர் மோதியது! உருளும் டயர்களைத் தாண்டுங்கள்.',
  'Stone placed': 'கல் அடுக்கப்பட்டது',
  'Hit! One life left.': 'பந்து பட்டது! ஒரு வாய்ப்பு மீதமுள்ளது.',
  'Knocked out': 'வெளியேற்றப்பட்டீர்கள்',
  'Move inside the marked boundary!': 'குறித்த எல்லைக்குள் வாருங்கள்!',
  'Sudden death! One hit eliminates.': 'இறுதிக்கட்டம்! ஒரு அடி பட்டால் வெளியேற்றம்.',
  'Out of the courtyard': 'மைதான எல்லையைத் தாண்டிவிட்டீர்கள்',
  'Wrong surface. STONE was safe.': 'தவறான கட்டம். கல் பாதுகாப்பானது.',
  'Wrong surface. SAND was safe.': 'தவறான கட்டம். மண் பாதுகாப்பானது.',
};

export function tr(english: string, values: Record<string, string | number> = {}) {
  const translated = preferences.language === 'ta' ? (tamil[english] ?? english) : english;
  return translated.replace(/\{(\w+)\}/g, (original, key: string) =>
    String(values[key] ?? original),
  );
}

const guides: Record<GameId, [string, string]> = {
  'kalla-manna': [
    'A warning names the safe surface. Land on a highlighted safe tile during the hazard. Jumping delays contact but does not grant immunity. Survivors share places at the cap.',
    'அறிவிக்கப்பட்ட பாதுகாப்பான கட்டத்திற்குச் செல்லுங்கள். ஆபத்து நேரத்தில் ஒளிரும் பாதுகாப்பான கட்டத்தில் இறங்குங்கள். குதித்துக்கொண்டிருப்பதால் நிரந்தரப் பாதுகாப்பு கிடைக்காது. நேரம் முடிந்தால் மீதமுள்ள வீரர்கள் சம இடம் பெறுவார்கள்.',
  ],
  'pachai-kuthirai': [
    'Pass four ordered checkpoints. Space near a crouching NPC attempts a vault. Rolling tyres cross the lane: jump them or get bumped back. The safe branch is longer. Unfinished racers rank by validated progress.',
    'நான்கு சோதனைப் புள்ளிகளையும் வரிசையாகக் கடக்கவும். குனிந்த வீரரின் அருகில் SPACE அழுத்தித் தாண்டவும். எளிய பாதை நீளமானது. முடிக்காதவர்களுக்கு அவர்கள் கடந்த சரியான தூரத்தின் அடிப்படையில் இடம் வழங்கப்படும்.',
  ],
  eripandhu: [
    'Pick up with E. Hold the mouse to aim, release to throw, or press E to throw toward facing. A ball damages once; brief protection follows a hit. Lives, then hits, break time-limit ties.',
    'E அழுத்திப் பந்தை எடுக்கவும். சுட்டியை அழுத்திக் குறிவைத்து, விடுவித்து எறியவும்; அல்லது E அழுத்தி எதிர்நோக்கும் திசையில் எறியவும். ஒரு பந்து ஒருமுறை மட்டுமே தாக்கும். அடிபட்டதும் சிறிது நேரம் பாதுகாப்பு கிடைக்கும். நேர முடிவில் மீதமுள்ள வாய்ப்புகள், பின்னர் வெற்றிகரமான அடிகள் கணக்கிடப்படும்.',
  ],
  'seven-stones': [
    'Builders deliver seven stones to the circle and press E to place; higher stones take longer to balance. Defenders throw balls: a tagged builder drops the stone, which bounces away, and walks back from the start line. Swap after 90 seconds; compare stone counts, then progress time.',
    'அடுக்கும் அணி ஏழு கற்களையும் வட்டத்திற்குக் கொண்டு வந்து E அழுத்தி அடுக்க வேண்டும். தடுக்கும் அணி பந்தால் அவர்களைத் தடுக்க வேண்டும். 90 வினாடிகளுக்குப் பிறகு பங்குகள் மாறும். அடுக்கிய கற்களின் எண்ணிக்கை, பின்னர் அதற்கான நேரம் ஒப்பிடப்படும்.',
  ],
  paandi: [
    'Hop on each next group, skip the marker outward, retrieve beside it on return, and complete three sections. A mistake resets only your current section.',
    'அடுத்தடுத்து ஒளிரும் கட்டங்களில் குதிக்கவும். செல்லும்போது குறியிட்ட கட்டத்தைத் தாண்டவும். திரும்பும்போது அதன் அருகில் E அழுத்திக் குறியை எடுக்கவும். மூன்று பகுதிகளையும் முடிக்கவும். தவறு செய்தால் தற்போதைய பகுதி மட்டுமே மீண்டும் தொடங்கும்.',
  ],
};
export const gameGuide = (id: GameId) => guides[id][preferences.language === 'ta' ? 1 : 0];
export const controlGuide = () =>
  preferences.language === 'ta'
    ? 'WASD / அம்புக்குறிகளால் நகருங்கள். SPACE அழுத்திக் குதிக்கவும் அல்லது தாண்டவும். E அழுத்திச் செயலைச் செய்யவும் அல்லது எதிர்நோக்கும் திசையில் எறியவும். மைதானத்தில் சுட்டியை அழுத்திக் குறிவைத்து, விடுவித்து எறியவும். F முழுத்திரை; ESC விருப்பங்களைத் திறக்கும். கைப்பேசியில் இடது வட்டம் நகர்த்தும்; குதி, செயல் பொத்தான்களைப் பயன்படுத்தவும்.'
    : 'WASD / arrows move. Space jumps or vaults. E performs an action or throws toward facing. Hold the mouse on the playground to aim, release to throw. F toggles fullscreen; Escape opens this menu. On touchscreens, use the movement stick, Jump and Action buttons.';
