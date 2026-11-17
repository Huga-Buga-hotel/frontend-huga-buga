import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { isApiError, reservaEmails } from '../api/client';
import { useAuth } from '../context/auth';
import { buscaDeParams, useBusca } from '../context/busca';
import { useFavoritos, useLang, useTriboTexto } from '../hooks';
import { Banner, Button, Icon, ImageSlot, Sk } from '../components/ui/basics';
import { TextField } from '../components/ui/form';
import { Modal, useToast } from '../components/ui/overlay';
import { ErrorState, NotFoundContent, PageLoader } from '../components/ui/states';
import { DatasSheet, TriboSheet, type DiaInfo } from '../components/busca/Pickers';
import { addDays, brl, diaMes, hora, intervalo, nota, noites as calcNoites, parseISODate, toISODate } from '../lib/format';
import { emailOk, faixaIdade, PRAZO_CANCELAR_DIAS } from '../lib/regras';
import type { CavernaDetalheRes } from '../api/types';

type Aba = 'visao' | 'comodidades' | 'regras' | 'relatos';

export default function CavernaDetalhePage() {
  const { slug = '' } = useParams();
  const { t, lang } = useLang();
  const [params] = useSearchParams();
  const { busca: buscaCtx, setBusca } = useBusca();
  const busca = useMemo(() => buscaDeParams(params, buscaCtx), [params, buscaCtx]);
  const det = useQuery({ queryKey: ['caverna', slug], queryFn: () => api.cavernas.detalhe(slug) });

  if (det.isLoading) return <PageLoader />;
  if (det.isError) {
    if (isApiError(det.error) && det.error.status === 404) return <NotFoundContent />;
    return <ErrorState erro={det.error} onRetry={() => det.refetch()} />;
  }
  return <Detalhe d={det.data!} busca={busca} setBusca={setBusca} key={slug} lang={lang} t={t} />;
}

