import { describe, expect, it } from 'vitest';
import { enTypo, frTypo } from '@onigam/lab-kit/i18n';

const NBSP = ' ';
const NNBSP = ' ';

// The kit applies the typography when a text is resolved; the lab's strings stay plain.
describe('French and English typography of the kit', () => {
  it('glues the French punctuation, numbers and units', () => {
    expect(frTypo('Attention : 7,5 m de chute ; 65 m ! Vraiment ?')).toBe(
      `Attention${NBSP}: 7,5${NBSP}m de chute${NNBSP}; 65${NBSP}m${NNBSP}! Vraiment${NNBSP}?`,
    );
    expect(frTypo('« exact » pour le clapet n° 1 : 5 700 L')).toBe(
      `«${NBSP}exact${NBSP}» pour le clapet n°${NBSP}1${NBSP}: 5${NNBSP}700${NBSP}L`,
    );
  });

  it('leaves times, addresses and templates alone, and is idempotent', () => {
    const plain = 'À 08:00, voir https://example.org/a:b et {value} m/s';
    expect(frTypo(plain)).toBe(`À 08:00, voir https://example.org/a:b et {value}${NBSP}m/s`);
    expect(frTypo(frTypo(plain))).toBe(frTypo(plain));
  });

  it('glues number and unit in English, and No. and its number', () => {
    expect(enTypo('The fall is 7.5 m: valve No. 1, 500 L.')).toBe(
      `The fall is 7.5${NBSP}m: valve No.${NBSP}1, 500${NBSP}L.`,
    );
  });
});
