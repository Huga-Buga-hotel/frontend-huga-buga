import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/endpoints';
import { isApiError } from '../../api/client';
import { useAuth } from '../../context/auth';
import { useFavoritos, useLang } from '../../hooks';
import { Banner, Button, Icon, Sk } from '../../components/ui/basics';
import { Checkbox, Radio, Segmented, SelectField, TextField, TextareaField, Toggle } from '../../components/ui/form';
import { Modal, useToast } from '../../components/ui/overlay';
import { ErrorState } from '../../components/ui/states';
import { CavernaCardGrid } from '../../components/cavernas/CavernaCards';
import { useTrocarIdioma } from '../../components/layout/Nav';
import { usePaises } from '../reserva/HospedesPage';
import { dataLonga, iniciais } from '../../lib/format';
import { formatarCelular, SENHA_MINIMA } from '../../lib/regras';
import { IDIOMAS } from '../../i18n';
import type { MembroRes, TipoHospede } from '../../api/types';

type Secao = 'dados' | 'membros' | 'favoritas' | 'notificacoes' | 'idioma' | 'seguranca' | 'ajuda';
const MENU: { s: Secao; i: string }[] = [
  { s: 'dados', i: 'person' }, { s: 'membros', i: 'groups' }, { s: 'favoritas', i: 'favorite' },
  { s: 'notificacoes', i: 'notifications' }, { s: 'idioma', i: 'translate' }, { s: 'seguranca', i: 'lock' }, { s: 'ajuda', i: 'help' },
];