function Detalhe({ d, busca, setBusca, t, lang }: {
  d: CavernaDetalheRes; busca: ReturnType<typeof buscaDeParams>; setBusca: ReturnType<typeof useBusca>['setBusca'];
  t: ReturnType<typeof useLang>['t']; lang: string;
}) {
  const c = d.caverna;
  const nav = useNavigate();
  const toast = useToast();
  const { logado } = useAuth();
  const tribo = useTriboTexto();
  const { ids, toggle } = useFavoritos();
  const [aba, setAba] = useState<Aba>('visao');
  const [datasOpen, setDatasOpen] = useState(false);
  const [triboOpen, setTriboOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [galeria, setGaleria] = useState(false);
  const [mesCal, setMesCal] = useState(busca.checkIn.slice(0, 8) + '01');
  const refs = { visao: useRef<HTMLDivElement>(null), comodidades: useRef<HTMLDivElement>(null), regras: useRef<HTMLDivElement>(null), relatos: useRef<HTMLDivElement>(null) };

  const { checkIn, checkOut, adultos, idadesCriancas } = busca;
  const n = calcNoites(checkIn, checkOut);
  const filtros = useQuery({ queryKey: ['filtros'], queryFn: api.cavernas.filtros, staleTime: 3_600_000 });
  const cot = useQuery({
    queryKey: ['cotacao', c.id, checkIn, checkOut, adultos, idadesCriancas],
    queryFn: () => api.cavernas.cotacao(c.id, { checkIn, checkOut, adultos, idadesCriancas }),
    retry: false,
  });
  // disponibilidade da estadia (tocas livres) e do calendário (2 meses)
  const disp = useQuery({
    queryKey: ['disp', c.id, checkIn, checkOut],
    queryFn: () => api.cavernas.disponibilidade(c.id, checkIn, addDays(checkOut, -1)),
  });
  const calFim = toISODate(new Date(parseISODate(mesCal).getFullYear(), parseISODate(mesCal).getMonth() + 2, 0));
  const dispCal = useQuery({
    queryKey: ['disp', c.id, mesCal, calFim],
    queryFn: () => api.cavernas.disponibilidade(c.id, mesCal, calFim),
    enabled: datasOpen,
  });
  const relatos = useQuery({ queryKey: ['relatos', c.id], queryFn: () => api.cavernas.relatos(c.id, 0) });

  const livres = disp.data?.length ? Math.min(...disp.data.map((x) => x.unidadesLivres)) : null;
  const semVaga = livres === 0;
  const calInfo = useMemo(() => {
    const m: Record<string, DiaInfo> = {};
    (dispCal.data ?? []).forEach((x) => { m[x.data] = { disponivel: x.disponivel && x.unidadesLivres > 0, precoCentavos: x.precoNoiteCentavos, feriado: x.feriado }; });
    return m;
  }, [dispCal.data]);

  const criancasGratis = idadesCriancas.filter((i) => faixaIdade(i) === 'gratis').length;
  const prazo = addDays(checkIn, -PRAZO_CANCELAR_DIAS);
  const hIn = filtros.data?.horarioCheckIn ?? '14:00';
  const hOut = filtros.data?.horarioCheckOut ?? '12:00';
  const fav = ids.has(c.id);
  const fotos = d.fotos.length ? d.fotos : [{ url: '', legenda: c.nome }];
  // a galeria sempre tem 5 quadros (como no Figma): completa com as comodidades da caverna
  const quadros = [...fotos.map((f) => f.legenda), ...d.comodidades.map((x) => x.nome), t('detalhe.fixos.cafe'), t('detalhe.vista')].slice(0, 5);
  while (quadros.length < 5) quadros.push(c.nome);

  const criar = useMutation({
    mutationFn: (email?: string) =>
      api.reservas.criar({
        cavernaId: c.id, checkIn, checkOut, adultos, idadesCriancas,
        email: email || undefined,
        precoEsperadoCentavos: cot.data?.valorDiariasCentavos,
      }),
    onSuccess: (r, email) => {
      if (email) reservaEmails.set(r.codigo, email);
      else if (r.responsavelEmail) reservaEmails.set(r.codigo, r.responsavelEmail);
      nav(`/reserva/${r.codigo}/quem-vem`);
    },
    onError: (e) => {
      if (isApiError(e) && e.codigo === 'PRECO_ALTERADO') void cot.refetch();
      if (isApiError(e) && e.codigo === 'SEM_DISPONIBILIDADE') void disp.refetch();
      setEmailOpen(false);
    },
  });

  const reservar = () => {
    if (logado) criar.mutate(undefined);
    else setEmailOpen(true);
  };

  const compartilhar = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: c.nome, url });
      else { await navigator.clipboard.writeText(url); toast({ kind: 'info', title: t('comum.copiado'), text: t('detalhe.linkCopiado') }); }
    } catch { /* cancelado */ }
  };

  const irPara = (a: Aba) => {
    setAba(a);
    refs[a].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const erroReserva = criar.error && isApiError(criar.error) ? criar.error : null;
  const diarias = cot.data?.valorDiariasCentavos ?? c.precoBaseCentavos * n;
  const extrasAdulto = cot.data && cot.data.adultosExtras > 0 ? cot.data.detalhe.reduce((s, x) => s + x.adicionalAdultosCentavos, 0) : 0;
  const baseNoites = diarias - extrasAdulto;

  const features = [
    ...d.comodidades.map((cm) => ({ i: cm.icone, n: cm.nome, d: t(`detalhe.descricaoComodidade.${cm.id}` as 'detalhe.descricaoComodidade.vista-pro-vale', { defaultValue: t('detalhe.comodidadeFallback') }) })),
    { i: 'free_breakfast', n: t('detalhe.fixos.cafe'), d: t('detalhe.fixos.cafeDesc') },
    { i: 'wifi', n: t('detalhe.fixos.wifi'), d: t('detalhe.fixos.wifiDesc') },
    { i: 'ac_unit', n: t('detalhe.fixos.clima'), d: t('detalhe.fixos.climaDesc') },
  ].slice(0, 8);

  const cardReserva = (
    <aside className="card card--l reserva-card" aria-label={t('detalhe.reservarToca')}>
      <div className="row between" style={{ alignItems: 'baseline' }}>
        <span><span className="t-price" style={{ fontSize: 40 }}>{brl(c.precoBaseCentavos, lang)}</span><span className="t-muted" style={{ fontSize: 14 }}> {t('comum.porNoite')}</span></span>
        <b style={{ fontSize: 14 }}>★ {nota(c.notaMedia, lang)}</b>
      </div>
      <div className="reserva-card__campos">
        <div className="reserva-card__datas">
          <button onClick={() => setDatasOpen(true)}><div className="caption caption--s">{t('busca.chegada')}</div><b>{diaMes(checkIn, lang)} · {hora(hIn, true, lang)}</b></button>
          <button onClick={() => setDatasOpen(true)}><div className="caption caption--s">{t('busca.partida')}</div><b>{diaMes(checkOut, lang)} · {hora(hOut, true, lang)}</b></button>
        </div>
        <button className="row between" style={{ display: 'flex' }} onClick={() => setTriboOpen(true)}>
          <span><div className="caption caption--s">{t('busca.tribo')}</div><b>{tribo(adultos, idadesCriancas.length)}</b></span>
          <Icon name="expand_more" size={22} />
        </button>
      </div>
      {semVaga ? (
        <Banner kind="erro" small title={t('detalhe.semDisponibilidade')}>{t('detalhe.escolhaOutras')}</Banner>
      ) : livres != null && livres <= 2 ? (
        <div className="hot-line"><Icon name="local_fire_department" />{t('detalhe.restamTocas', { count: livres })}</div>
      ) : null}
      {erroReserva && (
        <Banner kind={erroReserva.codigo === 'PRECO_ALTERADO' ? 'ambar' : 'erro'} small title={erroReserva.titulo}>{erroReserva.message}</Banner>
      )}
      <Button variant="fogo" size="xl" block onClick={reservar} loading={criar.isPending} disabled={semVaga || cot.isError}>{t('detalhe.reservarToca')}</Button>
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--texto-2)' }}>{t('detalhe.naoCobrado')}</div>
      <div className="resumo dashed-top" style={{ fontSize: 15, paddingTop: 14, gap: 8 }}>
        {cot.isLoading ? <Sk h={60} /> : cot.isError ? (
          <Banner kind="ambar" small>{isApiError(cot.error) ? cot.error.message : t('estados.redeTitulo')}</Banner>
        ) : (
          <>
            <div className="resumo__linha"><span style={{ textDecoration: 'underline' }}>{t('detalhe.precoXNoites', { preco: brl(c.precoBaseCentavos, lang), noites: t('comum.noites', { count: n }) })}</span><span>{brl(baseNoites, lang)}</span></div>
            {extrasAdulto > 0 && <div className="resumo__linha"><span>{t('detalhe.adultosExtras', { n: cot.data!.adultosExtras })}</span><span>{brl(extrasAdulto, lang)}</span></div>}
            <div className="resumo__linha"><span>{t('detalhe.cafeIncluso', { n: adultos + idadesCriancas.length })}</span><span className="t-ok">{t('comum.incluso')}</span></div>
            {criancasGratis > 0 && <div className="resumo__linha"><span>{t('detalhe.criancasGratis')}</span><span className="t-ok">{t('comum.gratis')}</span></div>}
            {cot.data?.feriado && <div style={{ fontSize: 13, color: 'var(--ambar-escuro)', fontWeight: 600 }}>{t('detalhe.feriadoNoPeriodo')}</div>}
            <div className="resumo__total" style={{ fontSize: 17, marginTop: 4 }}><span>{t('comum.total')}</span><span>{brl(diarias, lang)}</span></div>
          </>
        )}
      </div>
      <div className="ok-line"><Icon name="check_circle" />{t('comum.cancelamentoGratis', { data: diaMes(prazo, lang) })}</div>
    </aside>
  );

  return (
    <div className="container">
      <div className="page-head det-top">
        <nav className="crumbs" aria-label="breadcrumb">
          <Link to="/">{t('comum.inicio')}</Link><Icon name="chevron_right" />
          <Link to="/cavernas">{t('comum.cavernas')}</Link><Icon name="chevron_right" />
          <b>{c.nome}</b>
        </nav>
        <div className="stack" style={{ gap: 18 }}>
          <div className="det-head">
            <div className="stack" style={{ gap: 10 }}>
              <span className="tag tag--bege" style={{ alignSelf: 'flex-start', textTransform: 'uppercase' }}>{t(`comum.categoria.${c.categoria}`)} · {c.ala}</span>
              <h1 className="t-h1">{c.nome}</h1>
              <div className="row wrap" style={{ gap: 16, fontSize: 15, color: 'var(--texto-corpo)' }}>
                <b style={{ color: 'var(--carvao)' }}>★ {nota(c.notaMedia, lang)}</b>
                <button className="hide-mobile" style={{ textDecoration: 'underline' }} onClick={() => irPara('relatos')}>{t('detalhe.relatosDaTribo', { n: c.totalRelatos })}</button>
                <span className="only-mobile" style={{ fontSize: 13 }}>{t('comum.relatos', { count: c.totalRelatos })} · {t('detalhe.ateNPessoas', { n: c.capacidade })}</span>
                {d.comodidades.some((x) => x.id === 'vista-pro-vale') && (
                  <span className="row hide-mobile" style={{ gap: 4 }}>· <Icon name="landscape" size={18} />{t('detalhe.vista')}</span>
                )}
              </div>
            </div>
            <div className="row det-head__acoes" style={{ gap: 10 }}>
              <Button variant="contorno" size="sm" icon="ios_share" onClick={compartilhar} style={{ fontWeight: 700 }}>{t('detalhe.compartilhar')}</Button>
              <Button variant="contorno" size="sm" onClick={() => toggle(c)} aria-pressed={fav} style={{ fontWeight: 700 }}>
                <Icon name="favorite" fill={fav} style={fav ? { color: 'var(--fogo)' } : undefined} />{fav ? t('detalhe.salva') : t('detalhe.salvar')}
              </Button>
            </div>
          </div>
          <div className="det-galeria">
            {quadros.map((legenda, i) => (
              <div key={i}>
                <ImageSlot caption={i === 0 ? t('detalhe.fotoPrincipal', { legenda }) : legenda} mask={i === 0 ? 'lasca' : undefined} />
                {i === 4 && (
                  <Button variant="contorno" size="xs" icon="grid_view" className="det-galeria__mais" onClick={() => setGaleria(true)} style={{ background: 'var(--papel)' }}>
                    {t('detalhe.verFotos', { n: fotos.length })}
                  </Button>
                )}
              </div>
            ))}
            <div className="det-galeria__float">
              <button className="icon-btn icon-btn--m" onClick={() => nav(-1)} aria-label={t('comum.voltar')}><Icon name="arrow_back" /></button>
              <div className="row" style={{ gap: 8 }}>
                <button className="icon-btn icon-btn--m" onClick={compartilhar} aria-label={t('detalhe.compartilhar')}><Icon name="ios_share" size={20} /></button>
                <button className={`icon-btn icon-btn--m ${fav ? 'is-on' : ''}`} onClick={() => toggle(c)} aria-pressed={fav} aria-label={t('detalhe.salvar')}><Icon name="favorite" size={20} /></button>
              </div>
            </div>
            <span className="det-galeria__count only-mobile">1 / {fotos.length}</span>
          </div>
        </div>
      </div>

      <div className="det-corpo">
        <div className="stack" style={{ gap: 28 }}>
          <div className="tabs hide-mobile" role="tablist">
            {(['visao', 'comodidades', 'regras', 'relatos'] as Aba[]).map((a) => (
              <button key={a} role="tab" aria-selected={aba === a} className={aba === a ? 'is-on' : ''} onClick={() => irPara(a)}>{t(`detalhe.abas.${a}`)}</button>
            ))}
          </div>
          <div className="det-amenities-m">
            {features.slice(0, 4).map((f) => <div key={f.n}><Icon name={f.i} />{f.n.split(' ')[0]}</div>)}
          </div>
          <div ref={refs.visao} style={{ scrollMarginTop: 120 }}>
            <p className="det-desc">{d.descricao}</p>
          </div>
          {livres != null && livres > 0 && livres <= 2 && (
            <div className="only-mobile" style={{ fontSize: 13, fontWeight: 700, color: 'var(--brasa)' }}>
              <span className="row" style={{ gap: 6 }}><Icon name="local_fire_department" fill size={18} />{t('detalhe.restamTocas', { count: livres })}</span>
            </div>
          )}
          <div ref={refs.comodidades} className="grid-2 hide-mobile" style={{ scrollMarginTop: 120 }}>
            {features.map((f) => (
              <div key={f.n} className="amenity">
                <div className="amenity__icon"><Icon name={f.i} /></div>
                <div><div className="amenity__name">{f.n}</div><div className="amenity__desc">{f.d}</div></div>
              </div>
            ))}
          </div>
          <div ref={refs.regras} className="stack" style={{ gap: 14, scrollMarginTop: 120 }}>
            <h3 className="t-h4">{t('detalhe.regras')}</h3>
            <div className="det-regras">
              <div><Icon name="login" /><span><b>{t('detalhe.checkin')}</b><br />{t('detalhe.checkinDesc', { h: hora(hIn, true, lang) })}</span></div>
              <div><Icon name="logout" /><span><b>{t('detalhe.checkout')}</b><br />{t('detalhe.checkoutDesc', { h: hora(hOut, true, lang) })}</span></div>
              <div><Icon name="pets" /><span><b>{t('detalhe.pets')}</b><br />{c.aceitaPets ? t('detalhe.petsSim') : t('detalhe.petsNao')}</span></div>
              {c.acessivel && <div><Icon name="accessible" /><span><b>{t('detalhe.acessivel')}</b><br />{t('detalhe.acessivelDesc')}</span></div>}
            </div>
          </div>
          <div ref={refs.relatos} className="stack" style={{ gap: 14, scrollMarginTop: 120 }}>
            <h3 className="t-h4">{t('detalhe.abas.relatos')}</h3>
            {relatos.data?.itens.length ? relatos.data.itens.slice(0, 6).map((r) => (
              <div key={r.id} className="det-relato">
                <div className="row" style={{ gap: 10 }}><span className="estrelas" aria-label={`${r.nota}/5`}>{'★'.repeat(r.nota)}{'☆'.repeat(5 - r.nota)}</span><b>{r.autor}</b><span className="t-muted" style={{ fontSize: 13 }}>{new Date(r.criadoEm).toLocaleDateString(lang)}</span></div>
                {r.texto && <p style={{ fontSize: 15, color: 'var(--texto-forte)' }}>{r.texto}</p>}
                {r.fotos.length > 0 && <div className="det-relato__fotos">{r.fotos.map((u) => <img key={u} src={u} alt="" loading="lazy" />)}</div>}
              </div>
            )) : <p className="t-muted">{t('detalhe.semRelatos')}</p>}
          </div>
        </div>
        {cardReserva}
      </div>

      {/* barra fixa mobile */}
      <div className="det-barra-m">
        <div>
          <div><span className="t-price" style={{ fontSize: 26 }}>{brl(c.precoBaseCentavos, lang)}</span><span style={{ fontSize: 12, color: 'var(--texto-2)' }}> {t('comum.porNoite')}</span></div>
          <button style={{ fontSize: 12, fontWeight: 700, textDecoration: 'underline' }} onClick={() => setDatasOpen(true)}>
            {intervalo(checkIn, checkOut, lang)} · {t('comum.pessoas', { count: adultos + idadesCriancas.length })}
          </button>
        </div>
        <Button variant="fogo" onClick={reservar} loading={criar.isPending} disabled={semVaga}>{t('comum.reservar')}</Button>
      </div>
      {erroReserva && <div className="only-mobile" style={{ paddingBottom: 12 }}><Banner kind="erro" small title={erroReserva.titulo}>{erroReserva.message}</Banner></div>}

      <DatasSheet open={datasOpen} onClose={() => setDatasOpen(false)} checkIn={checkIn} checkOut={checkOut} info={calInfo} onMesChange={setMesCal}
        onConfirm={(a, b) => { setBusca({ checkIn: a, checkOut: b }); nav(`?checkIn=${a}&checkOut=${b}&adultos=${adultos}${idadesCriancas.length ? `&idadesCriancas=${idadesCriancas.join(',')}` : ''}`, { replace: true }); }} />
      <TriboSheet open={triboOpen} onClose={() => setTriboOpen(false)} adultos={adultos} idades={idadesCriancas} capacidade={c.capacidade}
        onConfirm={(a, i) => { setBusca({ adultos: a, idadesCriancas: i }); nav(`?checkIn=${checkIn}&checkOut=${checkOut}&adultos=${a}${i.length ? `&idadesCriancas=${i.join(',')}` : ''}`, { replace: true }); }} />
      <EmailReservaModal open={emailOpen} onClose={() => setEmailOpen(false)} loading={criar.isPending} onConfirm={(e) => criar.mutate(e)} />
      <Modal open={galeria} onClose={() => setGaleria(false)} label={t('detalhe.galeria', { nome: c.nome })} wide>
        <div className="row between"><span className="t-h4">{t('detalhe.galeria', { nome: c.nome })}</span><button className="icon-btn icon-btn--s" onClick={() => setGaleria(false)} aria-label={t('comum.fechar')}><Icon name="close" /></button></div>
        <div className="grid-2">{fotos.map((f, i) => <div key={i} style={{ height: 200 }}><ImageSlot caption={f.legenda} radius={12} /></div>)}</div>
      </Modal>
    </div>
  );
}

