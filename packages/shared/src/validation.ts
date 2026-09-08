import { z } from 'zod';
import { BUILD, GAME_IDS, type Format } from './config';
export const identitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .refine(
      (v) =>
        !/[\p{Cc}]/u.test(v) &&
        [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(v)].length <= 16,
      'Use 1–16 characters without control characters.',
    ),
  build: z.literal(BUILD),
  cosmetic: z.number().int().min(0).max(5).default(0),
});
export const settingsSchema = z.object({
  format: z.enum(['single', 'festival', 'knockout']),
  policy: z.enum(['host', 'shuffle', 'vote']),
  singleGame: z.enum(GAME_IDS),
  firstRace: z.enum(['pachai-kuthirai', 'paandi']),
  slots: z.number().int().min(2).max(8),
  botFill: z.boolean(),
  order: z
    .array(z.enum(GAME_IDS))
    .length(5)
    .refine((v) => new Set(v).size === 5),
});
export function rosterError(
  format: Format | string,
  game: string,
  slots: number,
  humans: number,
  botFill: boolean,
) {
  if (humans < 1) return 'At least one connected human is required.';
  if (format !== 'single' && slots !== 8) return 'Cups require exactly eight participants.';
  if (slots < humans) return 'The selected slots cannot exclude connected players.';
  if (format === 'single' && game === 'seven-stones' && ![4, 6, 8].includes(slots))
    return 'Seven Stones needs 4, 6 or 8 players in equal teams.';
  if (!botFill && humans !== slots)
    return `Waiting for ${slots - humans} more human players, or enable CPU fill.`;
  return '';
}
