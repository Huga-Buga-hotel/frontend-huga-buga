import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/endpoints';
import { isApiError } from '../../api/client';
import { useLang } from '../../hooks';
import { Badge, Banner, Button, ButtonLink, Icon, ImageSlot, Sk } from '../../components/ui/basics';
import { Tabs, TextareaField } from '../../components/ui/form';
import { Modal, ModalIcon, useToast } from '../../components/ui/overlay';
import { EmptyState, ErrorState } from '../../components/ui/states';
import { DatasSheet } from '../../components/busca/Pickers';
import { addDays, brl, dataCurta, diaMes, diaSemanaCurto, hojeISO, hora, horaDeInstante, intervalo } from '../../lib/format';
import { CHECKIN_ONLINE_DIAS, MAX_FOTO_BYTES, MAX_FOTOS_RELATO, PRAZO_CANCELAR_DIAS, seloStatus } from '../../lib/regras';
import type { ReservaResumoRes } from '../../api/types';

type Aba = 'proximas' | 'passadas' | 'canceladas';
const ICONE: Record<string, string> = { CONFIRMADA: 'check_circle', PENDENTE: 'schedule', AGUARDANDO_PAGAMENTO: 'schedule', CANCELADA: 'cancel', EXPIRADA: 'cancel', CONCLUIDA: 'hotel' };

export default function MinhasReservasPage() {
  const { t, lang } = useLang();
  const [aba, setAba] = useState<Aba>('proximas');
  const q = useQuery({ queryKey: ['me', 'reservas', aba], queryFn: () => api.me.reservas(aba) });
  const [cancelar, setCancelar] = useState<ReservaResumoRes | null>(null);
  const [alterar, setAlterar] = useState<ReservaResumoRes | null>(null);
  const [avaliar, setAvaliar] = useState<ReservaResumoRes | null>(null);
  const qc = useQueryClient();
  const toast = useToast();
  const cont = q.data?.contagem ?? {};
  const label = (a: Aba) => (cont[a] != null ? t('minhas.abaN', { aba: t(`minhas.abas.${a}`), n: cont[a] }) : t(`minhas.abas.${a}`));

  const alterarM = useMutation({
    mutationFn: (v: { codigo: string; a: string; b: string }) => api.reservas.alterarDatas(v.codigo, v.a, v.b),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['me', 'reservas'] });
      const d = res.diferencaCentavos;
      toast({ kind: 'ok', title: t('minhas.alteradaOk'), text: d > 0 ? t('minhas.diferencaPagar', { valor: brl(d, lang) }) : d < 0 ? t('minhas.diferencaDevolver', { valor: brl(-d, lang) }) : undefined });
    },
    onError: (e) => toast({ kind: 'erro', title: isApiError(e) ? (e.titulo ?? 'Ugh!') : 'Ugh!', text: (e as Error).message }),
  });

  const estadias = q.data?.estadias ?? [];
  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 64 }}>
      <div className="stack" style={{ gap: 24 }}>
        <div className="row between" style={{ alignItems: 'flex-end', gap: 16 }}>
          <h1 className="t-h1" style={{ fontSize: 56 }}>{t('minhas.titulo')}</h1>
          <ButtonLink to="/cavernas" variant="carvao" size="sm" icon="add" className="hide-mobile" style={{ boxShadow: 'none' }}>{t('minhas.nova')}</ButtonLink>
        </div>
        <Tabs value={aba} onChange={setAba} options={(['proximas', 'passadas', 'canceladas'] as Aba[]).map((a) => ({ value: a, label: label(a) }))} />
        {q.isLoading && <Sk h={230} />}
        {q.isError && <ErrorState erro={q.error} onRetry={() => q.refetch()} compacto />}
        {q.isSuccess && estadias.length === 0 && (q.data.mesas.length === 0) && (
          <EmptyState img={t('minhas.vazioImg')} titulo={t('minhas.vazioTitulo')} texto={t('minhas.vazioTexto')}>
            <ButtonLink to="/cavernas" variant="fogo" size="lg">{t('minhas.explorar')}</ButtonLink>
            <Link to="/buscar-reserva" style={{ fontSize: 13, fontWeight: 700, textDecoration: 'underline', color: 'var(--carvao)' }}>{t('minhas.semConta')}</Link>
          </EmptyState>
        )}
        {estadias.map((r) => (r.status === 'CONFIRMADA' ? (
          <CardConfirmada key={r.codigo} r={r} onCancelar={() => setCancelar(r)} onAlterar={() => setAlterar(r)} />
        ) : (
          <CardMini key={r.codigo} r={r} onAvaliar={() => setAvaliar(r)} />
        )))}
        {(q.data?.mesas.length ?? 0) > 0 && (
          <section className="stack" style={{ gap: 12 }}>
            <h2 className="t-h4">{t('minhas.mesas')}</h2>
            {q.data!.mesas.map((m) => (
              <div key={m.codigo} className="card row between" style={{ padding: '12px 16px', gap: 12, borderRadius: 'var(--r-card-m1)' }}>
                <div className="row" style={{ gap: 12 }}>
                  <span className="avatar-member"><Icon name="restaurant" /></span>
                  <div><b>{dataCurta(m.data, lang)}</b><div style={{ fontSize: 13, color: 'var(--texto-2)' }}>{t('minhas.mesaPara', { n: m.pessoas, h: hora(m.horario, true, lang) })} · <span className="mono">{m.codigo}</span></div></div>
                </div>
                <Badge kind={m.status === 'CONFIRMADA' ? 'ok' : m.status === 'PENDENTE' ? 'wait' : 'err'}>{t(`comum.statusMesa.${m.status}`)}</Badge>
              </div>
            ))}
          </section>
        )}
      </div>
      {cancelar && <CancelarModal r={cancelar} onClose={() => setCancelar(null)} />}
      {alterar && (
        <DatasSheet open onClose={() => setAlterar(null)} checkIn={alterar.checkIn} checkOut={alterar.checkOut}
          onConfirm={(a, b) => alterarM.mutate({ codigo: alterar.codigo, a, b })} />
      )}
      {avaliar && <AvaliarModal r={avaliar} onClose={() => setAvaliar(null)} />}
    </div>
  );
}

