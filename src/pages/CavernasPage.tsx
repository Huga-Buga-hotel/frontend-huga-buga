import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { Trans } from 'react-i18next';
import { api } from '../api/endpoints';
import { useLang, useTriboTexto } from '../hooks';
import { useAuth } from '../context/auth';
import { buscaDeParams, buscaParaParams, useBusca, type Busca } from '../context/busca';
import { Banner, Button, Icon, ImageSlot } from '../components/ui/basics';
import { Checkbox, PriceRange, TextField, Toggle } from '../components/ui/form';
import { Modal, Sheet, useToast } from '../components/ui/overlay';
import { ErrorState } from '../components/ui/states';
import { DatasSheet, TriboSheet } from '../components/busca/Pickers';
import { CavernaListItem, CavernaListSkeleton } from '../components/cavernas/CavernaCards';
import { brl, intervalo, noites as calcNoites } from '../lib/format';
import { emailOk } from '../lib/regras';
import type { CategoriaCaverna, FiltrosRes } from '../api/types';

const CATS: CategoriaCaverna[] = ['FAMILIA', 'CASAL', 'AMIGOS', 'GRUPO'];
const PAGE_SIZE = 10;

/** A API recebe precoMin/precoMax em centavos, como o resto dos valores. */
const PRECO_EM_CENTAVOS = true;

interface Filtros {
  preco: [number, number] | null; // em reais
  comodidades: string[];
  acessivel: boolean;
  ordem: string;
}

function filtrosDeParams(p: URLSearchParams): Filtros {
  const pm = p.get('precoMin');
  const px = p.get('precoMax');
  return {
    preco: pm && px ? [Number(pm), Number(px)] : null,
    comodidades: (p.get('comodidades') ?? '').split(',').filter(Boolean),
    acessivel: p.get('acessivel') === 'true',
    ordem: p.get('ordem') ?? '',
  };
}

