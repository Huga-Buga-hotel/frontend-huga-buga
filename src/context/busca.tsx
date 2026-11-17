import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { addDays, hojeISO, noites as calcNoites, parseISODate, toISODate } from '../lib/format';
import type { CategoriaCaverna } from '../api/types';

/** Busca da tribo: datas, adultos e idades das crianças. Compartilhada por home, lista, detalhe e checkout. */
export interface Busca {
  checkIn: string;
  checkOut: string;
  adultos: number;
  idadesCriancas: number[];
  categoria: CategoriaCaverna[];
}

const K = 'hb.busca';

/** Padrão: próxima sexta daqui a ~2 semanas, 3 noites, 2 adultos. */
export function buscaPadrao(hoje = hojeISO()): Busca {
  const d = parseISODate(addDays(hoje, 14));
  const ate5 = (5 - d.getDay() + 7) % 7; // sexta
  d.setDate(d.getDate() + ate5);
  const checkIn = toISODate(d);
  return { checkIn, checkOut: addDays(checkIn, 3), adultos: 2, idadesCriancas: [], categoria: [] };
}

function carregar(): Busca {
  const padrao = buscaPadrao();
  try {
    const raw = localStorage.getItem(K);
    if (!raw) return padrao;
    const b = { ...padrao, ...(JSON.parse(raw) as Partial<Busca>) };
    // datas antigas voltam ao padrão
    if (b.checkIn <= hojeISO() || calcNoites(b.checkIn, b.checkOut) < 1) return { ...b, checkIn: padrao.checkIn, checkOut: padrao.checkOut };
    return b;
  } catch {
    return padrao;
  }
}

/** Lê a busca de parâmetros de URL (?checkIn=&checkOut=&adultos=&idadesCriancas=6,9&categoria=FAMILIA). */
export function buscaDeParams(p: URLSearchParams, base: Busca): Busca {
  const checkIn = p.get('checkIn') ?? base.checkIn;
  const checkOut = p.get('checkOut') ?? base.checkOut;
  const adultos = Number(p.get('adultos') ?? base.adultos) || base.adultos;
  const idadesRaw = p.get('idadesCriancas');
  const idadesCriancas = idadesRaw != null ? idadesRaw.split(',').filter(Boolean).map(Number).filter((n) => !Number.isNaN(n)) : base.idadesCriancas;
  const catRaw = p.get('categoria');
  const categoria = catRaw != null ? (catRaw.split(',').filter(Boolean) as CategoriaCaverna[]) : base.categoria;
  return { checkIn, checkOut, adultos, idadesCriancas, categoria };
}

export function buscaParaParams(b: Busca): string {
  const p = new URLSearchParams();
  p.set('checkIn', b.checkIn);
  p.set('checkOut', b.checkOut);
  p.set('adultos', String(b.adultos));
  if (b.idadesCriancas.length) p.set('idadesCriancas', b.idadesCriancas.join(','));
  if (b.categoria.length) p.set('categoria', b.categoria.join(','));
  return p.toString();
}

interface BuscaCtx {
  busca: Busca;
  setBusca: (b: Partial<Busca>) => void;
  noites: number;
  pessoas: number;
}

const Ctx = createContext<BuscaCtx | null>(null);

export function BuscaProvider({ children }: { children: ReactNode }) {
  const [busca, setState] = useState<Busca>(carregar);
  const setBusca = useCallback((b: Partial<Busca>) => {
    setState((prev) => {
      const next = { ...prev, ...b };
      try { localStorage.setItem(K, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);
  const value = useMemo(() => ({
    busca,
    setBusca,
    noites: calcNoites(busca.checkIn, busca.checkOut),
    pessoas: busca.adultos + busca.idadesCriancas.length,
  }), [busca, setBusca]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBusca() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useBusca fora do BuscaProvider');
  return c;
}
