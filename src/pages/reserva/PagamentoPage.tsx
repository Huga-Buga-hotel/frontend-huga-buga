import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trans } from 'react-i18next';
import { api } from '../../api/endpoints';
import { isApiError } from '../../api/client';
import { useCountdown, useLang } from '../../hooks';
import { Banner, Button, Icon } from '../../components/ui/basics';
import { Checkbox, SelectField, TextField } from '../../components/ui/form';
import { Modal, ModalIcon, useToast } from '../../components/ui/overlay';
import { FireLoader } from '../../components/ui/states';
import { QR } from '../../components/ui/QR';
import { ReservaShell, Resumo, TimerPill } from '../../components/reserva/ReservaShell';
import { addDays, brl, diaMes, mmss } from '../../lib/format';
import {
  PARCELAS_MAX, PRAZO_CANCELAR_DIAS, cartaoMascarado, formatarCartao, formatarValidade, luhn, soDigitos, validadeOk, valorComPix, valorParcela,
} from '../../lib/regras';
import type { MetodoPagamento, PagamentoRes, ReservaRes } from '../../api/types';

interface UiPag { metodo: MetodoPagamento; pagando: boolean; pix: boolean }

export default function PagamentoPage() {
  const { codigo = '' } = useParams();
  const pagarRef = useRef<() => void>(() => {});
  const [ui, setUi] = useState<UiPag>({ metodo: 'CARTAO', pagando: false, pix: false });
  const { t, lang } = useLang();
  const valor = (r: ReservaRes) => (ui.metodo === 'PIX' ? valorComPix(r.total) : r.total);
  const rotulo = (r: ReservaRes) =>
    ui.metodo === 'PIX' ? t('reserva.gerarPix', { valor: brl(valor(r), lang) }) : ui.metodo === 'NA_CHEGADA' ? t('reserva.confirmarChegada') : t('reserva.pagar', { valor: brl(valor(r), lang) });

  return (
    <ReservaShell codigo={codigo} passo={3}
      aside={(r) => (
        <Resumo r={r}>
          {!ui.pix && (
            <>
              <Button variant="fogo" size="xl" block icon="lock" onClick={() => pagarRef.current()} loading={ui.pagando} loadingText={t('reserva.pagando')}>{rotulo(r)}</Button>
              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--texto-2)' }}>{t('reserva.protegido')}</div>
            </>
          )}
        </Resumo>
      )}
      barra={ui.pix ? undefined : (r) => (
        <>
          <div><div className="t-price" style={{ fontSize: 22 }}>{brl(valor(r), lang)}</div><TimerPill r={r} curto /></div>
          <Button variant="fogo" icon="lock" onClick={() => pagarRef.current()} loading={ui.pagando}>{ui.metodo === 'NA_CHEGADA' ? t('comum.continuar') : t('reserva.pagar', { valor: '' }).trim()}</Button>
        </>
      )}
    >
      {(r) => <Pagamento r={r} pagarRef={pagarRef} onUi={setUi} />}
    </ReservaShell>
  );
}