export default function CavernasPage() {
  const { t, lang } = useLang();
  const [params, setParams] = useSearchParams();
  const { busca: buscaCtx, setBusca } = useBusca();
  const busca = useMemo(() => buscaDeParams(params, buscaCtx), [params, buscaCtx]);
  const filtros = useMemo(() => filtrosDeParams(params), [params]);
  const page = Number(params.get('page') ?? 0);
  const tribo = useTriboTexto();
  const [datasOpen, setDatasOpen] = useState(false);
  const [triboOpen, setTriboOpen] = useState(false);
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [alertaOpen, setAlertaOpen] = useState(false);
  const [avisoFechado, setAvisoFechado] = useState(false);

  // a busca da URL vira a busca da tribo (pra detalhe e checkout)
  useEffect(() => {
    setBusca(busca);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()]);

  const opcoes = useQuery({ queryKey: ['filtros'], queryFn: api.cavernas.filtros, staleTime: 3_600_000 });
  const n = calcNoites(busca.checkIn, busca.checkOut);

  const fator = PRECO_EM_CENTAVOS ? 100 : 1;
  const q = useQuery({
    queryKey: ['cavernas', busca, filtros, page],
    queryFn: () =>
      api.cavernas.buscar({
        checkIn: busca.checkIn,
        checkOut: busca.checkOut,
        adultos: busca.adultos,
        idadesCriancas: busca.idadesCriancas,
        categoria: busca.categoria,
        precoMin: filtros.preco ? filtros.preco[0] * fator : undefined,
        precoMax: filtros.preco ? filtros.preco[1] * fator : undefined,
        comodidades: filtros.comodidades,
        acessivel: filtros.acessivel || undefined,
        ordem: filtros.ordem || undefined,
        page,
        size: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const atualizar = (b: Partial<Busca>, f: Partial<Filtros> = {}, novaPagina = 0) => {
    const nb = { ...busca, ...b };
    const nf = { ...filtros, ...f };
    const p = new URLSearchParams(buscaParaParams(nb));
    if (nf.preco) { p.set('precoMin', String(nf.preco[0])); p.set('precoMax', String(nf.preco[1])); }
    if (nf.comodidades.length) p.set('comodidades', nf.comodidades.join(','));
    if (nf.acessivel) p.set('acessivel', 'true');
    if (nf.ordem) p.set('ordem', nf.ordem);
    if (novaPagina) p.set('page', String(novaPagina));
    setParams(p);
  };

  const limpar = () => atualizar({ categoria: [] }, { preco: null, comodidades: [], acessivel: false });
  const nAtivos = busca.categoria.length + filtros.comodidades.length + (filtros.preco ? 1 : 0) + (filtros.acessivel ? 1 : 0);
  const total = q.data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = buscaParaParams(busca);
  const idades = busca.idadesCriancas.length ? ` (${busca.idadesCriancas.join(lang === 'en' ? ' & ' : ' e ')})` : '';

  const painelFiltros = (
    <FiltrosPainel
      opcoes={opcoes.data}
      categoria={busca.categoria}
      filtros={filtros}
      onCategoria={(c) => atualizar({ categoria: c })}
      onFiltros={(f) => atualizar({}, f)}
      onLimpar={limpar}
    />
  );

  return (
    <div className="container">
      <div className="page-head">
        <nav className="crumbs hide-mobile" aria-label="breadcrumb">
          <Link to="/">{t('comum.inicio')}</Link><Icon name="chevron_right" /><b>{t('comum.cavernas')}</b>
        </nav>
        {/* busca resumida */}
        <div className="board-s">
          <button className="board-s__item" onClick={() => setDatasOpen(true)}><Icon name="calendar_month" />{intervalo(busca.checkIn, busca.checkOut, lang)} · {t('comum.noites', { count: n })}</button>
          <span className="board-s__sep" />
          <button className="board-s__item" onClick={() => setTriboOpen(true)}><Icon name="groups" />{tribo(busca.adultos, busca.idadesCriancas.length)}{idades}</button>
          <span className="board-s__sep" />
          <span className="board-s__item grow" style={{ cursor: 'default' }}>
            <Icon name="cabin" />
            {busca.categoria.length === 1 ? t(`comum.categoria.${busca.categoria[0]}`) : t('busca.todasCavernas')}
          </span>
          <Button variant="carvao" size="sm" onClick={() => q.refetch()} loading={q.isFetching} loadingKind="feet" loadingText={t('busca.farejando')} style={{ boxShadow: 'none', padding: '12px 20px', fontWeight: 800 }}>
            {t('busca.atualizar')}
          </Button>
        </div>
        <button className="board-s__m" onClick={() => setDatasOpen(true)}>
          <Icon name="search" />
          <span className="grow">
            <b style={{ display: 'block', fontSize: 14 }}>{intervalo(busca.checkIn, busca.checkOut, lang)} · {t('comum.naTribo', { count: busca.adultos + busca.idadesCriancas.length })}</b>
            <span style={{ fontSize: 12, color: 'var(--pedra)' }}>{busca.categoria.length === 1 ? t(`comum.categoria.${busca.categoria[0]}`) : t('busca.todasCavernas')}</span>
          </span>
          <Icon name="edit" />
        </button>
      </div>

      <div className="lista">
        <aside className="filtros tx-couro filtros-desk" aria-label={t('lista.filtrosTribo')}>{painelFiltros}</aside>

        <div className="lista__res">
          {/* chips mobile */}
          <div className="chips chips--scroll lista__chips-m">
            <button className="chip chip--s is-on" onClick={() => setFiltrosOpen(true)}><Icon name="tune" />{nAtivos ? t('lista.filtrosN', { n: nAtivos }) : t('lista.filtros')}</button>
            {CATS.map((c) => (
              <button key={c} className={`chip chip--s ${busca.categoria.includes(c) ? 'is-on' : ''}`} onClick={() => atualizar({ categoria: busca.categoria.includes(c) ? busca.categoria.filter((x) => x !== c) : [...busca.categoria, c] })}>
                {t(`comum.categoria.${c}`)}
              </button>
            ))}
            {(opcoes.data?.ordens ?? []).filter((o) => o !== 'nota').slice(0, 2).map((o) => (
              <button key={o} className={`chip chip--s ${filtros.ordem === o ? 'is-on' : ''}`} onClick={() => atualizar({}, { ordem: filtros.ordem === o ? '' : o })}>
                {t(`lista.ordem.${o}` as 'lista.ordem.menor_preco', { defaultValue: o })}
              </button>
            ))}
          </div>

          <div className="lista__head">
            <div>
              <h1 className="t-h3">
                <span className="hide-mobile">{t('lista.titulo', { count: total })}</span>
                <span className="only-mobile">{t('lista.tituloMob', { count: total })}</span>
              </h1>
              <div className="t-muted hide-mobile" style={{ fontSize: 14, marginTop: 6 }}>
                {nAtivos ? t('lista.filtrosAtivos', { count: nAtivos }) : t('lista.semFiltros')}
              </div>
            </div>
            {(opcoes.data?.ordens.length ?? 0) > 0 && (
              <label className="lista__ordem">
                <span className="sr-only">{t('lista.ordenar')}</span>
                <select value={filtros.ordem || 'nota'} onChange={(e) => atualizar({}, { ordem: e.target.value === 'nota' ? '' : e.target.value })}>
                  {opcoes.data!.ordens.map((o) => <option key={o} value={o}>{t(`lista.ordem.${o}` as 'lista.ordem.menor_preco', { defaultValue: o })}</option>)}
                </select>
                <Icon name="expand_more" />
              </label>
            )}
          </div>

          {!avisoFechado && (q.data?.avisos ?? []).map((a, i) => (
            <Banner key={i} kind="ambar" onClose={() => setAvisoFechado(true)}>
              <span className="hide-mobile"><b>{t('lista.feriadoTitulo')}</b> {a}</span>
              <span className="only-mobile"><b>{t('lista.feriadoMob')}</b> {t('lista.feriadoMobTexto')}</span>
            </Banner>
          ))}

          {q.isError ? (
            <ErrorState erro={q.error} onRetry={() => q.refetch()} compacto />
          ) : q.isLoading ? (
            [0, 1, 2].map((i) => <CavernaListSkeleton key={i} />)
          ) : total === 0 ? (
            nAtivos > 0 ? (
              <div className="card" style={{ alignSelf: 'center', maxWidth: 420 }}>
                <div className="empty-mini">
                  <div className="empty-mini__icon"><Icon name="search_off" /></div>
                  <div className="t-h4">{t('lista.semResultadoTitulo')}</div>
                  <p style={{ fontSize: 14, color: 'var(--texto-corpo)' }}>{t('lista.semResultadoTexto')}</p>
                  <Button variant="contorno" size="md" onClick={limpar}>{t('lista.limparFiltros')}</Button>
                </div>
              </div>
            ) : (
              <SemDisponibilidade
                busca={busca}
                sugestoes={q.data?.sugestoes ?? []}
                onSugestao={(a, b) => atualizar({ checkIn: a, checkOut: b })}
                onAvisar={() => setAlertaOpen(true)}
                onTribo={() => setTriboOpen(true)}
              />
            )
          ) : (
            <>
              {q.data!.itens.map((c) => <CavernaListItem key={c.id} c={c} noites={n} qs={qs} checkIn={busca.checkIn} />)}
              {paginas > 1 && (
                <div className="pager" style={{ marginTop: 10 }}>
                  <button className="pager__arrow" disabled={page === 0} onClick={() => atualizar({}, {}, page - 1)} aria-label="Anterior"><Icon name="chevron_left" /></button>
                  {Array.from({ length: paginas }, (_, i) => (
                    <button key={i} className={i === page ? 'is-on' : ''} aria-current={i === page ? 'page' : undefined} onClick={() => atualizar({}, {}, i)}>{i + 1}</button>
                  ))}
                  <button className="pager__arrow" disabled={page >= paginas - 1} onClick={() => atualizar({}, {}, page + 1)} aria-label="Próxima"><Icon name="chevron_right" /></button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <DatasSheet open={datasOpen} onClose={() => setDatasOpen(false)} checkIn={busca.checkIn} checkOut={busca.checkOut} onConfirm={(a, b) => atualizar({ checkIn: a, checkOut: b })} />
      <TriboSheet open={triboOpen} onClose={() => setTriboOpen(false)} adultos={busca.adultos} idades={busca.idadesCriancas} onConfirm={(a, i) => atualizar({ adultos: a, idadesCriancas: i })} />
      <Sheet open={filtrosOpen} onClose={() => setFiltrosOpen(false)} label={t('lista.filtrosTribo')}>
        <div className="stack" style={{ gap: 20 }}>{painelFiltros}</div>
        <Button variant="carvao" size="md" block onClick={() => setFiltrosOpen(false)}>{t('lista.verN', { count: total })}</Button>
      </Sheet>
      <AlertaVagaModal open={alertaOpen} onClose={() => setAlertaOpen(false)} busca={busca} />
    </div>
  );
}

function FiltrosPainel({ opcoes, categoria, filtros, onCategoria, onFiltros, onLimpar }: {
  opcoes?: FiltrosRes; categoria: CategoriaCaverna[]; filtros: Filtros;
  onCategoria: (c: CategoriaCaverna[]) => void; onFiltros: (f: Partial<Filtros>) => void; onLimpar: () => void;
}) {
  const { t, lang } = useLang();
  const min = opcoes ? Math.floor(opcoes.precoMinCentavos / 100 / 10) * 10 : 300;
  const max = opcoes ? Math.ceil(opcoes.precoMaxCentavos / 100 / 10) * 10 : 1000;
  const [preco, setPreco] = useState<[number, number]>(filtros.preco ?? [min, max]);
  useEffect(() => { setPreco(filtros.preco ?? [min, max]); }, [filtros.preco, min, max]);
  const contagem = new Map((opcoes?.categorias ?? []).map((c) => [c.valor, c.quantidade]));

  return (
    <>
      <div className="row between" style={{ alignItems: 'baseline' }}>
        <span className="t-h5">{t('lista.filtrosTribo')}</span>
        <button className="link-btn" style={{ fontSize: 13, color: 'var(--brasa)', textDecoration: 'underline', fontWeight: 700 }} onClick={onLimpar}>{t('lista.limpar')}</button>
      </div>
      <div className="filtros__grupo">
        <b>{t('lista.precoNoite')}</b>
        <PriceRange
          min={min} max={max} value={preco}
          onChange={setPreco}
          format={(v) => brl(v * 100, lang)}
        />
        {(preco[0] !== (filtros.preco?.[0] ?? min) || preco[1] !== (filtros.preco?.[1] ?? max)) && (
          <Button variant="contorno" size="sm" onClick={() => onFiltros({ preco: preco[0] === min && preco[1] === max ? null : preco })}>{t('comum.aplicar')}</Button>
        )}
      </div>
      <div className="filtros__grupo">
        <b>{t('lista.tipo')}</b>
        {CATS.map((c) => (
          <Checkbox key={c} checked={categoria.includes(c)} count={contagem.get(c) ?? ''} onChange={(v) => onCategoria(v ? [...categoria, c] : categoria.filter((x) => x !== c))}>
            {t(`comum.tipoCaverna.${c}`)}
          </Checkbox>
        ))}
      </div>
      {(opcoes?.comodidades.length ?? 0) > 0 && (
        <div className="filtros__grupo">
          <b>{t('lista.comodidades')}</b>
          {opcoes!.comodidades.map((c) => (
            <Checkbox key={c.id} checked={filtros.comodidades.includes(c.id)} onChange={(v) => onFiltros({ comodidades: v ? [...filtros.comodidades, c.id] : filtros.comodidades.filter((x) => x !== c.id) })}>
              {c.nome}
            </Checkbox>
          ))}
        </div>
      )}
      <Toggle checked={filtros.acessivel} onChange={(v) => onFiltros({ acessivel: v })}><b>{t('lista.acessivel')}</b></Toggle>
    </>
  );
}

function SemDisponibilidade({ busca, sugestoes, onSugestao, onAvisar, onTribo }: {
  busca: Busca; sugestoes: { checkIn: string; checkOut: string; rotulo: string }[];
  onSugestao: (a: string, b: string) => void; onAvisar: () => void; onTribo: () => void;
}) {
  const { t, lang } = useLang();
  return (
    <div className="stack" style={{ gap: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,200px) 1fr', gap: 28, alignItems: 'center' }}>
        <div style={{ height: 170 }} className="hide-mobile"><ImageSlot caption={t('lista.lotadoImg')} mask="vazio" /></div>
        <div className="stack" style={{ gap: 10, gridColumn: 'span 1' }}>
          <h2 className="t-h3">{t('lista.lotadoTitulo')}</h2>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--texto-corpo)' }}>
            <Trans i18nKey="lista.lotadoTexto" values={{ datas: intervalo(busca.checkIn, busca.checkOut, lang), pessoas: t('comum.pessoas', { count: busca.adultos + busca.idadesCriancas.length }) }} components={{ b: <b /> }} />
          </p>
        </div>
      </div>
      {sugestoes.length > 0 && (
        <div className="sugestoes">
          {sugestoes.slice(0, 3).map((s) => (
            <button key={s.checkIn} className="sugestao" onClick={() => onSugestao(s.checkIn, s.checkOut)}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--link)', textTransform: 'uppercase' }}>{s.rotulo}</span>
              <span className="t-h5">{intervalo(s.checkIn, s.checkOut, lang)}</span>
              <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--link)', alignSelf: 'flex-end' }}>{t('lista.verSugestao')}</span>
            </button>
          ))}
        </div>
      )}
      <div className="row wrap" style={{ gap: 18, fontWeight: 700, fontSize: 14 }}>
        <Button variant="contorno" size="sm" icon="notifications" onClick={onAvisar}>{t('lista.avisarVaga')}</Button>
        <button className="link-btn link-btn--tinta" onClick={onTribo}>{t('lista.mudarTribo')}</button>
      </div>
    </div>
  );
}

function AlertaVagaModal({ open, onClose, busca }: { open: boolean; onClose: () => void; busca: Busca }) {
  const { t } = useLang();
  const toast = useToast();
  const { logado } = useAuth();
  const perfil = useQuery({ queryKey: ['me', 'perfil'], queryFn: api.me.perfil, enabled: logado && open });
  const [email, setEmail] = useState('');
  useEffect(() => { if (perfil.data?.email) setEmail(perfil.data.email); }, [perfil.data?.email]);
  const m = useMutation({
    mutationFn: () => api.atividades.alerta({ email, tipo: 'CAVERNA', checkIn: busca.checkIn, checkOut: busca.checkOut, pessoas: busca.adultos + busca.idadesCriancas.length }),
    onSuccess: () => { toast({ kind: 'ok', title: t('lista.alertaCriado'), text: t('lista.alertaTexto') }); onClose(); },
  });
  return (
    <Modal open={open} onClose={onClose} label={t('lista.avisarVaga')}>
      <div className="modal__icon modal__icon--fogo"><Icon name="notifications" /></div>
      <div className="modal__title" style={{ fontSize: 28 }}>{t('lista.avisarVaga')}</div>
      <form className="stack" style={{ gap: 14, alignSelf: 'stretch', textAlign: 'left' }} onSubmit={(e) => { e.preventDefault(); if (emailOk(email)) m.mutate(); }}>
        <TextField label={t('lista.alertaEmail')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" error={m.error ? (m.error as Error).message : undefined} />
        <div className="modal__actions">
          <Button variant="contorno" onClick={onClose}>{t('comum.fechar')}</Button>
          <Button variant="carvao" type="submit" loading={m.isPending} disabled={!emailOk(email)}>{t('lista.alertaConfirmar')}</Button>
        </div>
      </form>
    </Modal>
  );
}