export default function PerfilPage() {
  const { secao } = useParams();
  const s = (MENU.some((m) => m.s === secao) ? secao : undefined) as Secao | undefined;
  const { t, lang } = useLang();
  const { usuario, sair, admin } = useAuth();
  const nav = useNavigate();
  const perfil = useQuery({ queryKey: ['me', 'perfil'], queryFn: api.me.perfil });
  const nomeIdioma = t(`comum.idiomas.${(IDIOMAS as readonly string[]).includes(lang) ? (lang as 'en') : 'pt-BR'}`);
  const label = (x: Secao) => (x === 'idioma' ? t('perfil.menu.idioma', { idioma: nomeIdioma }) : t(`perfil.menu.${x}`));

  const cabecalho = (
    <div className="row" style={{ gap: 12, marginBottom: 18 }}>
      <span className="avatar avatar--l">{iniciais(usuario?.nome)}</span>
      <div>
        <div className="t-h5" style={{ fontSize: 22 }}>{perfil.data ? `${perfil.data.nome} ${perfil.data.sobrenome}` : usuario?.nome}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--texto-2)' }}>{perfil.data?.email}</div>
      </div>
    </div>
  );

  return (
    <div className="container perfil">
      <aside className="perfil__menu" aria-label={t('nav.minhaConta')}>
        {cabecalho}
        {MENU.map((m) => (
          <NavLink key={m.s} to={m.s === 'dados' ? '/perfil' : `/perfil/${m.s}`} end className={({ isActive }) => (isActive || (!s && m.s === 'dados') ? 'is-on' : '')}>
            <Icon name={m.i} />{label(m.s)}
          </NavLink>
        ))}
        {admin && <NavLink to="/admin"><Icon name="dashboard" />{t('perfil.menu.admin')}</NavLink>}
        <button className="perfil__sair" onClick={async () => { await sair(); nav('/'); }}><Icon name="logout" />{t('comum.sair')}</button>
      </aside>

      <div className="stack" style={{ gap: 24, minWidth: 0 }}>
        {/* mobile: cabeçalho + lista */}
        <div className="only-mobile">{cabecalho}</div>
        {!s && (
          <nav className="perfil-lista-m">
            {MENU.slice(1).map((m) => (
              <Link key={m.s} to={`/perfil/${m.s}`}><Icon name={m.i} /><span className="grow">{label(m.s)}</span><Icon name="chevron_right" style={{ color: 'var(--pedra)' }} /></Link>
            ))}
            {admin && <Link to="/admin"><Icon name="dashboard" /><span className="grow">{t('perfil.menu.admin')}</span><Icon name="chevron_right" /></Link>}
            <button onClick={async () => { await sair(); nav('/'); }} style={{ color: 'var(--barro-erro)' }}><Icon name="logout" style={{ color: 'var(--barro-erro)' }} />{t('comum.sair')}</button>
          </nav>
        )}
        {s && <Link to="/perfil" className="only-mobile link-btn link-btn--tinta" style={{ textDecoration: 'none' }}><Icon name="arrow_back" />{t('comum.voltar')}</Link>}

        {perfil.isError && <ErrorState erro={perfil.error} onRetry={() => perfil.refetch()} compacto />}
        {(!s || s === 'dados') && <Dados />}
        {(!s || s === 'membros') && <Membros />}
        {s === 'favoritas' && <Favoritas />}
        {s === 'notificacoes' && <Notificacoes />}
        {s === 'idioma' && <IdiomaSecao />}
        {s === 'seguranca' && <Seguranca />}
        {s === 'ajuda' && (
          <section className="card panel">
            <span className="t-h5" style={{ fontSize: 26 }}>{t('perfil.ajuda')}</span>
            <p style={{ color: 'var(--texto-corpo)' }}>{t('perfil.ajudaTexto')}</p>
            <div className="row wrap" style={{ gap: 10 }}>
              <Button variant="fogo" icon="forum" onClick={() => window.dispatchEvent(new Event('hb:abrir-chat'))}>{t('perfil.falarBugao')}</Button>
              <Link to="/a-tribo#faq" className="btn btn--contorno btn--md">{t('rodape.faq')}</Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Dados() {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const toast = useToast();
  const paises = usePaises();
  const q = useQuery({ queryKey: ['me', 'perfil'], queryFn: api.me.perfil });
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ nome: '', sobrenome: '', celular: '', pais: 'BR', dataNascimento: '', aceitaOfertas: false });
  useEffect(() => {
    if (q.data) setF({ nome: q.data.nome, sobrenome: q.data.sobrenome, celular: q.data.celular ?? '', pais: q.data.pais ?? 'BR', dataNascimento: q.data.dataNascimento ?? '', aceitaOfertas: q.data.aceitaOfertas });
  }, [q.data, edit]);
  const m = useMutation({
    mutationFn: () => api.me.atualizar({ ...f, dataNascimento: f.dataNascimento || null }),
    onSuccess: (p) => { qc.setQueryData(['me', 'perfil'], p); setEdit(false); toast({ kind: 'ok', title: t('perfil.salvo') }); },
  });
  const p = q.data;
  const nomePais = paises.find((x) => x.code === p?.pais)?.nome ?? p?.pais;
  const ni = t('perfil.naoInformado');
  return (
    <section className="card panel">
      <div className="row between">
        <span className="t-h5" style={{ fontSize: 26 }}>{t('perfil.dados')}</span>
        {!edit && <Button variant="contorno" size="sm" icon="edit" onClick={() => setEdit(true)}>{t('comum.editar')}</Button>}
      </div>
      {q.isLoading ? <Sk h={100} /> : edit ? (
        <form className="stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
          {m.error && <Banner kind="erro">{(m.error as Error).message}</Banner>}
          <div className="grid-2" style={{ gap: 12 }}>
            <TextField label={t('conta.nome')} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} required />
            <TextField label={t('conta.sobrenome')} value={f.sobrenome} onChange={(e) => setF({ ...f, sobrenome: e.target.value })} required />
            <TextField label={t('conta.celular')} type="tel" value={f.celular} onChange={(e) => setF({ ...f, celular: e.target.value.startsWith('+') ? e.target.value : formatarCelular(e.target.value) })} />
            <SelectField label={t('conta.pais')} value={f.pais} onChange={(e) => setF({ ...f, pais: e.target.value })}>
              {paises.map((x) => <option key={x.code} value={x.code}>{x.nome}</option>)}
            </SelectField>
            <TextField label={t('conta.nascimento')} type="date" value={f.dataNascimento} onChange={(e) => setF({ ...f, dataNascimento: e.target.value })} />
          </div>
          <Checkbox checked={f.aceitaOfertas} onChange={(v) => setF({ ...f, aceitaOfertas: v })}>{t('conta.ofertas')}</Checkbox>
          <div className="row" style={{ gap: 10 }}>
            <Button variant="carvao" size="md" type="submit" loading={m.isPending}>{t('comum.salvar')}</Button>
            <Button variant="contorno" size="md" onClick={() => setEdit(false)}>{t('comum.cancelar')}</Button>
          </div>
        </form>
      ) : p && (
        <div className="perfil__dados">
          {[
            [t('perfil.nome'), `${p.nome} ${p.sobrenome}`], [t('perfil.email'), p.email], [t('perfil.celular'), p.celular ?? ni],
            [t('perfil.documento'), p.documentoMascarado ? `${p.tipoDocumento ?? ''} ${p.documentoMascarado}` : ni], [t('perfil.pais'), nomePais ?? ni],
            [t('perfil.aniversario'), p.dataNascimento ? dataLonga(p.dataNascimento, lang) : ni],
          ].map(([k, v]) => (
            <div key={k}><div className="caption">{k}</div><div style={{ fontWeight: 700, fontSize: 16, marginTop: 2, overflowWrap: 'anywhere' }}>{v}</div></div>
          ))}
        </div>
      )}
    </section>
  );
}

