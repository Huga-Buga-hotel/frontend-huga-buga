import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { isApiError, reservaEmails } from '../api/client';
import { useAuth } from '../context/auth';
import { useLang } from '../hooks';
import { Banner, Button, Icon, ImageSlot, Sk } from '../components/ui/basics';
import { Counter, TextField } from '../components/ui/form';
import { Modal, ModalIcon, useToast } from '../components/ui/overlay';
import { ErrorState } from '../components/ui/states';
import { addDays, brl, dataCurta, diaSemanaCurto, duracao, hojeISO, hora, horaDeInstante, intervalo, noites } from '../lib/format';
import { emailOk } from '../lib/regras';
import type { AtividadeRes, CategoriaAtividade, SessaoDoDiaRes } from '../api/types';

const CATS: { c: CategoriaAtividade; i: string }[] = [
  { c: 'CRIANCAS', i: 'child_care' }, { c: 'FAMILIA', i: 'family_restroom' }, { c: 'AVENTURA', i: 'hiking' }, { c: 'NOITE', i: 'bedtime' }, { c: 'ADULTOS', i: 'spa' },
];

function idadeTexto(a: AtividadeRes, t: ReturnType<typeof useLang>['t']) {
  if (a.idadeMin != null && a.idadeMax != null) return t('experiencias.idadeFaixa', { a: a.idadeMin, b: a.idadeMax });
  if (a.idadeMin != null) return t('experiencias.idadeMais', { n: a.idadeMin });
  return a.categoria === 'NOITE' || a.categoria === 'FAMILIA' ? t('experiencias.todasIdades') : t('experiencias.todasIdades');
}

