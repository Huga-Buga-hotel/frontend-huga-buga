/**
 * Formatação de dinheiro, datas e textos de tribo.
 * Dinheiro sempre chega da API em centavos.
 */

export type Lang = 'pt-BR' | 'en' | 'es';

const intlLocale = (lang: string) => (lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR');

/** R$ 520 · R$ 1.560 · R$ 89,90 (só mostra centavos quando existem). Sempre "R$" na frente, em qualquer idioma. */
export function brl(centavos: number | null | undefined, lang: string = 'pt-BR'): string {
  const v = (centavos ?? 0) / 100;
  const temCentavos = Math.round(centavos ?? 0) % 100 !== 0;
  const n = new Intl.NumberFormat(intlLocale(lang), {
    minimumFractionDigits: temCentavos ? 2 : 0,
    maximumFractionDigits: 2,
    // 'always': em es-ES o padrão não separa milhar com 4 dígitos (1560)
    useGrouping: 'always' as unknown as boolean,
  }).format(Math.abs(v));
  return `${v < 0 ? '−' : ''}R$ ${n}`;
}

/** Nota com uma casa: 4,8 (pt/es) ou 4.8 (en). */
export function nota(n: number | null | undefined, lang: string = 'pt-BR'): string {
  return new Intl.NumberFormat(intlLocale(lang), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n ?? 0);
}

export function numero(n: number, lang: string = 'pt-BR'): string {
  return new Intl.NumberFormat(intlLocale(lang)).format(n);
}

// ---------------------------------------------------------------------------
// Datas (strings ISO "2026-10-12" tratadas como data local, sem fuso)
// ---------------------------------------------------------------------------

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function hojeISO(): string {
  return toISODate(new Date());
}

/** Noites entre duas datas ISO. */
export function noites(checkIn: string, checkOut: string): number {
  const ms = parseISODate(checkOut).getTime() - parseISODate(checkIn).getTime();
  return Math.round(ms / 86_400_000);
}

const limpa = (s: string) => s.replace(/\./g, '').trim();
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** "Sex, 12 out" · "Fri, Oct 12" · "Vie, 12 oct" */
export function dataCurta(iso: string, lang: string = 'pt-BR'): string {
  const d = parseISODate(iso);
  const loc = intlLocale(lang);
  const wd = cap(limpa(new Intl.DateTimeFormat(loc, { weekday: 'short' }).format(d)));
  const mes = limpa(new Intl.DateTimeFormat(loc, { month: 'short' }).format(d));
  if (lang === 'en') return `${wd}, ${cap(mes)} ${d.getDate()}`;
  return `${wd}, ${d.getDate()} ${mes}`;
}

/** "12 out" · "Oct 12" */
export function diaMes(iso: string, lang: string = 'pt-BR'): string {
  const d = parseISODate(iso);
  const mes = limpa(new Intl.DateTimeFormat(intlLocale(lang), { month: 'short' }).format(d));
  return lang === 'en' ? `${cap(mes)} ${d.getDate()}` : `${d.getDate()} ${mes}`;
}

/** "12 OUT" (voucher) */
export function diaMesCaixaAlta(iso: string, lang: string = 'pt-BR'): string {
  return diaMes(iso, lang).toUpperCase();
}

/** "12 – 15 out" · "12 out – 2 nov" · "Oct 12 – 15" */
export function intervalo(checkIn: string, checkOut: string, lang: string = 'pt-BR'): string {
  const a = parseISODate(checkIn);
  const b = parseISODate(checkOut);
  const loc = intlLocale(lang);
  const mA = limpa(new Intl.DateTimeFormat(loc, { month: 'short' }).format(a));
  const mB = limpa(new Intl.DateTimeFormat(loc, { month: 'short' }).format(b));
  if (lang === 'en') {
    return a.getMonth() === b.getMonth()
      ? `${cap(mA)} ${a.getDate()} – ${b.getDate()}`
      : `${cap(mA)} ${a.getDate()} – ${cap(mB)} ${b.getDate()}`;
  }
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} – ${b.getDate()} ${mB}`
    : `${a.getDate()} ${mA} – ${b.getDate()} ${mB}`;
}

/** "SEX" · "SÁB" (seletor de dias) */
export function diaSemanaCurto(iso: string, lang: string = 'pt-BR'): string {
  return limpa(new Intl.DateTimeFormat(intlLocale(lang), { weekday: 'short' }).format(parseISODate(iso))).toUpperCase();
}

/** "Sexta" (voucher) */
export function diaSemanaLongo(iso: string, lang: string = 'pt-BR'): string {
  const s = new Intl.DateTimeFormat(intlLocale(lang), { weekday: 'long' }).format(parseISODate(iso));
  return cap(s.replace(/-feira$/, ''));
}

/** "14 de março" / "March 14" */
export function dataLonga(iso: string, lang: string = 'pt-BR', comAno = false): string {
  return new Intl.DateTimeFormat(intlLocale(lang), { day: 'numeric', month: 'long', ...(comAno ? { year: 'numeric' } : {}) }).format(
    parseISODate(iso),
  );
}

/** "19:00:00" → "19:00"; com curto=true → "19h" / "19h30" (pt/es) ou "7 PM" (en) */
export function hora(t: string, curto = false, lang: string = 'pt-BR'): string {
  const [h, m] = t.split(':');
  if (!curto) return `${h}:${m}`;
  const hh = Number(h);
  if (lang === 'en') {
    const suf = hh >= 12 ? 'PM' : 'AM';
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    return m === '00' ? `${h12} ${suf}` : `${h12}:${m} ${suf}`;
  }
  return m === '00' ? `${hh}h` : `${hh}h${m}`;
}

/** Hora local de um instante ISO ("2026-10-13T10:00:00-03:00" → "10:00"). */
export function horaDeInstante(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function dataDeInstante(isoDateTime: string): string {
  return toISODate(new Date(isoDateTime));
}

/** mm:ss para contadores (toca segura, Pix). */
export function mmss(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Duração em minutos → "1h30" · "45 min" · "2h" */
export function duracao(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/** Iniciais para o avatar ("Marina Souza" → "MS"). */
export function iniciais(nome: string | null | undefined): string {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const a = partes[0]?.[0] ?? '';
  const b = partes.length > 1 ? partes[partes.length - 1][0] : (partes[0]?.[1] ?? '');
  return (a + b).toUpperCase();
}
