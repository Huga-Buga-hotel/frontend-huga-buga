import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { isApiError, reservaEmails } from '../api/client';
import { useAuth } from '../context/auth';
import { useLang } from '../hooks';
import { Banner, Button, Icon, ImageSlot, Sk } from '../components/ui/basics';
import { Counter, Segmented, Tabs, TextField, Toggle } from '../components/ui/form';
import { Modal, ModalIcon, Sheet } from '../components/ui/overlay';
import { ErrorState } from '../components/ui/states';
import { addDays, brl, dataCurta, hojeISO, hora } from '../lib/format';
import { emailOk, formatarCelular, soDigitos } from '../lib/regras';
import type { CategoriaCardapio, MesaRes } from '../api/types';

const CATS: CategoriaCardapio[] = ['NA_FOGUEIRA', 'ENTRADAS', 'MENU_KIDS', 'DA_HORTA', 'SOBREMESAS', 'POCOES'];

export default function BanquetePage() {
  const { t, lang } = useLang();
  const [cat, setCat] = useState<CategoriaCardapio>('NA_FOGUEIRA');
  const [sheet, setSheet] = useState(false);
  const rest = useQuery({ queryKey: ['restaurante'], queryFn: api.restaurante.visao, staleTime: 300_000 });
  const cardapio = useQuery({ queryKey: ['cardapio'], queryFn: () => api.restaurante.cardapio(), staleTime: 600_000 });
  const itens = (cardapio.data ?? []).filter((x) => x.categoria === cat);
  const pct = rest.data?.descontoHospedePct ?? 15;
  const turnos = rest.data?.turnos ?? [];
  const chaves = ['cafe', 'almoco', 'jantar'] as const;
  const atual = turnos.find((x) => x.nome === rest.data?.turnoAtual);
  const proximo = turnos.find((x) => x.abre.slice(0, 5) > new Date().toTimeString().slice(0, 5)) ?? turnos[0];

  useEffect(() => {
    if (window.location.hash === '#reservar') document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth' });
    if (window.location.hash === '#cardapio') document.getElementById('cardapio')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="container">
      <section className="ban-hero">
        <div className="stack ban-hero__txt" style={{ gap: 18 }}>
          <span className="eyebrow">{t('banquete.eyebrow')}</span>
          <h1 style={{ font: "900 76px/.95 'Londrina Solid',sans-serif" }}>{t('banquete.titulo')}</h1>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: 'var(--texto-corpo)', maxWidth: 480 }}>{t('banquete.texto', { pct })}</p>
          <div className="ban-turnos">
            {turnos.length === 0 && [0, 1, 2].map((i) => <Sk key={i} h={52} />)}
            {turnos.map((tr, i) => (
              <div key={tr.nome} className={`ban-turno ${i === 2 ? 'is-on' : ''}`}>
                <div className="caption">{t(`banquete.turnos.${chaves[i] ?? 'jantar'}`)}</div>
                <div style={{ fontWeight: 800 }}>{hora(tr.abre, true, lang)} – {hora(tr.fecha, true, lang)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="ban-hero__img" style={{ height: 360 }}>
          <ImageSlot caption={t('banquete.fotoSalao')} mask="heroDesk" className="hide-mobile" />
          <ImageSlot caption={t('banquete.fotoMob')} className="only-mobile" />
          <div className="ban-hero__over">
            <div style={{ font: "900 34px/1 'Londrina Solid',sans-serif" }}>{t('banquete.titulo')}</div>
            {rest.data && (
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tocha)' }}>
                {rest.data.abertoAgora && atual ? t('banquete.abertoAgora', { turno: atual.nome.toLowerCase(), h: hora(atual.fecha, true, lang) }) : proximo ? t('banquete.fechadoAgora', { h: hora(proximo.abre, true, lang) }) : ''}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="ban-grid">
        <div id="cardapio" className="card card--l cardapio" style={{ scrollMarginTop: 100 }}>
          <Tabs value={cat} onChange={setCat} options={CATS.map((c) => ({ value: c, label: <><span className="hide-mobile">{t(`banquete.cat.${c}`)}</span><span className="only-mobile">{t(`banquete.catMob.${c}`)}</span></> }))} />
          {cardapio.isError ? <ErrorState erro={cardapio.error} onRetry={() => cardapio.refetch()} compacto /> : (
            <div className="cardapio__itens">
              {cardapio.isLoading && [0, 1, 2, 3].map((i) => <Sk key={i} h={70} />)}
              {itens.map((m) => (
                <div key={m.id} className="prato">
                  <div className="prato__linha"><span>{m.nome}</span><i /><span>{brl(m.precoCentavos, lang)}</span></div>
                  <div style={{ fontSize: 14, color: 'var(--texto-2)', lineHeight: 1.45 }}>{m.descricao}</div>
                  {m.tags.length > 0 && <div className="row hide-mobile" style={{ gap: 6 }}>{m.tags.map((tg) => <span key={tg} className="tag tag--terra">{tg}</span>)}</div>}
                </div>
              ))}
            </div>
          )}
          <div className="hide-mobile dashed-top" style={{ fontSize: 13, color: 'var(--pedra)', paddingTop: 14 }}>{t('banquete.notaMamute')}</div>
        </div>
        <aside id="reservar" className="card card--l mesa-card ban-mesa-desk" style={{ scrollMarginTop: 100 }}>
          <MesaForm pct={pct} />
        </aside>
      </div>
      <div className="ban-cta-m"><Button variant="fogo" block onClick={() => setSheet(true)}>{t('banquete.reservarMesa')}</Button></div>
      <Sheet open={sheet} onClose={() => setSheet(false)} label={t('banquete.reservarMesa')}><MesaForm pct={pct} onDone={() => setSheet(false)} /></Sheet>
    </div>
  );
}

function MesaForm({ pct, onDone }: { pct: number; onDone?: () => void }) {
  const { t, lang } = useLang();
  const { logado } = useAuth();
  const [params] = useSearchParams();
  const minhas = useQuery({ queryKey: ['me', 'reservas', 'proximas'], queryFn: () => api.me.reservas('proximas'), enabled: logado });
  const perfil = useQuery({ queryKey: ['me', 'perfil'], queryFn: api.me.perfil, enabled: logado });
  const confirmada = (minhas.data?.estadias ?? []).find((r) => r.status === 'CONFIRMADA');
  const codigoInicial = params.get('reserva') ?? confirmada?.codigo ?? '';
  const [modo, setModo] = useState<'hospede' | 'visitante'>(codigoInicial ? 'hospede' : 'visitante');
  const [codigo, setCodigo] = useState(codigoInicial);
  useEffect(() => { if (codigoInicial) { setCodigo(codigoInicial); setModo('hospede'); } }, [codigoInicial]);
  const [data, setData] = useState(() => (confirmada && confirmada.checkIn > hojeISO() ? confirmada.checkIn : addDays(hojeISO(), 1)));
  const [pessoas, setPessoas] = useState(4);
  const [horario, setHorario] = useState<string | null>(null);
  const [cadeirinha, setCadeirinha] = useState(false);
  const [fogueira, setFogueira] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cel, setCel] = useState('');
  const [ok, setOk] = useState<MesaRes | null>(null);
  useEffect(() => {
    if (perfil.data) { setNome((v) => v || `${perfil.data.nome} ${perfil.data.sobrenome}`); setEmail((v) => v || perfil.data.email); }
  }, [perfil.data]);

  const horarios = useQuery({ queryKey: ['horarios', data, pessoas], queryFn: () => api.restaurante.horarios(data, pessoas), enabled: !!data });
  useEffect(() => { if (horario && horarios.data?.find((h) => h.horario === horario)?.status === 'LOTADO') setHorario(null); }, [horarios.data, horario]);

  const valido = !!horario && (modo === 'hospede' ? /^HB-/i.test(codigo.trim()) : nome.trim().length > 1 && emailOk(email) && soDigitos(cel).length >= 10);
  const m = useMutation({
    mutationFn: () => api.restaurante.reservarMesa({
      data, horario: horario!, pessoas, cadeirinhas: cadeirinha ? 1 : 0, pertoFogueira: fogueira,
      ...(modo === 'hospede'
        ? { codigoReserva: codigo.trim().toUpperCase() }
        : { nomeContato: nome.trim(), emailContato: email.trim(), celularContato: `+55 ${cel}` }),
    }),
    onSuccess: (mesa) => { setOk(mesa); if (modo === 'visitante') reservaEmails.set(mesa.codigo, email.trim()); },
  });
  const err = m.error && isApiError(m.error) ? m.error : null;
  const max = useMemo(() => addDays(hojeISO(), 60), []);

  return (
    <>
      <div className="t-h4">{t('banquete.reservarMesa')}</div>
      <Segmented value={modo} onChange={setModo} options={[{ value: 'hospede', label: t('banquete.souHospede', { pct }) }, { value: 'visitante', label: t('banquete.visitante') }]} />
      <div className="grid-2" style={{ gap: 10 }}>
        <label className="mesa-campo"><div className="caption caption--s">{t('banquete.dia')}</div>
          <input type="date" value={data} min={hojeISO()} max={max} onChange={(e) => setData(e.target.value)} aria-label={t('banquete.dia')} />
        </label>
        <div className="mesa-campo row between"><div><div className="caption caption--s">{t('banquete.pessoas')}</div><b>{pessoas}</b></div><Counter small semValor value={pessoas} min={1} max={12} onChange={setPessoas} label={t('banquete.pessoas')} /></div>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <b style={{ fontSize: 14 }}>{t('banquete.horario')} · {dataCurta(data, lang)}</b>
        {horarios.isLoading ? <Sk h={80} /> : (horarios.data ?? []).length === 0 ? <span className="t-muted" style={{ fontSize: 14 }}>{t('banquete.semHorarios')}</span> : (
          <div className="slots">
            {horarios.data!.map((h) => (
              <button key={h.horario} type="button" className={`slot ${horario === h.horario ? 'is-on' : ''}`} disabled={h.status === 'LOTADO'} onClick={() => setHorario(h.horario)} aria-label={`${hora(h.horario)}${h.status === 'LOTADO' ? ' · ' + t('banquete.lotado') : ''}`}>
                {hora(h.horario)}
              </button>
            ))}
          </div>
        )}
        <span style={{ fontSize: 12, color: 'var(--pedra)' }}>{t('banquete.riscado')}</span>
      </div>
      <Toggle checked={cadeirinha} onChange={setCadeirinha} icon="child_care">{t('banquete.cadeirinha')}</Toggle>
      <Toggle checked={fogueira} onChange={setFogueira} icon="local_fire_department">{t('banquete.pertoFogueira')}</Toggle>
      {modo === 'hospede' ? (
        <TextField label={t('banquete.codigoReserva')} value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="HB-XXXX" />
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          <TextField label={t('banquete.seuNome')} value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
          <TextField label={t('banquete.seuEmail')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <TextField label={t('banquete.seuCelular')} type="tel" prefix="BR +55" value={cel} onChange={(e) => setCel(formatarCelular(e.target.value))} placeholder="(54) 9 0000-0000" />
        </div>
      )}
      {err && <Banner kind="erro" small title={err.titulo}>{err.message}</Banner>}
      <Button variant="fogo" size="lg" block disabled={!valido} loading={m.isPending} onClick={() => m.mutate()}>
        {horario ? t('banquete.reservarAs', { h: hora(horario, true, lang) }) : t('banquete.escolhaHorario')}
      </Button>
      <div style={{ fontSize: 12, color: 'var(--texto-2)', textAlign: 'center' }}>{t('banquete.tolerancia')}</div>
      <Modal open={!!ok} onClose={() => { setOk(null); onDone?.(); }} label={t('banquete.mesaReservada')}>
        <ModalIcon icon="restaurant" kind="ok" />
        <div className="modal__title">{t('banquete.mesaReservada')}</div>
        {ok && <p className="modal__text">{t('banquete.mesaReservadaTexto', { data: dataCurta(ok.data, lang), h: hora(ok.horario, true, lang), n: ok.pessoas, codigo: ok.codigo })}</p>}
        <Button variant="carvao" block onClick={() => { setOk(null); setHorario(null); onDone?.(); }}><Icon name="check" />{t('comum.fechar')}</Button>
      </Modal>
    </>
  );
}
