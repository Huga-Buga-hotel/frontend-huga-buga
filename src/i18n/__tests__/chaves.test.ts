import { describe, expect, it } from 'vitest';
import pt from '../pt';
import en from '../en';
import es from '../es';

/** Lista "a.b.c" de todas as chaves e o tipo de cada valor. */
function chaves(obj: unknown, prefixo = ''): Record<string, string> {
  const out: Record<string, string> = {};
  if (Array.isArray(obj)) {
    out[prefixo] = `array:${obj.length}`;
    obj.forEach((v, i) => { if (typeof v === 'object') Object.assign(out, chaves(v, `${prefixo}[${i}]`)); });
  } else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) Object.assign(out, chaves(v, prefixo ? `${prefixo}.${k}` : k));
  } else {
    out[prefixo] = typeof obj;
  }
  return out;
}

/** Variáveis {{x}} e tags <x> de cada texto, para não quebrar interpolações. */
function marcas(obj: unknown, prefixo = ''): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof obj === 'string') {
    const vars = [...obj.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
    const tags = [...obj.matchAll(/<(\w+)>/g)].map((m) => m[1]).sort();
    out[prefixo] = `${vars.join(',')}|${tags.join(',')}`;
  } else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) Object.assign(out, marcas(v, `${prefixo}.${k}`));
  }
  return out;
}

describe.each([['en', en], ['es', es]])('tradução %s', (_nome, msgs) => {
  it('tem exatamente as mesmas chaves do português', () => {
    expect(chaves(msgs)).toEqual(chaves(pt));
  });

  it('mantém as mesmas variáveis e tags', () => {
    expect(marcas(msgs)).toEqual(marcas(pt));
  });

  it('não é cópia do português', () => {
    expect(msgs.home.titulo1).not.toBe(pt.home.titulo1);
  });
});