function Pagamento({ r, pagarRef, onUi }: { r: ReservaRes; pagarRef: React.MutableRefObject<() => void>; onUi: (u: UiPag) => void }) {
  const { t, lang } = useLang();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [metodo, setMetodo] = useState<MetodoPagamento>(r.status === 'AGUARDANDO_PAGAMENTO' ? 'PIX' : 'CARTAO');
  const [numero, setNumero] = useState('');
  const [nome, setNome] = useState(r.responsavelNome?.toUpperCase() ?? '');
  const [validade, setValidade] = useState('');
  const [cvv, setCvv] = useState('');
  const [parcelas, setParcelas] = useState(1);
  const [aceito, setAceito] = useState(false);
  const [tocou, setTocou] = useState(false);
  const [cupom, setCupom] = useState('');
  const [pix, setPix] = useState<PagamentoRes | null>(null);
  const [recusa, setRecusa] = useState<PagamentoRes | null>(null);
  const prazo = addDays(r.checkIn, -PRAZO_CANCELAR_DIAS);

  const erros = metodo === 'CARTAO' ? {
    numero: !luhn(numero) ? t('reserva.erroCartao') : undefined,
    nome: nome.trim().length < 3 ? t('reserva.erroNomeCartao') : undefined,
    validade: !validadeOk(validade) ? t('reserva.erroValidade') : undefined,
    cvv: !/^\d{3,4}$/.test(cvv) ? t('reserva.erroCvv') : undefined,
  } : {};
  const aceiteErr = !aceito ? t('reserva.erroAceite') : undefined;
  const ok = Object.values(erros).every((x) => !x) && !aceiteErr;

  const concluir = () => { void qc.invalidateQueries({ queryKey: ['reserva', r.codigo] }); void qc.invalidateQueries({ queryKey: ['me'] }); nav(`/reserva/${r.codigo}`); };

  const pagar = useMutation({
    mutationFn: (m: MetodoPagamento) => api.pagamentos.pagar(r.codigo, {
      metodo: m, aceitoRegras: true,
      ...(m === 'CARTAO' ? { numeroCartao: soDigitos(numero), validade, cvv, parcelas } : {}),
    }),
    onSuccess: (p) => {
      if (p.metodo === 'PIX') { setPix(p); return; }
      if (p.status === 'RECUSADO') { setRecusa(p); return; }
      concluir();
    },
  });

  // Pix já gerado (reserva aguardando pagamento): retoma o mesmo código
  const retomou = useRef(false);
  useEffect(() => {
    if (r.status === 'AGUARDANDO_PAGAMENTO' && !retomou.current) { retomou.current = true; pagar.mutate('PIX'); }
  }, [r.status, pagar]);

  const acionar = () => {
    setTocou(true);
    if (!ok) return;
    pagar.mutate(metodo);
  };
  pagarRef.current = acionar;
  useEffect(() => { onUi({ metodo, pagando: pagar.isPending, pix: !!pix }); }, [metodo, pagar.isPending, pix, onUi]);

  const aplicar = useMutation({
    mutationFn: () => api.reservas.aplicarCupom(r.codigo, cupom.trim().toUpperCase()),
    onSuccess: (nova) => { qc.setQueryData(['reserva', r.codigo], nova); setCupom(''); },
  });
  const remover = useMutation({
    mutationFn: () => api.reservas.removerCupom(r.codigo),
    onSuccess: (nova) => qc.setQueryData(['reserva', r.codigo], nova),
  });

  const apiErr = pagar.error && isApiError(pagar.error) ? pagar.error : null;
  const cupomErr = aplicar.error && isApiError(aplicar.error) ? aplicar.error.message : undefined;
  const err = (m?: string) => (tocou ? m : undefined);
  const opcoesParcela = Array.from({ length: PARCELAS_MAX }, (_, i) => i + 1);

  if (pix) return <PixPainel p={pix} r={r} onPago={concluir} onNovo={() => { setPix(null); pagar.mutate('PIX'); }} toast={toast} />;

  return (
    <div className="stack" style={{ gap: 22 }}>
      {pagar.isPending && metodo === 'CARTAO' && <FireLoader titulo={t('estados.esfregando')} texto={t('estados.esfregandoTexto')} />}
      <h1 className="t-h1" style={{ fontSize: 48 }}>{t('reserva.titulo3')}</h1>
      {apiErr && <Banner kind="erro" title={apiErr.titulo}>{apiErr.message}</Banner>}

      <div className="metodos" role="radiogroup" aria-label={t('reserva.titulo3')}>
        <button type="button" className="metodo" role="radio" aria-pressed={metodo === 'CARTAO'} aria-checked={metodo === 'CARTAO'} onClick={() => setMetodo('CARTAO')}>
          <Icon name="credit_card" />{t('reserva.cartao')}<span className="metodo__tag" style={{ color: metodo === 'CARTAO' ? undefined : 'var(--texto-2)' }}>{t('reserva.ate6x')}</span>
        </button>
        <button type="button" className="metodo" role="radio" aria-pressed={metodo === 'PIX'} aria-checked={metodo === 'PIX'} onClick={() => setMetodo('PIX')}>
          <Icon name="qr_code_2" />{t('reserva.pix')}<span className="metodo__tag">{t('reserva.pixDesc')}</span>
          <span className="only-mobile" style={{ marginLeft: 4 }}>{t('reserva.pixDesc')}</span>
        </button>
        <button type="button" className="metodo" role="radio" aria-pressed={metodo === 'NA_CHEGADA'} aria-checked={metodo === 'NA_CHEGADA'} onClick={() => setMetodo('NA_CHEGADA')}>
          <Icon name="storefront" />{t('reserva.naChegada')}
        </button>
      </div>

      {metodo === 'CARTAO' && (
        <div className="card cartao-form">
          <div className="stack" style={{ gap: 16 }}>
            <TextField label={t('reserva.numeroCartao')} inputMode="numeric" autoComplete="cc-number" value={numero} onChange={(e) => setNumero(formatarCartao(e.target.value))} placeholder="0000 0000 0000 0000" error={err(erros.numero)} valid={luhn(numero)} />
            <TextField label={t('reserva.nomeImpresso')} autoComplete="cc-name" value={nome} onChange={(e) => setNome(e.target.value.toUpperCase())} error={err(erros.nome)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', gap: 12 }}>
              <TextField label={t('reserva.validade')} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={validade} onChange={(e) => setValidade(formatarValidade(e.target.value))} error={err(erros.validade)} />
              <TextField label={t('reserva.cvv')} inputMode="numeric" autoComplete="cc-csc" type="password" maxLength={4} value={cvv} onChange={(e) => setCvv(soDigitos(e.target.value))} error={err(erros.cvv)} />
              <SelectField label={t('reserva.parcelas')} value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>
                {opcoesParcela.map((n) => <option key={n} value={n}>{t('reserva.parcelaOpcao', { n, valor: brl(valorParcela(r.total, n), lang) })}</option>)}
              </SelectField>
            </div>
          </div>
          <div className="cartao-granito tx-granito" aria-hidden>
            <div className="row between"><span className="logo" style={{ fontSize: 18, color: '#fbe3cf' }}>HUGA BUGA</span><Icon name="contactless" size={26} /></div>
            <div className="mono" style={{ fontSize: 19, letterSpacing: 2 }}>{cartaoMascarado(numero || '0000000000000000')}</div>
            <div className="row between" style={{ fontSize: 12, fontWeight: 700 }}><span>{nome || 'NOME NO CARTÃO'}</span><span>{validade || 'MM/AA'}</span></div>
          </div>
        </div>
      )}
      {metodo === 'PIX' && (
        <Banner kind="ok" icon="qr_code_2" title={`${t('reserva.totalPix')}: ${brl(valorComPix(r.total), lang)}`}>{t('reserva.pixExpira', { tempo: '10:00' })}</Banner>
      )}
      {metodo === 'NA_CHEGADA' && <Banner kind="info" title={t('reserva.naChegada')}>{t('reserva.naChegadaTexto')}</Banner>}

      {r.cupom ? (
        <div className="banner banner--ok banner--s" style={{ padding: '11px 14px', fontSize: 14 }}>
          <Icon name="sell" />
          <span className="grow"><Trans i18nKey="reserva.cupomAplicado" values={{ codigo: r.cupom, valor: brl(r.desconto, lang) }} components={{ b: <b /> }} /></span>
          <button className="link-btn link-btn--tinta" onClick={() => remover.mutate()} disabled={remover.isPending}>{t('comum.remover')}</button>
        </div>
      ) : (
        <form className="stack" style={{ gap: 6, maxWidth: 420 }} onSubmit={(e) => { e.preventDefault(); if (cupom.trim()) aplicar.mutate(); }}>
          <label className="field__label" style={{ fontSize: 13, fontWeight: 700 }} htmlFor="cupom">{t('reserva.cupom')}</label>
          <div className="coupon">
            <input id="cupom" className={`input ${cupomErr ? 'is-error' : ''}`} placeholder={t('reserva.cupomCodigo')} value={cupom} onChange={(e) => setCupom(e.target.value)} />
            <Button variant="contorno" size="sm" type="submit" loading={aplicar.isPending} loadingText={t('reserva.checando')} style={{ boxShadow: 'none', padding: '11px 14px' }}>{t('comum.aplicar')}</Button>
          </div>
          {cupomErr && <span className="field__error" style={{ fontSize: 13 }}>{cupomErr}</span>}
        </form>
      )}

      <div className="stack" style={{ gap: 6 }}>
        <Checkbox checked={aceito} onChange={setAceito}>
          <Trans i18nKey="reserva.aceito" values={{ data: diaMes(prazo, lang) }} components={{ regras: <Link to="/a-tribo#regras" target="_blank" />, politica: <Link to="/a-tribo#cancelamento" target="_blank" /> }} />
        </Checkbox>
        {tocou && aceiteErr && <span className="field__error" style={{ fontSize: 13, paddingLeft: 30 }}>{aceiteErr}</span>}
      </div>
      <div className="only-mobile"><Resumo r={r} /></div>

      <Modal open={!!recusa} onClose={() => setRecusa(null)} label={t('reserva.recusadoTitulo')}>
        <ModalIcon icon="credit_card_off" kind="erro" />
        <div className="modal__title" style={{ fontSize: 34 }}>{t('reserva.recusadoTitulo')}</div>
        <p className="modal__text">
          <Trans i18nKey={recusa?.cartaoFinal ? 'reserva.recusadoTexto' : 'reserva.recusadoTextoSemFinal'} values={{ final: recusa?.cartaoFinal ?? '', motivo: recusa?.motivoRecusa ?? '' }} components={{ b: <b />, strong: <b /> }} />
        </p>
        <RecusaTimer r={r} />
        <div className="modal__actions">
          <Button variant="carvao" size="md" onClick={() => { setRecusa(null); setNumero(''); setCvv(''); }}>{t('reserva.outroCartao')}</Button>
          <Button variant="contorno" size="md" icon="qr_code_2" onClick={() => { setRecusa(null); setMetodo('PIX'); }}>{t('reserva.pagarPix')}</Button>
        </div>
        <button className="link-btn link-btn--muted" onClick={() => { setRecusa(null); setMetodo('NA_CHEGADA'); }}>{t('reserva.pagarChegada')}</button>
      </Modal>
    </div>
  );
}

function RecusaTimer({ r }: { r: ReservaRes }) {
  const { t } = useLang();
  const s = useCountdown(r.expiraEm);
  if (s == null || s <= 0) return null;
  return <span className="timer-pill"><Icon name="hourglass_top" size={18} />{t('reserva.continuaSegura', { tempo: mmss(s) })}</span>;
}

function PixPainel({ p, r, onPago, onNovo, toast }: { p: PagamentoRes; r: ReservaRes; onPago: () => void; onNovo: () => void; toast: ReturnType<typeof useToast> }) {
  const { t, lang } = useLang();
  const s = useCountdown(p.pixExpiraEm);
  const expirou = s != null && s <= 0;
  const consulta = useQuery({
    queryKey: ['pagamento', p.id],
    queryFn: () => api.pagamentos.consultar(p.id, r.codigo),
    refetchInterval: (q) => (q.state.data?.status === 'APROVADO' || expirou ? false : 3000),
  });
  const status = consulta.data?.status ?? p.status;
  useEffect(() => { if (status === 'APROVADO') onPago(); }, [status, onPago]);
  const simular = useMutation({ mutationFn: () => api.pagamentos.simularConfirmacao(p.id, r.codigo), onSuccess: () => onPago() });
  const copiar = async () => {
    try { await navigator.clipboard.writeText(p.pixCopiaCola ?? ''); toast({ kind: 'ok', title: t('comum.copiado'), text: t('reserva.pixCopiado') }); } catch { /* sem permissão */ }
  };
  return (
    <div className="stack" style={{ gap: 18, maxWidth: 560 }}>
      <h1 className="t-h1" style={{ fontSize: 48 }}>{t('reserva.titulo3')}</h1>
      <div className="card card--l pix-box">
        <div className="t-h5">{t('reserva.pagueComPix')}</div>
        {p.pixCopiaCola && <QR value={p.pixCopiaCola} size={190} label="QR Pix" />}
        {expirou || status === 'EXPIRADO' ? (
          <Banner kind="ambar" small>{t('reserva.pixExpirou')}</Banner>
        ) : (
          <div className="row" style={{ gap: 6, fontWeight: 800, color: 'var(--brasa)' }}><Icon name="hourglass_top" />{t('reserva.pixExpira', { tempo: mmss(s ?? 0) })}</div>
        )}
        <button type="button" className="pix-code" onClick={copiar} aria-label={t('reserva.copiarPix')}><span>{p.pixCopiaCola}</span><Icon name="content_copy" /></button>
      </div>
      <div className="row between" style={{ fontSize: 14 }}><span>{t('reserva.totalPix')}</span><b>{brl(p.valorCentavos, lang)}</b></div>
      {!expirou && <div className="row" style={{ gap: 8, fontSize: 13, color: 'var(--texto-2)' }}><span className="ring" style={{ color: 'var(--fogo)', width: 14, height: 14 }} />{t('reserva.aguardandoBanco')}</div>}
      <div className="row wrap" style={{ gap: 10 }}>
        {expirou ? <Button variant="fogo" onClick={onNovo}>{t('reserva.gerarPix', { valor: brl(p.valorCentavos, lang) })}</Button> : <Button variant="fogo" icon="content_copy" onClick={copiar}>{t('reserva.copiarPix')}</Button>}
        {import.meta.env.DEV && !expirou && <Button variant="contorno" size="md" loading={simular.isPending} onClick={() => simular.mutate()}>{t('reserva.simularPix')}</Button>}
      </div>
    </div>
  );
}
