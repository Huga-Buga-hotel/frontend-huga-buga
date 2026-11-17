import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/endpoints';
import { isApiError } from '../../api/client';
import { useLang } from '../../hooks';
import { Banner, Button, Icon } from '../../components/ui/basics';
import { Counter } from '../../components/ui/form';
import { ReservaShell, Resumo } from '../../components/reserva/ReservaShell';
import { brl, hora } from '../../lib/format';
import type { ExtraRes, ReservaRes } from '../../api/types';

const HORARIOS_JANTAR = ['19:00:00', '19:30:00', '20:00:00', '20:30:00', '21:00:00', '21:30:00'];

export default function ExtrasPage() {
  const { codigo = '' } = useParams();
  const { t, lang } = useLang();
  return (
    <ReservaShell codigo={codigo} passo={2} aside={(r) => <Resumo r={r} />}
      barra={(r) => (
        <>
          <div><div className="t-price" style={{ fontSize: 22 }}>{brl(r.total, lang)}</div><span style={{ fontSize: 12, color: 'var(--texto-2)' }}>{t('reserva.pegada', { n: 2 })}</span></div>
          <IrPagamento r={r} />
        </>
      )}
    >
      {(r) => <Extras r={r} />}
    </ReservaShell>
  );
}

function IrPagamento({ r, size }: { r: ReservaRes; size?: 'lg' }) {
  const { t } = useLang();
  const nav = useNavigate();
  return <Button variant="carvao" size={size} iconRight={size ? 'arrow_forward' : undefined} onClick={() => nav(`/reserva/${r.codigo}/pagamento`)}>{t('reserva.irPagamento')}</Button>;
}

function precoExtra(x: ExtraRes, t: ReturnType<typeof useLang>['t'], lang: string) {
  if (x.incluso) return t('comum.incluso');
  const v = brl(x.precoCentavos, lang);
  if (x.cobranca === 'POR_CRIANCA') return t('reserva.porCrianca', { valor: v });
  if (x.cobranca === 'POR_PESSOA') return t('reserva.porPessoa', { valor: v });
  return v;
}

