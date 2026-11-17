import { useMemo, useState } from 'react';
import { Button, Icon } from '../ui/basics';
import { Counter } from '../ui/form';
import { Sheet } from '../ui/overlay';
import { useLang } from '../../hooks';
import { addDays, brl, hojeISO, noites as calcNoites, parseISODate, toISODate } from '../../lib/format';
import { faixaIdade } from '../../lib/regras';

export interface DiaInfo { disponivel: boolean; precoCentavos?: number; feriado?: boolean }

function mesesDe(base: string, n: number) {
  const d = parseISODate(base);
  return Array.from({ length: n }, (_, i) => new Date(d.getFullYear(), d.getMonth() + i, 1));
}

/** Calendário de intervalo (chegada → partida). Mostra preço e "esgotado" quando há disponibilidade. */
export function RangeCalendar({ checkIn, checkOut, onChange, info, maxDias = 365, meses = 2, onMesChange }: {
  checkIn: string | null; checkOut: string | null; onChange: (a: string | null, b: string | null) => void;
  info?: Record<string, DiaInfo>; maxDias?: number; meses?: number; onMesChange?: (primeiroDia: string) => void;
}) {
  const { t, lang } = useLang();
  const hoje = hojeISO();
  const limite = addDays(hoje, maxDias);
  const [inicio, setInicio] = useState(() => (checkIn ?? hoje).slice(0, 8) + '01');
  const [hover, setHover] = useState<string | null>(null);
  const loc = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR';
  const semana = useMemo(() => {
    const base = new Date(2026, 1, 1); // domingo
    return Array.from({ length: 7 }, (_, i) =>
      new Intl.DateTimeFormat(loc, { weekday: 'narrow' }).format(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)),
    );
  }, [loc]);

  const mover = (delta: number) => {
    const d = parseISODate(inicio);
    const novo = toISODate(new Date(d.getFullYear(), d.getMonth() + delta, 1));
    setInicio(novo);
    onMesChange?.(novo);
  };

  const clicar = (iso: string) => {
    if (!checkIn || (checkIn && checkOut) || iso <= checkIn) {
      onChange(iso, null);
    } else {
      // não deixa atravessar dia esgotado
      if (info) {
        let d = checkIn;
        while (d < iso) {
          if (info[d] && !info[d].disponivel) { onChange(iso, null); return; }
          d = addDays(d, 1);
        }
      }
      onChange(checkIn, iso);
    }
  };

  const fim = checkOut ?? (checkIn && hover && hover > checkIn ? hover : null);
  const podeVoltar = inicio > hoje.slice(0, 8) + '01';

  return (
    <div className="cal">
      <div className="cal__nav">
        <button type="button" onClick={() => mover(-1)} disabled={!podeVoltar} aria-label={t('busca.mesAnterior')}><Icon name="chevron_left" /></button>
        <span className="cal__hint">{!checkIn || checkOut ? t('busca.selecioneChegada') : t('busca.selecioneSaida')}</span>
        <button type="button" onClick={() => mover(1)} aria-label={t('busca.proximoMes')}><Icon name="chevron_right" /></button>
      </div>
      <div className="cal__months">
        {mesesDe(inicio, meses).map((m) => {
          const ano = m.getFullYear();
          const mes = m.getMonth();
          const dias = new Date(ano, mes + 1, 0).getDate();
          const offset = new Date(ano, mes, 1).getDay();
          const titulo = new Intl.DateTimeFormat(loc, { month: 'long', year: 'numeric' }).format(m);
          return (
            <div key={`${ano}-${mes}`} className="cal__month">
              <div className="cal__title">{titulo}</div>
              <div className="cal__grid" role="grid" aria-label={titulo}>
                {semana.map((w, i) => <span key={i} className="cal__w">{w}</span>)}
                {Array.from({ length: offset }, (_, i) => <span key={`e${i}`} />)}
                {Array.from({ length: dias }, (_, i) => {
                  const iso = toISODate(new Date(ano, mes, i + 1));
                  const passado = iso <= hoje;
                  const longe = iso > limite;
                  const di = info?.[iso];
                  const esgotado = di ? !di.disponivel : false;
                  const ehInicio = iso === checkIn;
                  const ehFim = iso === fim;
                  const noMeio = checkIn && fim && iso > checkIn && iso < fim;
                  const disabled = passado || longe || (esgotado && !(checkIn && !checkOut && iso > checkIn));
                  return (
                    <button
                      key={iso}
                      type="button"
                      className={`cal__d ${ehInicio || ehFim ? 'is-edge' : ''} ${noMeio ? 'is-mid' : ''} ${esgotado ? 'is-full' : ''} ${di?.feriado ? 'is-hol' : ''}`}
                      disabled={disabled}
                      onClick={() => clicar(iso)}
                      onMouseEnter={() => setHover(iso)}
                      aria-pressed={ehInicio || ehFim || undefined}
                      aria-label={`${iso}${esgotado ? ' · ' + t('busca.esgotado') : ''}${di?.feriado ? ' · ' + t('busca.feriado') : ''}`}
                    >
                      <span>{i + 1}</span>
                      {di && !passado && (
                        <small>{esgotado ? '—' : di.precoCentavos ? brl(di.precoCentavos, lang).replace('R$ ', '') : ''}</small>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Sheet de datas (estado novo a cada abertura). */
export function DatasSheet(props: Parameters<typeof DatasSheetInner>[0]) {
  return props.open ? <DatasSheetInner {...props} /> : null;
}

function DatasSheetInner({ open, onClose, checkIn, checkOut, onConfirm, info, onMesChange }: {
  open: boolean; onClose: () => void; checkIn: string; checkOut: string; onConfirm: (a: string, b: string) => void;
  info?: Record<string, DiaInfo>; onMesChange?: (primeiroDia: string) => void;
}) {
  const { t } = useLang();
  const [a, setA] = useState<string | null>(checkIn);
  const [b, setB] = useState<string | null>(checkOut);
  const n = a && b ? calcNoites(a, b) : 0;
  return (
    <Sheet open={open} onClose={onClose} label={t('busca.quandoVem')}>
      <div className="t-h5" style={{ fontSize: 26 }}>{t('busca.quandoVem')}</div>
      <RangeCalendar checkIn={a} checkOut={b} onChange={(x, y) => { setA(x); setB(y); }} info={info} meses={typeof window !== 'undefined' && window.innerWidth > 720 ? 2 : 1} onMesChange={onMesChange} />
      <div className="row between" style={{ gap: 12 }}>
        <button type="button" className="link-btn link-btn--tinta" onClick={() => { setA(null); setB(null); }}>{t('busca.limparDatas')}</button>
        <Button variant="carvao" size="md" disabled={!a || !b} onClick={() => { if (a && b) { onConfirm(a, b); onClose(); } }}>
          {n ? `${t('busca.pronto')} · ${t('comum.noites', { count: n })}` : t('busca.pronto')}
        </Button>
      </div>
    </Sheet>
  );
}

/** Sheet "quem vem": adultos, crianças e idade de cada criança. */
export function TriboSheet(props: Parameters<typeof TriboSheetInner>[0]) {
  return props.open ? <TriboSheetInner {...props} /> : null;
}

function TriboSheetInner({ open, onClose, adultos, idades, onConfirm, capacidade }: {
  open: boolean; onClose: () => void; adultos: number; idades: number[]; onConfirm: (adultos: number, idades: number[]) => void; capacidade?: number;
}) {
  const { t } = useLang();
  const [ad, setAd] = useState(adultos);
  const [ids, setIds] = useState<number[]>(idades);
  const setKids = (n: number) => setIds((prev) => (n > prev.length ? [...prev, ...Array(n - prev.length).fill(6)] : prev.slice(0, n)));
  return (
    <Sheet open={open} onClose={onClose} label={t('busca.quemVem')}>
      <div className="t-h5" style={{ fontSize: 26 }}>{t('busca.quemVem')}</div>
      <div className="tribo-row">
        <div><b>{t('busca.adultos')}</b><div className="t-muted" style={{ fontSize: 13 }}>{t('busca.adultosSub')}</div></div>
        <Counter value={ad} onChange={setAd} min={1} max={12} label={t('busca.adultos')} />
      </div>
      <div className="tribo-row">
        <div><b>{t('busca.criancas')}</b><div className="t-muted" style={{ fontSize: 13 }}>{t('busca.criancasSub')}</div></div>
        <Counter value={ids.length} onChange={setKids} min={0} max={8} label={t('busca.criancas')} />
      </div>
      {ids.length > 0 && (
        <div className="tribo-idades">
          {ids.map((idade, i) => {
            const f = faixaIdade(idade);
            return (
              <label key={i} className="field">
                <span>{t('busca.idadeCrianca', { n: i + 1 })}</span>
                <select className="select" value={idade} onChange={(e) => setIds((p) => p.map((x, j) => (j === i ? Number(e.target.value) : x)))}>
                  {Array.from({ length: 18 }, (_, n) => (
                    <option key={n} value={n}>{n === 0 ? t('busca.menos1') : t('busca.criancaIdade', { n })}</option>
                  ))}
                </select>
                {f === 'gratis' && <span className="field__help" style={{ color: 'var(--musgo)', fontWeight: 700 }}>{t('busca.idadeGratis')}</span>}
                {f === 'adulto' && <span className="field__warn">{t('busca.idadeAdulto')}</span>}
              </label>
            );
          })}
        </div>
      )}
      {capacidade !== undefined && <p className="t-muted" style={{ fontSize: 13 }}>{t('detalhe.capacidade', { n: capacidade })}</p>}
      <Button variant="carvao" size="md" block onClick={() => { onConfirm(ad, ids); onClose(); }}>{t('busca.pronto')}</Button>
    </Sheet>
  );
}