function CardConfirmada({ r, onCancelar, onAlterar }: { r: ReservaResumoRes; onCancelar: () => void; onAlterar: () => void }) {
  const { t, lang } = useLang();
  const ag = useQuery({ queryKey: ['agendamentos', r.codigo], queryFn: () => api.atividades.agendamentos(r.codigo) });
  const dias = r.diasParaCheckIn ?? 0;
  const libera = Math.max(0, dias - CHECKIN_ONLINE_DIAS);
  const podeAlterar = r.checkIn > addDays(hojeISO(), PRAZO_CANCELAR_DIAS - 1);
  return (
    <article className="card card--l minhas-card">
      <div className="minhas-card__img" style={{ height: 230 }}>
        <ImageSlot caption={r.cavernaNome} mask="lasca" className="hide-mobile" />
        <ImageSlot caption={r.cavernaNome} className="only-mobile" />
        <span className="tag tag--caverna only-mobile" style={{ position: 'absolute', right: 10, top: 10 }}>{dias === 0 ? t('minhas.hoje') : t('minhas.emDias', { count: dias })}</span>
      </div>
      <div className="stack minhas-card__body" style={{ gap: 12, padding: '8px 0' }}>
        <div className="row" style={{ gap: 8 }}>
          <Badge kind="ok" icon="check_circle">{t('comum.status.CONFIRMADA')}</Badge>
          <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--texto-2)' }}>{r.codigo}</span>
        </div>
        <Link to={`/cavernas/${r.cavernaSlug}`} className="t-h3" style={{ fontSize: 38, color: 'var(--carvao)' }}>{r.cavernaNome}</Link>
        <div className="meta" style={{ fontSize: 15, color: 'var(--texto-forte)', gap: 18 }}>
          <span><Icon name="calendar_month" style={{ color: 'var(--link)' }} />{intervalo(r.checkIn, r.checkOut, lang)} · {t('comum.noites', { count: r.noites })}</span>
          <span><Icon name="groups" style={{ color: 'var(--link)' }} />{t('comum.naTribo', { count: r.adultos + r.criancas })}</span>
        </div>
        {(ag.data ?? []).filter((a) => a.status === 'ATIVO').length > 0 && (
          <div className="chips hide-mobile">
            {ag.data!.filter((a) => a.status === 'ATIVO').map((a) => (
              <span key={a.id} className="tag tag--bege" style={{ fontSize: 13, fontWeight: 700 }}>{a.atividade} · {diaSemanaCurto(a.inicio.slice(0, 10), lang).toLowerCase()} {hora(horaDeInstante(a.inicio), true, lang)}</span>
            ))}
          </div>
        )}
        <div className="row wrap minhas-acoes-desk" style={{ marginTop: 'auto', gap: 10 }}>
          <ButtonLink to={`/reserva/${r.codigo}`} variant="carvao" size="sm" style={{ boxShadow: 'none' }}>{t('minhas.verVoucher')}</ButtonLink>
          <Button variant="contorno" size="sm" onClick={onAlterar} disabled={!podeAlterar}>{t('minhas.alterarDatas')}</Button>
          <button className="link-btn link-btn--perigo" style={{ padding: '10px 6px' }} onClick={onCancelar}>{t('minhas.cancelar')}</button>
        </div>
        <div className="minhas-acoes-m" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <ButtonLink to={`/reserva/${r.codigo}`} variant="carvao" size="sm" style={{ boxShadow: 'none' }}>{t('minhas.voucher')}</ButtonLink>
          <Button variant="contorno" size="sm" onClick={onAlterar} disabled={!podeAlterar}>{t('minhas.alterarDatas')}</Button>
          <button className="link-btn link-btn--perigo" style={{ gridColumn: 'span 2', justifyContent: 'center', padding: 6 }} onClick={onCancelar}>{t('minhas.cancelar')}</button>
        </div>
      </div>
      <div className="minhas-faltam">
        {dias === 0 ? <span className="t-price" style={{ fontSize: 56 }}>{t('minhas.hoje')}</span> : (
          <>
            <span className="eyebrow" style={{ fontSize: 12, color: 'var(--tocha)' }}>{t('minhas.faltam')}</span>
            <span className="t-price" style={{ fontSize: 88, lineHeight: .9 }}>{dias}</span>
            <span style={{ fontWeight: 700 }}>{t('minhas.diasPraCaverna', { count: dias })}</span>
          </>
        )}
        <span className="row" style={{ marginTop: 10, fontSize: 13, color: 'var(--osso-2)', gap: 4 }}>
          <Icon name="how_to_reg" size={16} />{libera > 0 ? t('minhas.checkinLibera', { count: libera }) : t('minhas.checkinAberto')}
        </span>
      </div>
    </article>
  );
}

