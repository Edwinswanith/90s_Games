export interface Box {
  id: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color?: string;
  kind?: string;
}
export interface MapDefinition {
  id: string;
  width: number;
  length: number;
  boxes: Box[];
  spawns: { x: number; z: number }[];
}
export const courtyard: MapDefinition = {
  id: 'courtyard',
  width: 20,
  length: 18,
  boxes: [
    { id: 'floor', x: 0, y: -0.3, z: 0, w: 20, h: 0.6, d: 18, kind: 'ground' },
    { id: 'back', x: 0, y: 0.6, z: -9, w: 20, h: 1.2, d: 0.4 },
    { id: 'front', x: 0, y: 0.6, z: 9, w: 20, h: 1.2, d: 0.4 },
    { id: 'left', x: -10, y: 0.6, z: 0, w: 0.4, h: 1.2, d: 18 },
    { id: 'right', x: 10, y: 0.6, z: 0, w: 0.4, h: 1.2, d: 18 },
    { id: 'step', x: -4, y: 0.1, z: -3, w: 3, h: 0.2, d: 2 },
  ],
  spawns: Array.from({ length: 8 }, (_, i) => ({
    x: ((i % 4) - 1.5) * 2,
    z: 2 + Math.floor(i / 4) * 2,
  })),
};
export const kallaCells = Array.from({ length: 36 }, (_, index) => ({
  index,
  x: ((index % 6) - 2.5) * 2.7,
  z: (Math.floor(index / 6) - 2.5) * 2.7,
  material: ((index % 6) + Math.floor(index / 6)) % 2 ? 'sand' : 'stone',
}));
export function cellAt(x: number, z: number) {
  return kallaCells.find((c) => Math.abs(c.x - x) <= 1.35 && Math.abs(c.z - z) <= 1.35);
}
export const kallaMap: MapDefinition = {
  id: 'kalla-manna',
  width: 16.2,
  length: 16.2,
  boxes: kallaCells.map((c) => ({
    id: `cell-${c.index}`,
    x: c.x,
    y: -0.2,
    z: c.z,
    w: 2.7,
    h: 0.4,
    d: 2.7,
    color: c.material === 'stone' ? '#8996A5' : '#E8C894',
    kind: c.material,
  })),
  spawns: [0, 3, 5, 12, 17, 30, 32, 35].map((i) => ({ x: kallaCells[i].x, z: kallaCells[i].z })),
};
const floor = (id: string, x: number, z: number, w: number, d: number): Box => ({
  id,
  x,
  y: -0.3,
  z,
  w,
  h: 0.6,
  d,
  kind: 'ground',
  color: '#E8C894',
});
const npcRow = (z: number, h: number, xs = [-4, -2, 0, 2, 4]): Box[] =>
  xs.map((x) => ({
    id: `npc-${z}-${x}`,
    x,
    y: h / 2,
    z,
    w: 1.9,
    h,
    d: 0.5,
    kind: 'npc',
    color: '#45C8F5',
  }));