function Membros() {
  const { t } = useLang();
  const q = useQuery({ queryKey: ['me', 'membros'], queryFn: api.me.membros });
  const [edit, setEdit] = useState<MembroRes | 'novo' | null>(null);
  return (
    <section className="card panel" style={{ gap: 14 }}>
      <div className="row between">
        <span className="t-h5" style={{ fontSize: 26 }}>{t('perfil.membros')}</span>
        <button className="link-btn" style={{ fontSize: 14 }} onClick={() => setEdit('novo')}><Icon name="add" size={18} />{t('perfil.adicionar')}</button>
      </div>
      {q.isLoading ? <Sk h={64} /> : (q.data ?? []).length === 0 ? <p className="t-muted" style={{ fontSize: 14 }}>{t('perfil.semMembros')}</p> : (
        <div className="grid-3" style={{ gap: 12 }}>
          {q.data!.map((m) => (
            <button key={m.id} className="membro" onClick={() => setEdit(m)}>
              <span className="avatar-member" style={{ width: 40, height: 40 }}><Icon name={m.tipo === 'ADULTO' ? 'person' : 'child_care'} size={22} /></span>
              <div style={{ minWidth: 0 }}><b>{m.nome}</b><div style={{ fontSize: 12, color: 'var(--texto-2)' }}>{m.tipo === 'ADULTO' ? t('perfil.adulto') : m.idade != null ? t('comum.anos', { count: m.idade }) : t('perfil.crianca')}{m.observacoes ? ` · ${m.observacoes}` : ''}</div></div>
            </button>
          ))}
        </div>
      )}
      {edit && <MembroModal m={edit === 'novo' ? null : edit} onClose={() => setEdit(null)} />}
    </section>
  );
}