function EmailReservaModal({ open, onClose, onConfirm, loading }: { open: boolean; onClose: () => void; onConfirm: (email: string) => void; loading: boolean }) {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [tocou, setTocou] = useState(false);
  const invalido = tocou && !emailOk(email);
  return (
    <Modal open={open} onClose={onClose} label={t('detalhe.emailReserva')}>
      <div className="modal__icon modal__icon--fogo"><Icon name="hourglass_top" /></div>
      <div className="modal__title" style={{ fontSize: 28 }}>{t('detalhe.emailReserva')}</div>
      <p className="modal__text">{t('detalhe.emailReservaTexto')}</p>
      <form className="stack" style={{ gap: 12, alignSelf: 'stretch', textAlign: 'left' }} onSubmit={(e) => { e.preventDefault(); setTocou(true); if (emailOk(email)) onConfirm(email.trim()); }}>
        <TextField label={t('reserva.email')} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTocou(true)} error={invalido ? t('reserva.erroEmail') : undefined} valid={tocou && emailOk(email)} help={t('reserva.emailAjuda')} />
        <Button variant="fogo" size="lg" block type="submit" loading={loading}>{t('detalhe.segurarToca')}</Button>
      </form>
      <span style={{ fontSize: 14, color: 'var(--texto-2)' }}>{t('detalhe.temConta')} <Link to="/entrar" state={{ de: window.location.pathname + window.location.search }}>{t('comum.entrar')}</Link></span>
    </Modal>
  );
}