export const raceCheckpoints = [-24, -48, -73, -99];
export const raceMap: MapDefinition = {
  id: 'pachai-kuthirai',
  width: 18,
  length: 110,
  boxes: [
    floor('race-start', 0, -20, 10, 56),
    floor('fork-in', -3, -50, 18, 4),
    floor('safe-lane', -8, -60, 4, 16),
    floor('hard-lane', 2, -60, 4, 16),
    floor('fork-out', -3, -70.5, 18, 5),
    floor('race-end', 0, -89, 10, 32),
    ...npcRow(-10, 0.55),
    ...npcRow(-18, 0.55),
    ...npcRow(-31, 0.9),
    ...npcRow(-41, 0.9),
    ...npcRow(-57, 0.55, [-9, -7]),
    ...npcRow(-62, 0.55, [-9, -7]),
    ...npcRow(-55, 1.15, [1, 3]),
    ...npcRow(-60, 1.15, [1, 3]),
    ...npcRow(-65, 1.15, [1, 3]),
    ...npcRow(-80, 0.9),
    ...npcRow(-89, 1.15),
  ],
  spawns: Array.from({ length: 8 }, (_, i) => ({
    x: ((i % 4) - 1.5) * 2,
    z: 4 + Math.floor(i / 4) * 2,
  })),
};
export const ballMap: MapDefinition = {
  id: 'eripandhu',
  width: 20,
  length: 16,
  boxes: [
    floor('yard', 0, 0, 20, 16),
    { id: 'wall-back', x: 0, y: 0.65, z: -8, w: 20, h: 1.3, d: 0.3 },
    { id: 'wall-front', x: 0, y: 0.65, z: 8, w: 20, h: 1.3, d: 0.3 },
    { id: 'wall-left', x: -10, y: 0.65, z: 0, w: 0.3, h: 1.3, d: 16 },
    { id: 'wall-right', x: 10, y: 0.65, z: 0, w: 0.3, h: 1.3, d: 16 },
    ...[-1, 1].map((sign) => ({
      id: `cover-${sign}`,
      x: sign * 6.6,
      y: 0.5,
      z: sign * 3,
      w: 2,
      h: 1,
      d: 0.7,
      kind: 'cover',
      color: '#C66F4A',
    })),
  ],
  spawns: Array.from({ length: 8 }, (_, i) => ({
    x: Math.sin((i / 8) * Math.PI * 2) * 7.4,
    z: Math.cos((i / 8) * Math.PI * 2) * 5.8,
  })),
};
export const stonesMap: MapDefinition = {
  id: 'seven-stones',
  width: 22,
  length: 18,
  boxes: [
    floor('stones-yard', 0, 0, 22, 18),
    { id: 'back-wall', x: 0, y: 0.6, z: -9, w: 22, h: 1.2, d: 0.3 },
    { id: 'front-wall', x: 0, y: 0.6, z: 9, w: 22, h: 1.2, d: 0.3 },
    { id: 'left-wall', x: -11, y: 0.6, z: 0, w: 0.3, h: 1.2, d: 18 },
    { id: 'right-wall', x: 11, y: 0.6, z: 0, w: 0.3, h: 1.2, d: 18 },
    ...[-1, 1].map((sign) => ({
      id: 'cover' + sign,
      x: sign * 7,
      y: 0.45,
      z: 0,
      w: 1,
      h: 0.9,
      d: 2,
      kind: 'cover',
      color: '#C66F4A',
    })),
  ],
  spawns: ballMap.spawns,
};
export const paandiBase = (section: number) => 4 - section * 18;
export const markerFor = (seed: number, section: number) => [2, 4, 6][((seed >>> 0) + section) % 3];
export const paandiGroup = (section: number, gate: number) => ({
  x: 0,
  z: paandiBase(section) - gate * 1.45,
  w: gate === 0 ? 3 : [3, 5, 7].includes(gate) ? 2.8 : 1.35,
  d: gate === 0 ? 1.6 : 1.3,
});
// The visible chalk border includes the 12 cm foot-position tolerance.
export function paandiSupport(section: number, x: number, z: number) {
  for (let gate = 0; gate <= 7; gate++) {
    const g = paandiGroup(section, gate);
    if (Math.abs(x - g.x) <= g.w / 2 + 0.12 && Math.abs(z - g.z) <= g.d / 2 + 0.12) return gate;
  }
  return -1;
}
export const paandiMap: MapDefinition = {
  id: 'paandi',
  width: 12,
  length: 60,
  boxes: [floor('chalk-street', 0, -22, 12, 60)],
  spawns: Array.from({ length: 8 }, (_, i) => ({
    x: ((i % 4) - 1.5) * 0.7,
    z: 4 + (Math.floor(i / 4) - 0.5) * 0.5,
  })),
};
export function mapFor(game: string): MapDefinition {
  return game === 'kalla-manna'
    ? kallaMap
    : game === 'pachai-kuthirai'
      ? raceMap
      : game === 'eripandhu'
        ? ballMap
        : game === 'seven-stones'
          ? stonesMap
          : game === 'paandi'
            ? paandiMap
            : courtyard;
}
