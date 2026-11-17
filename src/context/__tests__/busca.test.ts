import { describe, expect, it } from 'vitest';
import { buscaDeParams, buscaPadrao, buscaParaParams } from '../busca';
import { noites, parseISODate } from '../../lib/format';

describe('busca da tribo', () => {
  it('padrão cai numa sexta, 3 noites, 2 adultos', () => {
    const b = buscaPadrao('2026-11-16');
    expect(parseISODate(b.checkIn).getDay()).toBe(5);
    expect(b.checkIn >= '2026-11-30').toBe(true);
    expect(noites(b.checkIn, b.checkOut)).toBe(3);
    expect(b.adultos).toBe(2);
    expect(b.idadesCriancas).toEqual([]);
  });

  it('ida e volta pela URL', () => {
    const b = { checkIn: '2026-12-11', checkOut: '2026-12-14', adultos: 3, idadesCriancas: [4, 9], categoria: ['FAMILIA' as const] };
    const qs = buscaParaParams(b);
    expect(qs).toContain('idadesCriancas=4%2C9');
    expect(buscaDeParams(new URLSearchParams(qs), buscaPadrao('2026-11-16'))).toEqual(b);
  });

  it('parâmetros ausentes ou inválidos ficam com a busca base', () => {
    const base = buscaPadrao('2026-11-16');
    const b = buscaDeParams(new URLSearchParams('adultos=abc&idadesCriancas=3,x'), base);
    expect(b.adultos).toBe(base.adultos);
    expect(b.idadesCriancas).toEqual([3]);
    expect(b.checkIn).toBe(base.checkIn);
  });
});
