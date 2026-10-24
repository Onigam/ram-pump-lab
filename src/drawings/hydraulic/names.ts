import type { L } from '@onigam/lab-kit/i18n';
import { PARTS } from '../../data/parts';

/** Name of a part in the catalogue, in both languages: the sheets use the catalogue's words, never their own. */
export function partName(id: string): L {
  const part = PARTS.find((p) => p.id === id);
  if (!part) throw new Error(`hydraulic sheets: no part "${id}" in the catalogue`);
  return part.name as L;
}