function MembroModal({ m, onClose }: { m: MembroRes | null; onClose: () => void }) {
  const { t } = useLang();
  const qc = useQueryClient();
  const toast = useToast();
  const [nome, setNome] = useState(m?.nome ?? '');
  const [tipo, setTipo] = useState<TipoHospede>(m?.tipo ?? 'ADULTO');
  const [nasc, setNasc] = useState(m?.dataNascimento ?? '');
  const [obs, setObs] = useState(m?.observacoes ?? '');
  const fim = () => { void qc.invalidateQueries({ queryKey: ['me', 'membros'] }); onClose(); };
  const salvar = useMutation({
    mutationFn: () => { const b = { nome: nome.trim(), tipo, dataNascimento: nasc || null, observacoes: obs.trim() || undefined }; return m ? api.me.editarMembro(m.id, b) : api.me.adicionarMembro(b); },
    onSuccess: fim,
  });
  const remover = useMutation({ mutationFn: () => api.me.removerMembro(m!.id), onSuccess: () => { toast({ kind: 'info', title: t('perfil.membroRemovido', { nome: m!.nome }) }); fim(); } });
  return (
    <Modal open onClose={onClose} label={m ? t('perfil.membroEditar') : t('perfil.membroNovo')} wide>
      <div className="t-h4">{m ? t('perfil.membroEditar') : t('perfil.membroNovo')}</div>
      <form className="stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); if (nome.trim()) salvar.mutate(); }}>
        {salvar.error && <Banner kind="erro" small>{(salvar.error as Error).message}</Banner>}
        <TextField label={t('conta.nome')} value={nome} onChange={(e) => setNome(e.target.value)} required />
        <div className="field"><span>{t('perfil.tipo')}</span>
          <Segmented value={tipo} onChange={setTipo} options={[{ value: 'ADULTO', label: t('perfil.adulto') }, { value: 'CRIANCA', label: t('perfil.crianca') }]} />
        </div>
        <TextField label={t('conta.nascimento')} type="date" value={nasc} onChange={(e) => setNasc(e.target.value)} />
        <TextareaField label={t('perfil.observacoes')} value={obs} onChange={(e) => setObs(e.target.value)} maxLength={500} />
        <div className="row between wrap" style={{ gap: 10 }}>
          {m ? <button type="button" className="link-btn link-btn--perigo" onClick={() => { if (window.confirm(t('perfil.removerMembro', { nome: m.nome }))) remover.mutate(); }}>{t('comum.remover')}</button> : <span />}
          <div className="row" style={{ gap: 10 }}>
            <Button variant="contorno" size="md" onClick={onClose}>{t('comum.cancelar')}</Button>
            <Button variant="carvao" size="md" type="submit" loading={salvar.isPending} disabled={!nome.trim()}>{t('comum.salvar')}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function Favoritas() {
  const { t } = useLang();
  const { lista, carregando } = useFavoritos();
  return (
    <section className="stack" style={{ gap: 16 }}>
      <span className="t-h4">{t('perfil.favoritas')}</span>
      {carregando ? <Sk h={300} /> : lista.length === 0 ? (
        <div className="card panel"><p className="t-muted">{t('perfil.semFavoritas')}</p><Link to="/cavernas" className="btn btn--fogo btn--md" style={{ alignSelf: 'flex-start' }}>{t('minhas.explorar')}</Link></div>
      ) : (
        <div className="grid-2" style={{ gap: 24 }}>{lista.map((c) => <CavernaCardGrid key={c.id} c={c} />)}</div>
      )}
    </section>
  );
}

function Notificacoes() {
  const { t } = useLang();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['me', 'preferencias'], queryFn: api.me.preferencias });
  const m = useMutation({ mutationFn: api.me.salvarPreferencias, onSuccess: (p) => qc.setQueryData(['me', 'preferencias'], p) });
  const p = q.data;
  return (
    <section className="card panel">
      <span className="t-h5" style={{ fontSize: 26 }}>{t('perfil.notificacoes')}</span>
      {!p ? <Sk h={100} /> : (
        <>
          <Toggle checked={p.notificacoesEmail} onChange={(v) => m.mutate({ notificacoesEmail: v })} icon="mail">{t('perfil.notifEmail')}</Toggle>
          <Toggle checked={p.notificacoesWhatsapp} onChange={(v) => m.mutate({ notificacoesWhatsapp: v })} icon="chat">{t('perfil.notifWhats')}</Toggle>
          <Toggle checked={p.aceitaOfertas} onChange={(v) => m.mutate({ aceitaOfertas: v })} icon="sell">{t('perfil.notifOfertas')}</Toggle>
        </>
      )}
    </section>
  );
}

function IdiomaSecao() {
  const { t, lang } = useLang();
  const trocar = useTrocarIdioma();
  return (
    <section className="card panel">
      <span className="t-h5" style={{ fontSize: 26 }}>{t('perfil.idioma')}</span>
      <p className="t-muted">{t('perfil.idiomaTexto')}</p>
      {IDIOMAS.map((l) => <Radio key={l} name="idioma" checked={lang === l} onChange={() => trocar(l)}>{t(`comum.idiomas.${l}`)}</Radio>)}
    </section>
  );
}

function Seguranca() {
  const { t } = useLang();
  const { sair } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const m = useMutation({
    mutationFn: () => api.me.trocarSenha(atual, nova),
    onSuccess: async () => { toast({ kind: 'ok', title: t('perfil.senhaTrocada') }); await sair(); nav('/entrar'); },
  });
  const err = m.error && isApiError(m.error) ? m.error : null;
  return (
    <section className="card panel">
      <span className="t-h5" style={{ fontSize: 26 }}>{t('perfil.seguranca')}</span>
      <form className="stack" style={{ gap: 14, maxWidth: 420 }} onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
        {err && <Banner kind="erro" small title={err.titulo}>{err.message}</Banner>}
        <TextField label={t('perfil.senhaAtual')} type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} />
        <TextField label={t('perfil.novaSenha')} type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} help={`min. ${SENHA_MINIMA}`} />
        <Button variant="carvao" size="md" type="submit" loading={m.isPending} disabled={!atual || nova.length < SENHA_MINIMA}>{t('perfil.trocarSenha')}</Button>
      </form>
    </section>
  );
}