function CardMini({ r, onAvaliar }: { r: ReservaResumoRes; onAvaliar: () => void }) {
  const { t, lang } = useLang();
  const aguardando = r.status === 'PENDENTE' || r.status === 'AGUARDANDO_PAGAMENTO';
  return (
    <article className="card minhas-mini">
      <div style={{ height: 110 }}><ImageSlot caption={r.cavernaNome} radius={12} /></div>
      <div className="stack" style={{ gap: 6 }}>
        <Badge kind={seloStatus(r.status)} icon={ICONE[r.status]}>{t(`comum.status.${r.status}`)}</Badge>
        <div className="t-h5" style={{ fontSize: 26 }}>{r.cavernaNome}</div>
        <div style={{ fontSize: 14, color: 'var(--texto-2)' }}>{intervalo(r.checkIn, r.checkOut, lang)} · {t('comum.naTribo', { count: r.adultos + r.criancas })} · <span className="mono">{r.codigo}</span></div>
      </div>
      {aguardando ? (
        <ButtonLink to={`/reserva/${r.codigo}/pagamento`} variant="fogo" size="md">
          <span className="hide-mobile">{t('minhas.pagar', { valor: brl(r.total, lang) })}</span><span className="only-mobile">{t('minhas.pagarCurto')}</span>
        </ButtonLink>
      ) : r.podeAvaliar ? (
        <Button variant="contorno" size="sm" icon="star" onClick={onAvaliar}>{t('minhas.avaliar')}</Button>
      ) : (
        <ButtonLink to={`/reserva/${r.codigo}`} variant="contorno" size="sm">{t('minhas.voucher')}</ButtonLink>
      )}
    </article>
  );
}