export default function ExperienciasPage() {
  const { t, lang } = useLang();
  const { logado } = useAuth();
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const toast = useToast();
  const [cat, setCat] = useState<CategoriaAtividade | ''>('');
  const [agendar, setAgendar] = useState<AtividadeRes | null>(null);
  const [semReserva, setSemReserva] = useState(false);
  const [sucesso, setSucesso] = useState<{ nome: string; data: string; hora: string; qtd: number; valor: number } | null>(null);
  const [avisar, setAvisar] = useState<SessaoDoDiaRes | null>(null);

  // estadia: ?reserva=HB-XXXX ou a próxima confirmada da conta
  const minhas = useQuery({ queryKey: ['me', 'reservas', 'proximas'], queryFn: () => api.me.reservas('proximas'), enabled: logado });
  const confirmadas = (minhas.data?.estadias ?? []).filter((r) => r.status === 'CONFIRMADA');
  const codigo = params.get('reserva') ?? confirmadas[0]?.codigo ?? null;
  const reserva = useQuery({ queryKey: ['reserva', codigo], queryFn: () => api.reservas.obter(codigo!), enabled: !!codigo, retry: false });
  const r = reserva.data && reserva.data.status === 'CONFIRMADA' ? reserva.data : null;

  const dias = useMemo(() => {
    if (r) return Array.from({ length: noites(r.checkIn, r.checkOut) + 1 }, (_, i) => addDays(r.checkIn, i)).slice(0, 7);
    return Array.from({ length: 4 }, (_, i) => addDays(hojeISO(), i + 1));
  }, [r]);
  const [dia, setDia] = useState<string>('');
  useEffect(() => { if (!dias.includes(dia)) setDia(dias.length > 1 && r ? dias[1] : dias[0]); }, [dias, dia, r]);

  const catalogo = useQuery({ queryKey: ['atividades'], queryFn: () => api.atividades.catalogo(), staleTime: 600_000 });
  const sessoes = useQuery({ queryKey: ['sessoes', dia], queryFn: () => api.atividades.sessoesDoDia(dia), enabled: !!dia });
  const agendamentos = useQuery({ queryKey: ['agendamentos', r?.codigo], queryFn: () => api.atividades.agendamentos(r!.codigo), enabled: !!r });
  const agenda = useQuery({ queryKey: ['agenda', r?.codigo, dia], queryFn: () => api.atividades.agenda(r!.codigo, dia), enabled: !!r && !!dia });

  const porAtividade = useMemo(() => {
    const m = new Map<string, SessaoDoDiaRes[]>();
    (sessoes.data ?? []).forEach((s) => m.set(s.atividadeId, [...(m.get(s.atividadeId) ?? []), s]));
    return m;
  }, [sessoes.data]);
  const itens = (catalogo.data?.itens ?? []).filter((a) => !cat || a.categoria === cat);
  const destaque = itens.find((a) => a.destaque) ?? null;
  const grade = itens.filter((a) => a !== destaque);
  const totalAtv = catalogo.data?.itens.length ?? 0;
  const contAg = (d: string) => (agendamentos.data ?? []).filter((a) => a.status === 'ATIVO' && a.inicio.slice(0, 10) === d).length;

  const abrir = (a: AtividadeRes) => (r ? setAgendar(a) : setSemReserva(true));
  const proxSessao = (a: AtividadeRes) => (porAtividade.get(a.id) ?? []).find((s) => !s.esgotada) ?? null;
  const esgotada = (a: AtividadeRes) => { const l = porAtividade.get(a.id) ?? []; return l.length > 0 && l.every((s) => s.esgotada); };

  const precoTxt = (a: AtividadeRes) => (a.precoCentavos === 0 ? t('experiencias.gratis') : brl(a.precoCentavos, lang));
  const vagaInfo = (a: AtividadeRes): { txt: string; cor: string } => {
    if (a.precoCentavos === 0 && !proxSessao(a)) return { txt: t('experiencias.livre'), cor: 'var(--musgo)' };
    const s = proxSessao(a);
    if (!s) return { txt: '', cor: 'var(--musgo)' };
    return s.vagasLivres <= 4 ? { txt: t('comum.restam', { n: s.vagasLivres }), cor: 'var(--link)' } : { txt: t('comum.vagas', { count: s.vagasLivres }), cor: 'var(--musgo)' };
  };

  return (
    <div className="container">
      <div className="exp-head">
        <div className="stack" style={{ gap: 8 }}>
          <span className="eyebrow hide-mobile">{t('experiencias.eyebrow')}</span>
          <h1 className="t-h1">{t('experiencias.titulo')}</h1>
          <p className="hide-mobile" style={{ fontSize: 17, color: 'var(--texto-corpo)', maxWidth: 560 }}>
            {r ? t('experiencias.subComReserva', { datas: intervalo(r.checkIn, r.checkOut, lang) }) : t('experiencias.subSemReserva')}
          </p>
          {logado && confirmadas.length > 1 && (
            <label className="row" style={{ gap: 8, fontSize: 14, fontWeight: 700 }}>
              {t('experiencias.escolhaReserva')}
              <select className="select" style={{ width: 'auto', padding: '6px 34px 6px 10px' }} value={codigo ?? ''} onChange={(e) => setParams({ reserva: e.target.value })}>
                {confirmadas.map((x) => <option key={x.codigo} value={x.codigo}>{x.cavernaNome} · {intervalo(x.checkIn, x.checkOut, lang)}</option>)}
              </select>
            </label>
          )}
        </div>
        <div className="days exp-days" role="tablist">
          {dias.map((d, i) => {
            const c = r ? (i === 0 ? t('experiencias.chegada') : i === dias.length - 1 ? t('experiencias.partida') : contAg(d) ? t('experiencias.reservasNoDia', { count: contAg(d) }) : '') : '';
            return (
              <button key={d} role="tab" aria-selected={d === dia} className={`day ${d === dia ? 'is-on' : ''}`} onClick={() => setDia(d)}>
                <span className="day__w">{diaSemanaCurto(d, lang)}</span>
                <span className="day__n">{Number(d.slice(8))}</span>
                <span className="day__c hide-mobile">{c || ' '}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="chips chips--scroll" style={{ paddingTop: 24 }}>
        <button className={`chip ${cat === '' ? 'is-on' : ''}`} onClick={() => setCat('')}>
          <span className="hide-mobile">{t('experiencias.todas', { n: totalAtv })}</span><span className="only-mobile">{t('experiencias.todasCurto')}</span>
        </button>
        {CATS.map(({ c, i }) => (
          <button key={c} className={`chip ${cat === c ? 'is-on' : ''}`} onClick={() => setCat(cat === c ? '' : c)}>
            <Icon name={i} />{c === 'CRIANCAS' ? t('experiencias.catCriancasIdade') : t(`experiencias.cat.${c}`)}
          </button>
        ))}
      </div>

      <div className="exp-grid">
        <div className="stack" style={{ gap: 24, minWidth: 0 }}>
          {catalogo.isError && <ErrorState erro={catalogo.error} onRetry={() => catalogo.refetch()} compacto />}
          {catalogo.isLoading && <Sk h={300} />}
          {destaque && (
            <div className="exp-destaque">
              <div style={{ position: 'relative', minHeight: 240 }}>
                <ImageSlot caption={t('experiencias.fotoDe', { nome: destaque.nome })} dark />
                <span className="tag tag--fogo" style={{ position: 'absolute', top: 16, left: 16 }}>{destaque.destaque}</span>
              </div>
              <div className="exp-destaque__txt">
                <h2 className="t-h3">{destaque.nome}</h2>
                <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--osso-2)' }}>{destaque.descricao}</p>
                <div className="row wrap" style={{ gap: 16, fontSize: 14, color: '#e8dccb' }}>
                  {(porAtividade.get(destaque.id) ?? []).length > 0 && (
                    <span className="row" style={{ gap: 5 }}><Icon name="schedule" size={18} style={{ color: 'var(--tocha)' }} />{(porAtividade.get(destaque.id) ?? []).map((s) => hora(horaDeInstante(s.inicio), true, lang)).join(' · ')}</span>
                  )}
                  <span className="row" style={{ gap: 5 }}><Icon name="timer" size={18} style={{ color: 'var(--tocha)' }} />{duracao(destaque.duracaoMin)}</span>
                  <span className="row" style={{ gap: 5 }}><Icon name="child_care" size={18} style={{ color: 'var(--tocha)' }} />{idadeTexto(destaque, t)}</span>
                </div>
                {proxSessao(destaque) && (() => {
                  const s = proxSessao(destaque)!;
                  const ocupadas = s.vagasTotais - s.vagasLivres;
                  return (
                    <div className="vagas vagas--escuro">
                      <div className="vagas__head"><span>{t('experiencias.vagasAs', { h: hora(horaDeInstante(s.inicio), true, lang) })}</span><span style={{ color: 'var(--tocha)' }}>{t('experiencias.restamDe', { n: s.vagasLivres, total: s.vagasTotais })}</span></div>
                      <div className="vagas__blocos" style={{ gridTemplateColumns: `repeat(${Math.min(s.vagasTotais, 30)}, 1fr)` }}>
                        {Array.from({ length: Math.min(s.vagasTotais, 30) }, (_, i) => <span key={i} className={i < ocupadas ? 'is-on' : ''} />)}
                      </div>
                    </div>
                  );
                })()}
                <div className="row between" style={{ marginTop: 'auto', gap: 12 }}>
                  <span><span className="t-price" style={{ fontSize: 30 }}>{precoTxt(destaque)}</span>{destaque.precoCentavos > 0 && <span style={{ fontSize: 13, color: 'var(--osso-2)' }}> {destaque.cobranca === 'POR_CRIANCA' ? t('experiencias.porCrianca') : t('experiencias.porPessoa')}</span>}</span>
                  <Button variant="fogo" size="md" onClick={() => abrir(destaque)} disabled={esgotada(destaque)}>{t('experiencias.reservarVaga')}</Button>
                </div>
              </div>
            </div>
          )}
          <div className="exp-cards">
            {grade.map((a) => {
              const sold = esgotada(a);
              const v = vagaInfo(a);
              const horas = (porAtividade.get(a.id) ?? []).map((s) => hora(horaDeInstante(s.inicio), true, lang));
              return (
                <article key={a.id} className="exp-card card card--sombra">
                  <div className="exp-card__img">
                    <ImageSlot caption={t('experiencias.fotoDe', { nome: a.nome })} mask="lasca" className="hide-mobile" />
                    <ImageSlot caption={a.nome} radius={10} className="only-mobile" />
                    <span className="tag tag--papel hide-mobile" style={{ position: 'absolute', top: 10, left: 10, fontSize: 11, padding: '4px 9px' }}>{t(`experiencias.catTag.${a.categoria}`)}</span>
                  </div>
                  <div className="exp-card__body">
                    <div className="exp-card__nome">{a.nome}</div>
                    <div className="meta" style={{ fontSize: 13, gap: 12 }}>
                      <span><Icon name="schedule" size={16} />{horas.join(' · ') || duracao(a.duracaoMin)}</span>
                      <span><Icon name="groups" size={16} />{idadeTexto(a, t)}</span>
                    </div>
                    <div className="exp-card__foot dashed-top">
                      {sold ? (
                        <>
                          <div><div className="t-price" style={{ fontSize: 22, color: 'var(--pedra-clara)', textDecoration: 'line-through' }}>{precoTxt(a)}</div><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--barro-erro)' }}>{t('experiencias.esgotado')}</div></div>
                          <button className="link-btn" style={{ color: 'var(--pedra)', fontSize: 13 }} onClick={() => setAvisar((porAtividade.get(a.id) ?? [])[0])}><Icon name="notifications" size={18} />{t('experiencias.avisar')}</button>
                        </>
                      ) : (
                        <>
                          <div><div className="t-price" style={{ fontSize: 22 }}>{precoTxt(a)}</div><div style={{ fontSize: 12, fontWeight: 700, color: v.cor }}>{v.txt}</div></div>
                          <Button variant="contorno" size="sm" onClick={() => abrir(a)} style={{ padding: '8px 12px', fontSize: 13 }}>{t('experiencias.reservar')}</Button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
            {!catalogo.isLoading && itens.length === 0 && <p className="t-muted">{t('experiencias.nenhumaAtividade')}</p>}
          </div>
        </div>

        <aside className="panel--couro tx-couro exp-agenda" aria-label={t('experiencias.agendaTribo')}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: 'var(--brasa)', textTransform: 'uppercase' }}>{dia && dataCurta(dia, lang)}</div>
            <div className="t-h4">{t('experiencias.agendaTribo')}</div>
          </div>
          {r ? (
            <>
              {(agenda.data?.itens ?? []).map((g, i) => (
                <div key={i} className="agenda-item">
                  <span className="t-price" style={{ fontSize: 20, paddingTop: 2 }}>{hora(g.hora, true, lang)}</span>
                  <div className="agenda-item__box"><div style={{ fontWeight: 800, fontSize: 14 }}>{g.titulo}</div><div style={{ fontSize: 12, color: 'var(--texto-2)' }}>{g.detalhe}</div></div>
                </div>
              ))}
              {!(agenda.data?.itens ?? []).some((g) => g.hora >= '16:00' && g.hora < '19:00') && (
                <div className="agenda-livre"><Icon name="add" />{t('experiencias.livreDas', { a: hora('16:00', true, lang), b: hora('19:00', true, lang) })}</div>
              )}
              <div style={{ fontSize: 12, color: 'var(--texto-2)', lineHeight: 1.5 }}>{t('experiencias.notaAgenda')}</div>
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, color: 'var(--texto-forte)' }}>{t('experiencias.semReservaTexto')}</p>
              <Link to="/cavernas" className="btn btn--carvao btn--sm" style={{ boxShadow: 'none' }}>{t('home.verCavernas')}</Link>
              <Link to="/buscar-reserva" className="link-btn link-btn--tinta" style={{ fontSize: 14 }}>{t('experiencias.encontrarReserva')}</Link>
            </>
          )}
        </aside>
      </div>

      {agendar && r && (
        <AgendarModal a={agendar} sessoes={porAtividade.get(agendar.id) ?? []} codigo={r.codigo} max={r.adultos + r.criancas} dia={dia}
          onClose={() => setAgendar(null)}
          onOk={(info) => { setAgendar(null); setSucesso(info); void qc.invalidateQueries({ queryKey: ['agendamentos'] }); void qc.invalidateQueries({ queryKey: ['agenda'] }); void qc.invalidateQueries({ queryKey: ['sessoes'] }); }} />
      )}
      <Modal open={semReserva} onClose={() => setSemReserva(false)} label={t('experiencias.semReservaTitulo')}>
        <ModalIcon icon="cabin" kind="fogo" />
        <div className="modal__title" style={{ fontSize: 28 }}>{t('experiencias.semReservaTitulo')}</div>
        <p className="modal__text">{t('experiencias.semReservaTexto')}</p>
        <div className="modal__actions">
          <Link to="/cavernas" className="btn btn--fogo btn--md">{t('home.verCavernas')}</Link>
          <Link to="/buscar-reserva" className="btn btn--contorno btn--md">{t('experiencias.encontrarReserva')}</Link>
        </div>
        {!logado && <Link to="/entrar" className="link-btn link-btn--muted">{t('comum.entrar')}</Link>}
      </Modal>
      <Modal open={!!sucesso} onClose={() => setSucesso(null)} label={t('experiencias.garantida')}>
        <ModalIcon icon="check" kind="ok" />
        <div className="modal__title" style={{ fontSize: 34 }}>{t('experiencias.garantida')}</div>
        {sucesso && (
          <p className="modal__text" style={{ whiteSpace: 'pre-line' }}>
            {t('experiencias.garantidaTexto', { nome: sucesso.nome, data: dataCurta(sucesso.data, lang), hora: sucesso.hora, qtd: t('comum.pessoas', { count: sucesso.qtd }), valor: brl(sucesso.valor, lang) })}
          </p>
        )}
        <div className="modal__actions">
          <Button variant="carvao" size="md" onClick={() => { setSucesso(null); document.querySelector('.exp-agenda')?.scrollIntoView({ behavior: 'smooth' }); }}>{t('experiencias.verAgenda')}</Button>
          <Button variant="contorno" size="md" onClick={() => setSucesso(null)}>{t('comum.fechar')}</Button>
        </div>
      </Modal>
      <AvisarModal sessao={avisar} email={r?.responsavelEmail ?? (codigo ? reservaEmails.get(codigo) : undefined)} onClose={() => setAvisar(null)} onOk={() => { setAvisar(null); toast({ kind: 'ok', title: t('experiencias.avisoCriado') }); }} />
    </div>
  );
}

function AgendarModal({ a, sessoes, codigo, max, dia, onClose, onOk }: {
  a: AtividadeRes; sessoes: SessaoDoDiaRes[]; codigo: string; max: number; dia: string;
  onClose: () => void; onOk: (i: { nome: string; data: string; hora: string; qtd: number; valor: number }) => void;
}) {
  const { t, lang } = useLang();
  const livres = sessoes.filter((s) => !s.esgotada);
  const [sessao, setSessao] = useState(livres[0]?.sessaoId ?? '');
  const [qtd, setQtd] = useState(1);
  const s = sessoes.find((x) => x.sessaoId === sessao);
  const maxQ = Math.max(1, Math.min(max, s?.vagasLivres ?? 1));
  const m = useMutation({
    mutationFn: () => api.atividades.agendar(codigo, sessao, qtd),
    onSuccess: (ag) => onOk({ nome: a.nome, data: dia, hora: hora(horaDeInstante(ag.inicio), true, lang), qtd: ag.quantidade, valor: ag.valorCentavos }),
  });
  const err = m.error && isApiError(m.error) ? m.error : null;
  return (
    <Modal open onClose={onClose} label={t('experiencias.agendarTitulo', { nome: a.nome })} wide>
      <div className="row between"><span className="t-h4">{t('experiencias.agendarTitulo', { nome: a.nome })}</span><button className="icon-btn icon-btn--s" onClick={onClose} aria-label={t('comum.fechar')}><Icon name="close" /></button></div>
      <p style={{ fontSize: 14, color: 'var(--texto-corpo)' }}>{a.descricao}</p>
      {err && <Banner kind="erro" small title={err.titulo}>{err.message}</Banner>}
      <div className="stack" style={{ gap: 8 }}>
        <b style={{ fontSize: 14 }}>{t('experiencias.horario')} · {dataCurta(dia, lang)}</b>
        {sessoes.length === 0 ? <p className="t-muted">{t('experiencias.semHorarios')}</p> : (
          <div className="slots">
            {sessoes.map((x) => (
              <button key={x.sessaoId} type="button" className={`slot ${sessao === x.sessaoId ? 'is-on' : ''}`} disabled={x.esgotada} onClick={() => { setSessao(x.sessaoId); setQtd(1); }}>
                {hora(horaDeInstante(x.inicio), false, lang)}
              </button>
            ))}
          </div>
        )}
        {s && (
          <div className="vagas">
            <div className="vagas__head"><span>{t('experiencias.vagasAs', { h: hora(horaDeInstante(s.inicio), true, lang) })}</span><span style={{ color: 'var(--link)' }}>{t('experiencias.restamDe', { n: s.vagasLivres, total: s.vagasTotais })}</span></div>
            <div className="vagas__blocos" style={{ gridTemplateColumns: `repeat(${Math.min(s.vagasTotais, 30)}, 1fr)` }}>
              {Array.from({ length: Math.min(s.vagasTotais, 30) }, (_, i) => <span key={i} className={i < s.vagasTotais - s.vagasLivres ? 'is-on' : ''} />)}
            </div>
          </div>
        )}
      </div>
      <div className="row between"><b>{t('experiencias.quantos')}</b><Counter value={qtd} onChange={setQtd} min={1} max={maxQ} label={t('experiencias.quantos')} /></div>
      <Button variant="fogo" size="lg" block disabled={!sessao} loading={m.isPending} onClick={() => m.mutate()}>
        {t('experiencias.confirmarAgendamento', { n: qtd, valor: a.precoCentavos ? brl(a.precoCentavos * qtd, lang) : t('experiencias.gratis') })}
      </Button>
      <p style={{ fontSize: 12, color: 'var(--texto-2)', textAlign: 'center' }}>{t('experiencias.notaAgenda')}</p>
    </Modal>
  );
}

function AvisarModal({ sessao, email: inicial, onClose, onOk }: { sessao: SessaoDoDiaRes | null; email?: string; onClose: () => void; onOk: () => void }) {
  const { t } = useLang();
  const { logado } = useAuth();
  const perfil = useQuery({ queryKey: ['me', 'perfil'], queryFn: api.me.perfil, enabled: logado && !!sessao });
  const [email, setEmail] = useState(inicial ?? '');
  useEffect(() => { if (!email && perfil.data?.email) setEmail(perfil.data.email); }, [perfil.data?.email, email]);
  const m = useMutation({ mutationFn: () => api.atividades.alerta({ email, tipo: 'ATIVIDADE', sessaoId: sessao!.sessaoId }), onSuccess: onOk });
  return (
    <Modal open={!!sessao} onClose={onClose} label={t('experiencias.avisar')}>
      <ModalIcon icon="notifications" kind="fogo" />
      <div className="modal__title" style={{ fontSize: 28 }}>{sessao?.atividade}</div>
      <form className="stack" style={{ gap: 12, alignSelf: 'stretch', textAlign: 'left' }} onSubmit={(e) => { e.preventDefault(); if (emailOk(email)) m.mutate(); }}>
        <TextField label={t('lista.alertaEmail')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button variant="carvao" type="submit" block loading={m.isPending} disabled={!emailOk(email)}>{t('lista.alertaConfirmar')}</Button>
      </form>
    </Modal>
  );
}
