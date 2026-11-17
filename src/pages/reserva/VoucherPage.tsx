import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trans } from 'react-i18next';
import { api } from '../../api/endpoints';
import { isApiError } from '../../api/client';
import { useLang, useTriboTexto } from '../../hooks';
import { Badge, Banner, Button, Icon } from '../../components/ui/basics';
import { useToast } from '../../components/ui/overlay';
import { ErrorState, PageLoader } from '../../components/ui/states';
import { QR } from '../../components/ui/QR';
import { useReserva } from '../../components/reserva/ReservaShell';
import { brl, dataLonga, diaMesCaixaAlta, diaSemanaLongo, hora, hojeISO, noites } from '../../lib/format';
import { CHECKIN_ONLINE_DIAS, seloStatus } from '../../lib/regras';

export default function VoucherPage() {
  const { codigo = '' } = useParams();
  const { t, lang } = useLang();
  const q = useReserva(codigo);
  const qc = useQueryClient();
  const toast = useToast();
  const tribo = useTriboTexto();
  const checkin = useMutation({
    mutationFn: () => api.reservas.checkin(codigo),
    onSuccess: (r) => { qc.setQueryData(['reserva', codigo], r); toast({ kind: 'ok', title: t('reserva.checkinFeito'), text: t('reserva.checkinFeitoTexto') }); },
    onError: (e) => toast({ kind: 'erro', title: isApiError(e) ? (e.titulo ?? 'Ugh!') : 'Ugh!', text: (e as Error).message }),
  });
  const baixar = useMutation({ mutationFn: () => api.reservas.baixarVoucher(codigo), onError: (e) => toast({ kind: 'erro', title: 'Ugh!', text: (e as Error).message }) });
  const agenda = useMutation({ mutationFn: () => api.reservas.baixarAgenda(codigo), onError: (e) => toast({ kind: 'erro', title: 'Ugh!', text: (e as Error).message }) });

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
  const confirmada = r.status === 'CONFIRMADA' || r.status === 'CONCLUIDA';
  const pendente = r.status === 'PENDENTE' || r.status === 'AGUARDANDO_PAGAMENTO';
  const dias = noites(hojeISO(), r.checkIn);
  const checkinAberto = confirmada && dias <= CHECKIN_ONLINE_DIAS && dias >= 0;
  const hSaida = r.lateCheckout ? '15:00' : '12:00';

  const todo = [
    {
      i: 'how_to_reg',
      n: r.checkinOnlineEm ? t('reserva.todoCheckinFeito') : t('reserva.todoCheckin'),
      d: r.checkinOnlineEm ? '✓' : checkinAberto ? t('reserva.todoCheckinDesc') : t('reserva.todoCheckinAbre', { n: CHECKIN_ONLINE_DIAS }),
      onClick: checkinAberto && !r.checkinOnlineEm ? () => checkin.mutate() : undefined,
    },
    { i: 'hiking', n: t('reserva.todoAventuras'), d: t('reserva.todoAventurasDesc'), to: `/experiencias?reserva=${r.codigo}` },
    { i: 'restaurant', n: t('reserva.todoMesa'), d: t('reserva.todoMesaDesc'), to: `/banquete?reserva=${r.codigo}#reservar` },
  ];

  return (
    <div className="voucher-page">
      <div className="container voucher-grid">
        <div className="stack voucher-txt" style={{ gap: 22 }}>
          <div className="voucher-check hide-mobile"><Icon name={confirmada ? 'check' : 'schedule'} size={40} /></div>
          {confirmada || pendente ? (
            <h1 className="t-display voucher-title">{t('reserva.buga')}<br /><span className="t-fogo">{t('reserva.taReservado')}</span></h1>
          ) : (
            <h1 className="t-h1"><Badge kind={seloStatus(r.status)}>{t(`comum.status.${r.status}`)}</Badge><br />{r.cavernaNome}</h1>
          )}
          <p className="t-body-l hide-mobile" style={{ maxWidth: 500 }}>
            <Trans
              i18nKey={confirmada ? 'reserva.confirmadaTexto' : 'reserva.aguardandoTexto'}
              values={{ caverna: r.cavernaNome, inicio: dataLonga(r.checkIn, lang), fim: dataLonga(r.checkOut, lang), email: r.responsavelEmail ?? '' }}
              components={{ b: <b style={{ color: 'var(--carvao)' }} /> }}
            />
          </p>
          {pendente && (
            <Banner kind="ambar" icon="schedule" title={t(`comum.status.${r.status}`)} action={<Link to={`/reserva/${r.codigo}/${r.responsavelNome ? 'pagamento' : 'quem-vem'}`} className="btn btn--fogo btn--sm">{t('minhas.continuarReserva')}</Link>} />
          )}
          {confirmada && (
            <div className="stack hide-mobile" style={{ gap: 10, maxWidth: 520 }}>
              <div className="t-h5">{t('reserva.antesChegar')}</div>
              {todo.map((x) => {
                const inner = (
                  <>
                    <div className="todo__ic"><Icon name={x.i} /></div>
                    <div className="grow"><div style={{ fontWeight: 800 }}>{x.n}</div><div style={{ fontSize: 13, color: 'var(--texto-2)' }}>{x.d}</div></div>
                    {(x.to || x.onClick) && <Icon name={checkin.isPending && x.onClick ? 'progress_activity' : 'chevron_right'} size={22} />}
                  </>
                );
                return x.to ? (
                  <Link key={x.n} to={x.to} className="todo">{inner}</Link>
                ) : (
                  <button key={x.n} type="button" className="todo" onClick={x.onClick} disabled={!x.onClick}>{inner}</button>
                );
              })}
            </div>
          )}
        </div>

        {/* tábua destacável */}
        <div className="voucher" aria-label={t('reserva.seuVoucher')}>
          <div className="voucher__head tx-caverna">
            <span className="logo" style={{ fontSize: 26 }}>HUGA BUGA</span>
            <div style={{ textAlign: 'right' }}>
              <div className="caption" style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--osso-3)' }}>{t('reserva.codigoTribo')}</div>
              <div className="mono" style={{ fontSize: 20, letterSpacing: 2 }}>{r.codigo}</div>
            </div>
          </div>
          <div className="voucher__body">
            <div className="t-h4" style={{ fontSize: 34 }}>{r.cavernaNome}</div>
            <div className="voucher__datas">
              <div>
                <div className="caption">{t('busca.chegada')}</div>
                <div className="t-price voucher__dia">{diaMesCaixaAlta(r.checkIn, lang)}</div>
                <div style={{ fontSize: 13, color: 'var(--texto-2)' }}>{t('reserva.aPartir', { dia: diaSemanaLongo(r.checkIn, lang), h: hora('14:00', true, lang) })}</div>
              </div>
              <div className="trail"><Icon name="footprint" /></div>
              <div style={{ textAlign: 'right' }}>
                <div className="caption">{t('busca.partida')}</div>
                <div className="t-price voucher__dia">{diaMesCaixaAlta(r.checkOut, lang)}</div>
                <div style={{ fontSize: 13, color: 'var(--texto-2)' }}>{t('reserva.ateHora', { dia: diaSemanaLongo(r.checkOut, lang), h: hora(hSaida, true, lang) })}</div>
              </div>
            </div>
            <div className="voucher__info">
              <div><div className="caption caption--s" style={{ color: '#8a6a4a' }}>{t('busca.tribo')}</div><b>{tribo(r.adultos, r.criancas, true)}</b></div>
              <div><div className="caption caption--s" style={{ color: '#8a6a4a' }}>{t('reserva.toca')}</div><b>{r.unidadeCodigo}</b></div>
              <div><div className="caption caption--s" style={{ color: '#8a6a4a' }}>{r.pago ? t('reserva.pago') : t('reserva.aPagar')}</div><b>{brl(r.total, lang)}</b></div>
            </div>
          </div>
          <div className="voucher__corte"><i /><i /></div>
          <div className="voucher__qr">
            <QR value={`HUGABUGA:${r.codigo}`} size={120} label={r.codigo} />
            <div className="stack" style={{ gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--texto-2)' }}>{t('reserva.mostreRecepcao')}</span>
              <Button variant="carvao" size="sm" icon="download" onClick={() => baixar.mutate()} loading={baixar.isPending} style={{ boxShadow: 'none' }}>{t('reserva.baixarTabua')}</Button>
              <Button variant="contorno" size="sm" icon="event" onClick={() => agenda.mutate()} loading={agenda.isPending}>{t('reserva.addAgenda')}</Button>
            </div>
          </div>
        </div>

        {confirmada && (
          <div className="stack only-mobile" style={{ gap: 10 }}>
            {todo.map((x) => (x.to ? (
              <Link key={x.n} to={x.to} className="todo"><div className="todo__ic"><Icon name={x.i} /></div><div className="grow"><div style={{ fontWeight: 800 }}>{x.n}</div><div style={{ fontSize: 13, color: 'var(--texto-2)' }}>{x.d}</div></div><Icon name="chevron_right" /></Link>
            ) : (
              <button key={x.n} className="todo" onClick={x.onClick} disabled={!x.onClick}><div className="todo__ic"><Icon name={x.i} /></div><div className="grow" style={{ textAlign: 'left' }}><div style={{ fontWeight: 800 }}>{x.n}</div><div style={{ fontSize: 13, color: 'var(--texto-2)' }}>{x.d}</div></div></button>
            )))}
          </div>
        )}
      </div>
    </div>
  );
}
