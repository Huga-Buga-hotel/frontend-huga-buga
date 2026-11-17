import { type ReactNode, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trans } from 'react-i18next';
import { api } from '../../api/endpoints';
import { isApiError } from '../../api/client';
import { useCountdown, useLang, useTriboTexto } from '../../hooks';
import { Button, Icon, ImageSlot } from '../ui/basics';
import { Modal, ModalIcon } from '../ui/overlay';
import { ErrorState, PageLoader } from '../ui/states';
import { addDays, brl, dataCurta, diaMes, intervalo, mmss } from '../../lib/format';
import { PRAZO_CANCELAR_DIAS } from '../../lib/regras';
import type { ReservaRes } from '../../api/types';

export function useReserva(codigo: string) {
  return useQuery({ queryKey: ['reserva', codigo], queryFn: () => api.reservas.obter(codigo), retry: false });
}

export type Passo = 1 | 2 | 3;

function Steps({ passo, codigo }: { passo: Passo; codigo: string }) {
  const { t } = useLang();
  const labels = [t('reserva.passo1'), t('reserva.passo2'), t('reserva.passo3')];
  const rotas = ['quem-vem', 'extras', 'pagamento'];
  return (
    <nav className="steps" aria-label="Etapas">
      {labels.map((l, i) => {
        const n = (i + 1) as Passo;
        const estado = n < passo ? 'is-done' : n === passo ? 'is-now' : '';
        const conteudo = (
          <>
            <Icon name={n < passo ? 'check_circle' : 'footprint'} />
            {n} · {l}
          </>
        );
        return (
          <span key={l} style={{ display: 'contents' }}>
            {i > 0 && <span className={`steps__trail ${n <= passo ? 'is-on' : ''}`} aria-hidden />}
            {n < passo ? (
              <Link to={`/reserva/${codigo}/${rotas[i]}`} className={`step ${estado}`}>{conteudo}</Link>
            ) : (
              <span className={`step ${estado}`} aria-current={n === passo ? 'step' : undefined}>{conteudo}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/** Contador "Sua toca está segura por 14:52" + aviso nos 2 minutos finais + tela de expirada. */
function Fogueira({ r }: { r: ReservaRes }) {
  const { t } = useLang();
  const s = useCountdown(r.expiraEm);
  const qc = useQueryClient();
  const nav = useNavigate();
  const [fechouAviso, setFechouAviso] = useState(false);
  const prorrogar = useMutation({
    mutationFn: () => api.reservas.prorrogar(r.codigo),
    onSuccess: (nova) => { qc.setQueryData(['reserva', r.codigo], nova); setFechouAviso(false); },
  });
  const expirou = r.status === 'EXPIRADA' || (s != null && s <= 0 && r.status === 'PENDENTE');
  const avisar = !expirou && s != null && s <= 120 && !fechouAviso && r.status === 'PENDENTE';
  return (
    <>
      {avisar && (
        <div className="fogueira-toast" role="alert">
          <div className="fogueira-toast__ring">{mmss(s!)}</div>
          <div className="grow">
            <div style={{ fontWeight: 800 }}>{t('reserva.apagandoTitulo')}</div>
            <div style={{ fontSize: 13, color: 'var(--osso-2)', marginTop: 2 }}>{t('reserva.apagandoTexto', { tempo: mmss(s!) })}</div>
          </div>
          {!r.prorrogada ? (
            <Button variant="ambar" size="sm" loading={prorrogar.isPending} onClick={() => prorrogar.mutate()}>{t('reserva.mais10')}</Button>
          ) : (
            <button onClick={() => setFechouAviso(true)} aria-label={t('comum.fechar')} style={{ color: 'var(--osso-2)' }}><Icon name="close" /></button>
          )}
        </div>
      )}
      <Modal open={expirou} onClose={() => nav('/cavernas')} label={t('reserva.expirouTitulo')} dismissable={false}>
        <ModalIcon icon="mode_heat_off" kind="neutro" />
        <div className="modal__title">{t('reserva.expirouTitulo')}</div>
        <p className="modal__text"><Trans i18nKey="reserva.expirouTexto" components={{ b: <b /> }} /></p>
        <Button variant="fogo" size="lg" block onClick={() => nav('/cavernas')}>{t('reserva.recomecar')}</Button>
      </Modal>
    </>
  );
}

export function TimerPill({ r, curto }: { r: ReservaRes; curto?: boolean }) {
  const { t } = useLang();
  const s = useCountdown(r.expiraEm);
  if (s == null || r.status !== 'PENDENTE') return null;
  const tempo = mmss(s);
  if (curto) return <span className="row" style={{ gap: 3, fontSize: 12, fontWeight: 800, color: 'var(--brasa)' }}><Icon name="hourglass_top" size={16} />{tempo}</span>;
  return <span className={`timer-pill ${s <= 120 ? 'timer-pill--ambar' : ''}`}><Icon name="hourglass_top" />{t('reserva.tocaSegura', { tempo })}</span>;
}

/** Resumo lateral "Resumo da caçada". */
export function Resumo({ r, children, completo }: { r: ReservaRes; children?: ReactNode; completo?: boolean }) {
  const { t, lang } = useLang();
  const tribo = useTriboTexto();
  const prazo = addDays(r.checkIn, -PRAZO_CANCELAR_DIAS);
  const extrasPagos = r.extras.filter((e) => e.subtotalCentavos > 0);
  return (
    <aside className="card card--l resumo-aside" aria-label={t('reserva.resumoCacada')}>
      {completo ? (
        <>
          <div style={{ height: 150 }}><ImageSlot caption={r.cavernaNome} mask="lasca" /></div>
          <div>
            <div className="t-h5" style={{ fontSize: 26 }}>{r.cavernaNome}</div>
            <div className="t-muted" style={{ fontSize: 13, marginTop: 4 }}>{r.unidadeCodigo}</div>
          </div>
          <div className="dashed-top" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 14, paddingTop: 12 }}>
            <div><div className="caption caption--s">{t('busca.chegada')}</div><b>{dataCurta(r.checkIn, lang)}</b></div>
            <div><div className="caption caption--s">{t('busca.partida')}</div><b>{dataCurta(r.checkOut, lang)}</b></div>
            <div style={{ gridColumn: 'span 2' }}><div className="caption caption--s">{t('busca.tribo')}</div><b>{tribo(r.adultos, r.criancas)}</b></div>
          </div>
        </>
      ) : (
        <div className="t-h5">{t('reserva.resumoCacada')}</div>
      )}
      <div className={`resumo ${completo ? 'dashed-top' : ''}`} style={completo ? { paddingTop: 12, gap: 8 } : { gap: 12 }}>
        <div className="resumo__linha"><span>{t('reserva.tocaNoites', { nome: r.cavernaNome, noites: t('comum.noites', { count: r.noites }) })}</span><span>{brl(r.valorDiarias, lang)}</span></div>
        {completo && <div className="resumo__linha"><span>{t('detalhe.fixos.cafe')}</span><span className="t-ok">{t('comum.incluso')}</span></div>}
        {!completo && extrasPagos.map((e) => (
          <div key={e.extraId} className="resumo__linha resumo__linha--extra">
            <span>{e.quantidade > 1 ? t('reserva.extraLinha', { nome: e.nome, n: e.quantidade }) : t('reserva.extraLinha1', { nome: e.nome })}</span>
            <span>{brl(e.subtotalCentavos, lang)}</span>
          </div>
        ))}
        {!completo && r.combo && (
          <div className="resumo__linha resumo__linha--extra"><span>{t('reserva.comboLinha', { nome: r.combo.nome, noites: t('comum.noites', { count: r.combo.noites }) })}</span><span>{brl(r.combo.valorCentavos, lang)}</span></div>
        )}
        {r.desconto > 0 && <div className="resumo__linha resumo__linha--desconto"><span>{t('reserva.cupomLinha', { codigo: r.cupom ?? '' })}</span><span>−{brl(r.desconto, lang)}</span></div>}
        <div className="resumo__total" style={{ fontSize: children ? 20 : 18 }}><span>{t('comum.total')}</span><span>{brl(r.total, lang)}</span></div>
      </div>
      {children}
      {completo && <div className="ok-line"><Icon name="check_circle" />{t('comum.cancelamentoGratis', { data: diaMes(prazo, lang) })}</div>}
    </aside>
  );
}

/** Esqueleto das 3 pegadas do checkout. */
export function ReservaShell({ codigo, passo, children, aside, barra }: {
  codigo: string; passo: Passo; children: (r: ReservaRes) => ReactNode; aside: (r: ReservaRes) => ReactNode;
  /** Barra fixa do mobile (total + botão). */
  barra?: (r: ReservaRes) => ReactNode;
}) {
  const { t, lang } = useLang();
  const q = useReserva(codigo);
  const nav = useNavigate();
  useEffect(() => { document.body.classList.add('tem-barra-fixa'); return () => document.body.classList.remove('tem-barra-fixa'); }, []);

  if (q.isLoading) return <PageLoader />;
  if (q.isError) {
    const e = q.error;
    if (isApiError(e) && (e.status === 403 || e.status === 404)) {
      return (
        <div className="container" style={{ padding: '64px var(--gutter)', textAlign: 'center' }}>
          <div className="t-h3">{e.titulo ?? t('estados.semPermissao')}</div>
          <p className="t-muted" style={{ margin: '12px auto 20px', maxWidth: 420 }}>{e.message}</p>
          <Link to="/buscar-reserva" className="btn btn--carvao btn--md">{t('buscarReserva.titulo')}</Link>
        </div>
      );
    }
    return <ErrorState erro={e} onRetry={() => q.refetch()} />;
  }
  const r = q.data!;
  if (r.status !== 'PENDENTE' && r.status !== 'EXPIRADA' && passo < 3) {
    // já paga ou aguardando: segue pro voucher
    return <Navigate to={`/reserva/${codigo}`} replace />;
  }
  return (
    <div className="checkout">
      {/* cabeçalho mobile */}
      <div className="checkout-m-head only-mobile">
        <button onClick={() => nav(-1)} aria-label={t('comum.voltar')}><Icon name="arrow_back" size={24} /></button>
        <div className="grow">
          <div style={{ fontWeight: 800 }}>{passo === 3 ? t('reserva.passo3') : t('reserva.reservarNome', { nome: r.cavernaNome })}</div>
          {passo !== 3 && <div style={{ fontSize: 12, color: 'var(--texto-2)' }}>{intervalo(r.checkIn, r.checkOut, lang)} · {t('comum.pessoas', { count: r.adultos + r.criancas })}</div>}
        </div>
        {passo === 3 ? <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--brasa)' }}>{t('reserva.pegadaCurta', { n: 3 })}</span> : <TimerPill r={r} curto />}
      </div>
      <div className="only-mobile" style={{ padding: '12px var(--gutter)' }}>
        <div className="steps-bar">{[1, 2, 3].map((n) => <span key={n} className={n <= passo ? 'is-on' : ''} />)}</div>
      </div>

      <div className="container">
        <div className="checkout__top hide-mobile">
          <Steps passo={passo} codigo={codigo} />
          {passo === 1 && <TimerPill r={r} />}
        </div>
        <div className="checkout__grid">
          <div className="stack checkout__main">{children(r)}</div>
          <div className="checkout__aside">{aside(r)}</div>
        </div>
      </div>
      {barra && <div className="checkout-barra only-mobile">{barra(r)}</div>}
      <Fogueira r={r} />
    </div>
  );
}