function CancelarModal({ r, onClose }: { r: ReservaResumoRes; onClose: () => void }) {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const toast = useToast();
  const prazo = addDays(r.checkIn, -PRAZO_CANCELAR_DIAS);
  const noPrazo = hojeISO() <= prazo;
  const m = useMutation({
    mutationFn: () => api.reservas.cancelar(r.codigo),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['me', 'reservas'] });
      const txt = res.reembolsoCentavos > 0 ? t('minhas.reembolso', { valor: brl(res.reembolsoCentavos, lang) }) : res.multaCentavos > 0 ? t('minhas.multa', { valor: brl(res.multaCentavos, lang) }) : t('minhas.semReembolso');
      toast({ kind: 'info', title: t('minhas.canceladaOk'), text: txt });
      onClose();
    },
  });
  const err = m.error && isApiError(m.error) ? m.error : null;
  return (
    <Modal open onClose={onClose} label={t('minhas.cancelarTitulo')}>
      <ModalIcon icon="help" kind="fogo" />
      <div className="modal__title" style={{ fontSize: 28 }}>{t('minhas.cancelarTitulo')}</div>
      <p className="modal__text" style={{ fontSize: 14 }}>
        {noPrazo
          ? (r.pago ? t('minhas.cancelarGratis', { data: diaMes(prazo, lang), valor: brl(r.total, lang) }) : t('minhas.cancelarGratisSemValor', { data: diaMes(prazo, lang) }))
          : (r.pago ? t('minhas.cancelarForaPrazo', { data: diaMes(prazo, lang) }) : t('minhas.cancelarForaPrazoChegada', { data: diaMes(prazo, lang) }))}
      </p>
      {err && <Banner kind="erro" small title={err.titulo}>{err.message}</Banner>}
      <div className="modal__actions">
        <Button variant="contorno" size="md" onClick={onClose}>{t('minhas.manter')}</Button>
        <Button variant="perigo" size="md" loading={m.isPending} onClick={() => m.mutate()}>{t('minhas.cancelar')}</Button>
      </div>
    </Modal>
  );
}

function AvaliarModal({ r, onClose }: { r: ReservaResumoRes; onClose: () => void }) {
  const { t } = useLang();
  const toast = useToast();
  const qc = useQueryClient();
  const [nota, setNota] = useState(5);
  const [texto, setTexto] = useState('');
  const [fotos, setFotos] = useState<File[]>([]);
  const [erro, setErro] = useState('');
  const m = useMutation({
    mutationFn: () => api.reservas.avaliar(r.codigo, nota, texto, fotos),
    onSuccess: () => { toast({ kind: 'ok', title: t('minhas.avaliadoOk') }); void qc.invalidateQueries({ queryKey: ['me', 'reservas'] }); onClose(); },
  });
  const escolher = (files: FileList | null) => {
    setErro('');
    const l = Array.from(files ?? []);
    const grande = l.find((f) => f.size > MAX_FOTO_BYTES);
    if (grande) { setErro(t('minhas.fotoGrande', { nome: grande.name })); return; }
    if (fotos.length + l.length > MAX_FOTOS_RELATO) { setErro(t('minhas.fotosMax')); return; }
    setFotos((f) => [...f, ...l]);
  };
  const err = m.error && isApiError(m.error) ? m.error : null;
  return (
    <Modal open onClose={onClose} label={t('minhas.avaliarTitulo')} wide>
      <div className="row between"><span className="t-h4">{t('minhas.avaliarTitulo')}</span><button className="icon-btn icon-btn--s" onClick={onClose} aria-label={t('comum.fechar')}><Icon name="close" /></button></div>
      <div className="t-muted">{r.cavernaNome} · {r.codigo}</div>
      <div className="stack" style={{ gap: 6 }}>
        <b style={{ fontSize: 13 }}>{t('minhas.avaliarNota')}</b>
        <div className="row" style={{ gap: 4 }} role="radiogroup" aria-label={t('minhas.avaliarNota')}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={nota === n} aria-label={t('minhas.estrelas', { count: n })} onClick={() => setNota(n)} style={{ fontSize: 34, color: n <= nota ? 'var(--fogo)' : 'var(--linha)', lineHeight: 1 }}>★</button>
          ))}
        </div>
      </div>
      <TextareaField label={t('minhas.avaliarTexto')} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} rows={4} />
      <div className="stack" style={{ gap: 6 }}>
        <b style={{ fontSize: 13 }}>{t('minhas.avaliarFotos')}</b>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => escolher(e.target.files)} />
        {fotos.length > 0 && (
          <div className="chips">{fotos.map((f, i) => (
            <span key={i} className="chip chip--s">{f.name}<button type="button" onClick={() => setFotos((l) => l.filter((_, j) => j !== i))} aria-label={t('comum.remover')}><Icon name="close" size={16} /></button></span>
          ))}</div>
        )}
        {erro && <span className="field__error" style={{ fontSize: 13 }}>{erro}</span>}
      </div>
      {err && <Banner kind="erro" small title={err.titulo}>{err.message}</Banner>}
      <Button variant="fogo" size="lg" block loading={m.isPending} onClick={() => m.mutate()}>{t('minhas.avaliarEnviar')}</Button>
    </Modal>
  );
}