function Extras({ r }: { r: ReservaRes }) {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const nav = useNavigate();
  const extras = useQuery({ queryKey: ['extras'], queryFn: api.reservas.extras, staleTime: 3_600_000 });
  const combos = useQuery({ queryKey: ['combos'], queryFn: api.restaurante.combos, staleTime: 3_600_000 });
  const [sel, setSel] = useState<Record<string, number>>(() => Object.fromEntries(r.extras.map((e) => [e.extraId, e.quantidade])));
  const [horario, setHorario] = useState(r.combo?.horario ?? '20:00:00');

  const salvarExtras = useMutation({
    mutationFn: (s: Record<string, number>) => api.reservas.salvarExtras(r.codigo, Object.entries(s).filter(([, q]) => q > 0).map(([extraId, quantidade]) => ({ extraId, quantidade }))),
    onSuccess: (nova) => qc.setQueryData(['reserva', r.codigo], nova),
  });
  const combo = useMutation({
    mutationFn: (v: { id: string | null; h: string }) => (v.id ? api.reservas.definirCombo(r.codigo, v.id, v.h) : api.reservas.removerCombo(r.codigo)),
    onSuccess: (nova) => qc.setQueryData(['reserva', r.codigo], nova),
  });
  const pular = useMutation({
    mutationFn: async () => { await api.reservas.salvarExtras(r.codigo, []); if (r.combo) await api.reservas.removerCombo(r.codigo); },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['reserva', r.codigo] }); nav(`/reserva/${r.codigo}/pagamento`); },
  });

  const maxQtd = (x: ExtraRes) => (x.cobranca === 'POR_CRIANCA' ? Math.max(1, r.criancas) : x.cobranca === 'POR_PESSOA' ? r.adultos + r.criancas : 1);
  const mudar = (x: ExtraRes, q: number) => {
    const novo = { ...sel, [x.id]: q };
    if (q <= 0) delete novo[x.id];
    setSel(novo);
    salvarExtras.mutate(novo);
  };

  const erro = [salvarExtras.error, combo.error, pular.error].find(Boolean);
  const apiErr = erro && isApiError(erro) ? erro : null;
  const lista = (extras.data ?? []).filter((x) => !(x.cobranca === 'POR_CRIANCA' && r.criancas === 0));

  return (
    <div className="stack" style={{ gap: 22 }}>
      <div>
        <div className="only-mobile" style={{ fontSize: 12, fontWeight: 800, color: 'var(--fogo)' }}>
          <span className="row" style={{ gap: 4 }}><Icon name="footprint" fill size={16} />{t('reserva.pegada', { n: 2 })}</span>
        </div>
        <h1 className="t-h1" style={{ fontSize: 48 }}>{t('reserva.titulo2')}</h1>
        <p style={{ marginTop: 8, fontSize: 16, color: 'var(--texto-corpo)' }}>{t('reserva.sub2')}</p>
      </div>
      {apiErr && <Banner kind="erro" title={apiErr.titulo}>{apiErr.message}</Banner>}

      <div className="grid-2" style={{ gap: 18 }}>
        {lista.map((x) => {
          const q = sel[x.id] ?? 0;
          const on = q > 0 || x.incluso;
          return (
            <div key={x.id} className={`extra ${q > 0 ? 'is-on' : ''}`}>
              <div className="extra__ic"><Icon name={x.icone} /></div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{x.nome}</div>
                <div style={{ fontSize: 13, color: 'var(--texto-2)' }}>{x.incluso ? t('reserva.jaIncluso') : x.descricao}</div>
                <div style={{ fontWeight: 800, marginTop: 4 }}>{precoExtra(x, t, lang)}</div>
              </div>
              {x.incluso ? (
                <Icon name="check_circle" style={{ color: 'var(--musgo)' }} size={26} />
              ) : on ? (
                <Counter box value={q} min={0} max={maxQtd(x)} onChange={(v) => mudar(x, v)} label={x.nome} />
              ) : (
                <Button variant="contorno" size="sm" onClick={() => mudar(x, maxQtd(x) > 1 && x.cobranca === 'POR_CRIANCA' ? maxQtd(x) : 1)}>{t('reserva.adicionar')}</Button>
              )}
            </div>
          );
        })}
      </div>

      {(combos.data?.length ?? 0) > 0 && (
        <section className="card panel tx-couro" style={{ gap: 14 }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--brasa)' }}>{t('comum.banquete').toUpperCase()}</div>
            <div className="t-h4">{t('reserva.comboTitulo')}</div>
            <p style={{ fontSize: 14, color: 'var(--texto-corpo)', marginTop: 6 }}>{t('reserva.comboSub')}</p>
          </div>
          <div className="grid-2" style={{ gap: 12 }}>
            {combos.data!.map((cb) => {
              const on = r.combo?.comboId === cb.id;
              return (
                <button key={cb.id} type="button" className={`extra ${on ? 'is-on' : ''}`} style={{ gridTemplateColumns: '1fr auto', textAlign: 'left' }} aria-pressed={on}
                  onClick={() => combo.mutate({ id: on ? null : cb.id, h: horario })} disabled={combo.isPending}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{cb.nome}</div>
                    <div style={{ fontSize: 13, color: 'var(--texto-2)' }}>{cb.descricao}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, marginTop: 6 }}>{t('reserva.comboAdulto', { valor: brl(cb.precoAdultoCentavos, lang) })}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--texto-2)' }}>{t('reserva.comboCrianca', { valor: brl(cb.precoCriancaCentavos, lang) })}</div>
                  </div>
                  <Icon name={on ? 'check_circle' : 'add_circle'} size={28} style={{ color: on ? 'var(--fogo)' : 'var(--pedra)' }} />
                </button>
              );
            })}
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <b style={{ fontSize: 14 }}>{t('reserva.comboHorario')}</b>
            <div className="slots" style={{ gridTemplateColumns: 'repeat(6, minmax(0,1fr))' }}>
              {HORARIOS_JANTAR.map((h) => (
                <button key={h} type="button" className={`slot ${horario === h ? 'is-on' : ''}`} onClick={() => { setHorario(h); if (r.combo) combo.mutate({ id: r.combo.comboId, h }); }}>{hora(h)}</button>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="checkout-acoes hide-mobile">
        <button type="button" className="link-btn link-btn--tinta" style={{ textDecoration: 'none' }} onClick={() => nav(`/reserva/${r.codigo}/quem-vem`)}><Icon name="arrow_back" />{t('comum.voltar')}</button>
        <div className="row" style={{ gap: 16 }}>
          <button type="button" className="link-btn link-btn--tinta" onClick={() => pular.mutate()} disabled={pular.isPending}>{t('reserva.pularExtras')}</button>
          <IrPagamento r={r} size="lg" />
        </div>
      </div>
      <div className="only-mobile"><Resumo r={r} /></div>
    </div>
  );
}
