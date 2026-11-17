import { describe, expect, it } from 'vitest';
import { addDays, brl, duracao, iniciais, mmss, nota, noites, parseISODate, toISODate } from '../format';

describe('dinheiro', () => {
  it('formata centavos em reais, sem casas quando o valor é inteiro', () => {
    expect(brl(52000)).toBe('R$ 520');
    expect(brl(156000)).toBe('R$ 1.560');
    expect(brl(8990)).toBe('R$ 89,90');
    expect(brl(null)).toBe('R$ 0');
    expect(brl(156000, 'en')).toBe('R$ 1,560');
    expect(brl(61000, 'es')).toBe('R$ 610');
    expect(brl(156000, 'es')).toBe('R$ 1.560');
  });

  it('nota com uma casa no formato do idioma', () => {
    expect(nota(4.8)).toBe('4,8');
    expect(nota(4.8, 'en')).toBe('4.8');
  });
});

describe('datas', () => {
  it('lê e escreve datas ISO sem fuso', () => {
    expect(toISODate(parseISODate('2026-12-31'))).toBe('2026-12-31');
  });

  it('soma dias atravessando mês e ano', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('conta noites', () => {
    expect(noites('2026-11-20', '2026-11-23')).toBe(3);
    expect(noites('2026-12-31', '2027-01-01')).toBe(1);
  });
});

describe('textos curtos', () => {
  it('contador mm:ss nunca fica negativo', () => {
    expect(mmss(125)).toBe('02:05');
    expect(mmss(-4)).toBe('00:00');
  });

  it('duração em minutos', () => {
    expect(duracao(45)).toBe('45 min');
    expect(duracao(90)).toBe('1h30');
    expect(duracao(120)).toBe('2h');
  });

  it('iniciais para o avatar', () => {
    expect(iniciais('Marina Souza')).toBe('MS');
    expect(iniciais('Ugo')).toBe('UG');
    expect(iniciais(null)).toBe('?');
  });
});
