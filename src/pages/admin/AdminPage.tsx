import { useState } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/endpoints';
import { useLang } from '../../hooks';
import { Badge, Button, Icon, Sk } from '../../components/ui/basics';
import { TextField, TextareaField, Toggle } from '../../components/ui/form';
import { Modal, useToast } from '../../components/ui/overlay';
import { ErrorState } from '../../components/ui/states';
import { brl, diaMes, hojeISO, hora, intervalo, nota } from '../../lib/format';
import { seloStatus } from '../../lib/regras';
import type { CavernaAdminRes, ReservaAdminRes, StatusReserva } from '../../api/types';

/**
 * Painel da equipe (role ADMIN). O Figma não tem telas de admin: aqui tudo segue
 * o sistema de design (prancha 6) — cards "tábua", selos, raios lascados e sombras de relevo.
 */
export default function AdminPage() {
  const { t } = useLang();
  const menu = [
    { to: '', i: 'today', l: t('admin.menu.dashboard') },
    { to: 'reservas', i: 'confirmation_number', l: t('admin.menu.reservas') },
    { to: 'ocupacao', i: 'grid_view', l: t('admin.menu.ocupacao') },
    { to: 'cavernas', i: 'cabin', l: t('admin.menu.cavernas') },
    { to: 'mesas', i: 'restaurant', l: t('admin.menu.mesas') },
    { to: 'usuarios', i: 'group', l: t('admin.menu.usuarios') },
  ];
  return (
    <div className="container admin">
      <aside className="perfil__menu admin__menu">
        <div style={{ marginBottom: 14 }}>
          <div className="eyebrow">{t('admin.sub')}</div>
          <div className="t-h4">{t('admin.titulo')}</div>
        </div>
        {menu.map((m) => (
          <NavLink key={m.to} to={`/admin${m.to ? '/' + m.to : ''}`} end={!m.to} className={({ isActive }) => (isActive ? 'is-on' : '')}>
            <Icon name={m.i} />{m.l}
          </NavLink>
        ))}
      </aside>
      <div className="admin__menu-m chips chips--scroll">
        {menu.map((m) => (
          <NavLink key={m.to} to={`/admin${m.to ? '/' + m.to : ''}`} end={!m.to} className={({ isActive }) => `chip chip--s ${isActive ? 'is-on' : ''}`}><Icon name={m.i} />{m.l}</NavLink>
        ))}
      </div>
      <div className="stack" style={{ gap: 24, minWidth: 0 }}>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="reservas" element={<Reservas />} />
          <Route path="ocupacao" element={<Ocupacao />} />
          <Route path="cavernas" element={<Cavernas />} />
          <Route path="mesas" element={<Mesas />} />
          <Route path="usuarios" element={<Usuarios />} />
        </Routes>
      </div>
    </div>
  );
}

function DataPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useLang();
  return (
    <label className="row" style={{ gap: 8, fontWeight: 700, fontSize: 14 }}>
      <Icon name="calendar_month" style={{ color: 'var(--fogo)' }} />{t('admin.data')}
      <input type="date" className="input" style={{ width: 'auto', padding: '8px 10px' }} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function TabelaReservas({ itens }: { itens: ReservaAdminRes[] }) {
  const { t, lang } = useLang();
  if (!itens.length) return <p className="t-muted" style={{ padding: 8 }}>{t('admin.nenhuma')}</p>;
  return (
    <div className="tabela-wrap">
      <table className="tabela">
        <thead><tr><th>{t('admin.codigo')}</th><th>{t('admin.caverna')}</th><th>{t('admin.datas')}</th><th>{t('admin.responsavel')}</th><th>{t('admin.tribo')}</th><th>{t('admin.status')}</th><th style={{ textAlign: 'right' }}>{t('admin.totalCol')}</th></tr></thead>
        <tbody>
          {itens.map((r) => (
            <tr key={r.codigo}>
              <td><Link to={`/reserva/${r.codigo}`} className="mono">{r.codigo}</Link></td>
              <td><b>{r.cavernaNome}</b><div className="t-muted" style={{ fontSize: 12 }}>{r.unidadeCodigo}{r.temCombo ? ' · combo' : ''}</div></td>
              <td>{intervalo(r.checkIn, r.checkOut, lang)}</td>
              <td>{r.responsavelNome ?? '—'}<div className="t-muted" style={{ fontSize: 12 }}>{r.responsavelEmail}</div></td>
              <td>{r.adultos + r.criancas}</td>
              <td><Badge kind={seloStatus(r.status)}>{t(`comum.status.${r.status}`)}</Badge></td>
              <td style={{ textAlign: 'right', fontWeight: 800 }}>{brl(r.total, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Dashboard() {
  const { t, lang } = useLang();
  const [data, setData] = useState(hojeISO());
  const q = useQuery({ queryKey: ['admin', 'dashboard', data], queryFn: () => api.admin.dashboard(data) });
  const d = q.data;
  return (
    <>
      <div className="row between wrap" style={{ gap: 12 }}><h1 className="t-h2">{t('admin.menu.dashboard')}</h1><DataPicker value={data} onChange={setData} /></div>
      {q.isError && <ErrorState erro={q.error} onRetry={() => q.refetch()} compacto />}
      {q.isLoading ? <Sk h={160} /> : d && (
        <>
          <div className="admin-stats">
            <div className="tx-caverna panel--escuro admin-stat">
              <span className="eyebrow" style={{ color: 'var(--tocha)' }}>{t('admin.ocupacao')}</span>
              <span className="t-price" style={{ fontSize: 64 }}>{d.ocupacaoPct}%</span>
              <span style={{ fontWeight: 700 }}>{t('admin.tocasOcupadas', { a: d.tocasOcupadas, b: d.tocasTotal })}</span>
            </div>
            <div className="card card--sombra admin-stat">
              <span className="eyebrow">{t('admin.receitaMes')}</span>
              <span className="t-price" style={{ fontSize: 44 }}>{brl(d.receitaDoMesCentavos, lang)}</span>
            </div>
            <div className="card card--sombra admin-stat">
              <span className="eyebrow">{t('admin.banquete')}</span>
              <span className="t-price" style={{ fontSize: 44 }}>{d.pessoasNoBanquete}</span>
              <span className="t-muted" style={{ fontWeight: 700 }}>{t('admin.lugares', { a: d.pessoasNoBanquete, b: d.capacidadeBanquete })}</span>
              <div className="vagas__blocos" style={{ gridTemplateColumns: 'repeat(10,1fr)', display: 'grid' }}>
                {Array.from({ length: 10 }, (_, i) => <span key={i} className={i < Math.round((d.pessoasNoBanquete / Math.max(1, d.capacidadeBanquete)) * 10) ? 'is-on' : ''} style={{ height: 10, borderRadius: '3px 1px 3px 1px', background: i < Math.round((d.pessoasNoBanquete / Math.max(1, d.capacidadeBanquete)) * 10) ? 'var(--tocha)' : 'var(--linha-clara)' }} />)}
              </div>
            </div>
          </div>
          <section className="card panel"><span className="t-h5">{t('admin.entradas')} · {diaMes(d.data, lang)}</span><TabelaReservas itens={d.checkInsDoDia} /></section>
          <section className="card panel"><span className="t-h5">{t('admin.saidas')} · {diaMes(d.data, lang)}</span><TabelaReservas itens={d.checkOutsDoDia} /></section>
        </>
      )}
    </>
  );
}

const STATUS: StatusReserva[] = ['PENDENTE', 'AGUARDANDO_PAGAMENTO', 'CONFIRMADA', 'CONCLUIDA', 'CANCELADA', 'EXPIRADA'];

function Reservas() {
  const { t } = useLang();
  const [f, setF] = useState({ status: '', de: '', ate: '', busca: '', page: 0 });
  const q = useQuery({ queryKey: ['admin', 'reservas', f], queryFn: () => api.admin.reservas({ ...f, size: 20 }), placeholderData: keepPreviousData });
  const paginas = Math.max(1, Math.ceil((q.data?.total ?? 0) / 20));
  return (
    <>
      <h1 className="t-h2">{t('admin.menu.reservas')}</h1>
      <div className="admin-filtros">
        <TextField aria-label={t('admin.buscar')} placeholder={t('admin.buscar')} value={f.busca} onChange={(e) => setF({ ...f, busca: e.target.value, page: 0 })} />
        <select className="select" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 0 })} aria-label={t('admin.status')}>
          <option value="">{t('admin.todos')}</option>
          {STATUS.map((s) => <option key={s} value={s}>{t(`comum.status.${s}`)}</option>)}
        </select>
        <input type="date" className="input" aria-label={t('admin.de')} value={f.de} onChange={(e) => setF({ ...f, de: e.target.value, page: 0 })} />
        <input type="date" className="input" aria-label={t('admin.ateData')} value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value, page: 0 })} />
      </div>
      {q.isError && <ErrorState erro={q.error} onRetry={() => q.refetch()} compacto />}
      <section className="card panel">{q.isLoading ? <Sk h={200} /> : <TabelaReservas itens={q.data?.itens ?? []} />}
        {paginas > 1 && (
          <div className="pager">
            <button className="pager__arrow" disabled={f.page === 0} onClick={() => setF({ ...f, page: f.page - 1 })} aria-label="Anterior"><Icon name="chevron_left" /></button>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{t('admin.paginaDe', { a: f.page + 1, b: paginas })}</span>
            <button className="pager__arrow" disabled={f.page >= paginas - 1} onClick={() => setF({ ...f, page: f.page + 1 })} aria-label="Próxima"><Icon name="chevron_right" /></button>
          </div>
        )}
      </section>
    </>
  );
}

function Ocupacao() {
  const { t, lang } = useLang();
  const [data, setData] = useState(hojeISO());
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['admin', 'ocupacao', data], queryFn: () => api.admin.ocupacao(data) });
  const m = useMutation({
    mutationFn: (v: { id: string; ativa: boolean }) => api.admin.alterarUnidade(v.id, v.ativa),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin', 'ocupacao'] }); toast({ kind: 'ok', title: t('admin.salvo') }); },
  });
  const grupos = new Map<string, NonNullable<typeof q.data>>();
  (q.data ?? []).forEach((u) => grupos.set(u.cavernaNome, [...(grupos.get(u.cavernaNome) ?? []), u]));
  const cor: Record<string, string> = { LIVRE: 'ok', OCUPADA: 'fogo', MANUTENCAO: 'neutro', RESERVADA: 'info', SEGURADA: 'wait' };
  return (
    <>
      <div className="row between wrap" style={{ gap: 12 }}><h1 className="t-h2">{t('admin.menu.ocupacao')}</h1><DataPicker value={data} onChange={setData} /></div>
      {q.isError && <ErrorState erro={q.error} onRetry={() => q.refetch()} compacto />}
      {q.isLoading && <Sk h={300} />}
      {[...grupos.entries()].map(([nome, us]) => (
        <section key={nome} className="stack" style={{ gap: 10 }}>
          <span className="t-h5">{nome}</span>
          <div className="tocas">
            {us.map((u) => (
              <div key={u.unidadeId} className={`toca toca--${cor[u.situacao] ?? 'neutro'}`}>
                <div className="row between"><b className="mono">{u.codigo}</b><span className="toca__sit">{t(`admin.situacao.${u.situacao}` as 'admin.situacao.LIVRE', { defaultValue: u.situacao })}</span></div>
                {u.reservaCodigo ? (
                  <div style={{ fontSize: 12 }}>
                    <Link to={`/reserva/${u.reservaCodigo}`} className="mono">{u.reservaCodigo}</Link> · {u.responsavelNome}
                    {u.checkIn && u.checkOut && <div className="t-muted">{intervalo(u.checkIn, u.checkOut, lang)}</div>}
                  </div>
                ) : <div style={{ fontSize: 12 }} className="t-muted">—</div>}
                <button className="link-btn" style={{ fontSize: 12 }} disabled={m.isPending} onClick={() => m.mutate({ id: u.unidadeId, ativa: u.situacao === 'MANUTENCAO' })}>
                  <Icon name={u.situacao === 'MANUTENCAO' ? 'check_circle' : 'construction'} size={16} />{u.situacao === 'MANUTENCAO' ? t('admin.reativar') : t('admin.manutencao')}
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

function Cavernas() {
  const { t, lang } = useLang();
  const q = useQuery({ queryKey: ['admin', 'cavernas'], queryFn: api.admin.cavernas });
  const [edit, setEdit] = useState<CavernaAdminRes | null>(null);
  return (
    <>
      <h1 className="t-h2">{t('admin.menu.cavernas')}</h1>
      {q.isError && <ErrorState erro={q.error} onRetry={() => q.refetch()} compacto />}
      <section className="card panel">
        {q.isLoading ? <Sk h={200} /> : (
          <div className="tabela-wrap">
            <table className="tabela">
              <thead><tr><th>{t('admin.caverna')}</th><th>{t('admin.preco')}</th><th>{t('admin.unidades')}</th><th>{t('admin.nota')}</th><th>{t('admin.status')}</th><th /></tr></thead>
              <tbody>
                {(q.data ?? []).map((c) => (
                  <tr key={c.id}>
                    <td><b>{c.nome}</b><div className="t-muted" style={{ fontSize: 12 }}>{t(`comum.categoria.${c.categoria}`)} · {t('comum.ate', { n: c.capacidade })}</div></td>
                    <td style={{ fontWeight: 800 }}>{brl(c.precoBaseCentavos, lang)}</td>
                    <td>{c.unidadesAtivas}/{c.unidades}</td>
                    <td>★ {nota(c.notaMedia, lang)} <span className="t-muted">({c.totalRelatos})</span></td>
                    <td><Badge kind={c.ativa ? 'ok' : 'err'}>{c.ativa ? t('admin.ativa') : t('admin.inativa')}</Badge></td>
                    <td><Button variant="contorno" size="sm" icon="edit" onClick={() => setEdit(c)}>{t('comum.editar')}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {edit && <EditarCaverna c={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function EditarCaverna({ c, onClose }: { c: CavernaAdminRes; onClose: () => void }) {
  const { t } = useLang();
  const qc = useQueryClient();
  const toast = useToast();
  const [nome, setNome] = useState(c.nome);
  const [preco, setPreco] = useState(String(c.precoBaseCentavos / 100));
  const [resumo, setResumo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ativa, setAtiva] = useState(c.ativa);
  const m = useMutation({
    mutationFn: () => api.admin.alterarCaverna(c.id, {
      nome: nome.trim() !== c.nome ? nome.trim() : undefined,
      precoBaseCentavos: Math.round(Number(preco.replace(',', '.')) * 100),
      resumo: resumo.trim() || undefined, descricao: descricao.trim() || undefined, ativa,
    }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin', 'cavernas'] }); void qc.invalidateQueries({ queryKey: ['cavernas'] }); toast({ kind: 'ok', title: t('admin.salvo') }); onClose(); },
  });
  return (
    <Modal open onClose={onClose} label={t('admin.editarCaverna', { nome: c.nome })} wide>
      <div className="t-h4">{t('admin.editarCaverna', { nome: c.nome })}</div>
      <form className="stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
        {m.error && <div className="banner banner--erro">{(m.error as Error).message}</div>}
        <TextField label={t('conta.nome')} value={nome} onChange={(e) => setNome(e.target.value)} />
        <TextField label={t('admin.precoReais')} inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} />
        <TextField label={t('admin.resumo')} value={resumo} onChange={(e) => setResumo(e.target.value)} maxLength={255} />
        <TextareaField label={t('admin.descricao')} value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={4} />
        <Toggle checked={ativa} onChange={setAtiva}>{ativa ? t('admin.ativa') : t('admin.inativa')}</Toggle>
        <div className="row" style={{ gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="contorno" size="md" onClick={onClose}>{t('comum.cancelar')}</Button>
          <Button variant="carvao" size="md" type="submit" loading={m.isPending}>{t('comum.salvar')}</Button>
        </div>
      </form>
    </Modal>
  );
}

function Mesas() {
  const { t, lang } = useLang();
  const [data, setData] = useState(hojeISO());
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['admin', 'mesas', data], queryFn: () => api.admin.mesas(data) });
  const m = useMutation({ mutationFn: api.admin.naoCompareceu, onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin', 'mesas'] }); toast({ kind: 'info', title: t('admin.marcado') }); } });
  const d = q.data;
  return (
    <>
      <div className="row between wrap" style={{ gap: 12 }}><h1 className="t-h2">{t('admin.menu.mesas')}</h1><DataPicker value={data} onChange={setData} /></div>
      {q.isError && <ErrorState erro={q.error} onRetry={() => q.refetch()} compacto />}
      {q.isLoading ? <Sk h={200} /> : d && (
        <>
          <section className="card panel">
            <span className="t-h5">{t('admin.lotacao')}</span>
            <div className="stack" style={{ gap: 10 }}>
              {d.ocupacao.map((o) => (
                <div key={o.horario} className="vagas">
                  <div className="vagas__head"><span>{hora(o.horario, false, lang)}</span><span style={{ color: o.lugaresLivres === 0 ? 'var(--barro-erro)' : 'var(--texto-2)' }}>{t('admin.lugares', { a: o.pessoas, b: d.capacidadePessoas })}</span></div>
                  <div className="vagas__blocos" style={{ gridTemplateColumns: 'repeat(25, 1fr)' }}>
                    {Array.from({ length: 25 }, (_, i) => <span key={i} className={i < Math.round((o.pessoas / d.capacidadePessoas) * 25) ? 'is-on' : ''} />)}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="card panel">
            <span className="t-h5">{t('admin.mesasDia')}</span>
            {d.mesas.length === 0 ? <p className="t-muted">{t('admin.nenhuma')}</p> : (
              <div className="tabela-wrap">
                <table className="tabela">
                  <thead><tr><th>{t('admin.codigo')}</th><th>{t('banquete.horario')}</th><th>{t('admin.pessoas')}</th><th>{t('admin.contato')}</th><th>{t('admin.status')}</th><th /></tr></thead>
                  <tbody>
                    {d.mesas.map((x) => (
                      <tr key={x.codigo}>
                        <td className="mono">{x.codigo}<div className="t-muted" style={{ fontSize: 12, fontFamily: 'var(--f-texto)' }}>{t(`admin.origem.${x.origem}`)}{x.reservaCodigo ? ` · ${x.reservaCodigo}` : ''}</div></td>
                        <td><b>{hora(x.horario, false, lang)}</b></td>
                        <td>{x.pessoas}{x.cadeirinhas ? ` · ${x.cadeirinhas}🪑` : ''}{x.pertoFogueira ? ' · 🔥' : ''}</td>
                        <td>{x.nomeContato ?? '—'}<div className="t-muted" style={{ fontSize: 12 }}>{x.celularContato ?? x.emailContato ?? ''}</div></td>
                        <td><Badge kind={x.status === 'CONFIRMADA' ? 'ok' : x.status === 'PENDENTE' ? 'wait' : 'err'}>{t(`comum.statusMesa.${x.status}`)}</Badge></td>
                        <td>{x.status === 'CONFIRMADA' && <button className="link-btn link-btn--perigo" style={{ fontSize: 13 }} onClick={() => m.mutate(x.codigo)}>{t('admin.naoCompareceu')}</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

function Usuarios() {
  const { t, lang } = useLang();
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(0);
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['admin', 'usuarios', busca, page], queryFn: () => api.admin.usuarios({ busca: busca || undefined, page, size: 20 }), placeholderData: keepPreviousData });
  const m = useMutation({
    mutationFn: (v: { id: string; role: 'ADMIN' | 'VISITANTE' }) => api.admin.alterarRole(v.id, v.role),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin', 'usuarios'] }); toast({ kind: 'ok', title: t('admin.papelAlterado') }); },
    onError: (e) => toast({ kind: 'erro', title: 'Ugh!', text: (e as Error).message }),
  });
  const paginas = Math.max(1, Math.ceil((q.data?.total ?? 0) / 20));
  return (
    <>
      <h1 className="t-h2">{t('admin.menu.usuarios')}</h1>
      <div style={{ maxWidth: 420 }}><TextField aria-label={t('admin.buscar')} placeholder={t('admin.buscar')} value={busca} onChange={(e) => { setBusca(e.target.value); setPage(0); }} /></div>
      {q.isError && <ErrorState erro={q.error} onRetry={() => q.refetch()} compacto />}
      <section className="card panel">
        {q.isLoading ? <Sk h={200} /> : (
          <div className="tabela-wrap">
            <table className="tabela">
              <thead><tr><th>{t('conta.nome')}</th><th>{t('conta.email')}</th><th>{t('admin.criadoEm')}</th><th>{t('admin.papel')}</th><th /></tr></thead>
              <tbody>
                {(q.data?.itens ?? []).map((u) => (
                  <tr key={u.id}>
                    <td><b>{u.nome} {u.sobrenome}</b></td>
                    <td>{u.email}</td>
                    <td>{new Date(u.criadoEm).toLocaleDateString(lang)}</td>
                    <td><Badge kind={u.role === 'ADMIN' ? 'info' : 'neutro'}>{u.role}</Badge></td>
                    <td><button className="link-btn" style={{ fontSize: 13 }} disabled={m.isPending} onClick={() => m.mutate({ id: u.id, role: u.role === 'ADMIN' ? 'VISITANTE' : 'ADMIN' })}>{u.role === 'ADMIN' ? t('admin.tornarVisitante') : t('admin.tornarAdmin')}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {paginas > 1 && (
          <div className="pager">
            <button className="pager__arrow" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Anterior"><Icon name="chevron_left" /></button>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{t('admin.paginaDe', { a: page + 1, b: paginas })}</span>
            <button className="pager__arrow" disabled={page >= paginas - 1} onClick={() => setPage(page + 1)} aria-label="Próxima"><Icon name="chevron_right" /></button>
          </div>
        )}
      </section>
    </>
  );
}
