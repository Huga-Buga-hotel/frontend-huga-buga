import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Trans } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { isApiError } from '../../api/client';
import { useAuth } from '../../context/auth';
import { useLang } from '../../hooks';
import { Banner, Button, ImageSlot } from '../../components/ui/basics';
import { Checkbox, SelectField, Segmented, TextField } from '../../components/ui/form';
import { useToast } from '../../components/ui/overlay';
import { usePaises } from '../reserva/HospedesPage';
import { cpfOk, emailOk, forcaSenha, formatarCelular, formatarCpf, SENHA_MINIMA, soDigitos } from '../../lib/regras';

type Aba = 'entrar' | 'criar';

export default function EntrarPage({ criar }: { criar?: boolean }) {
  const { t } = useLang();
  const [aba, setAba] = useState<Aba>(criar ? 'criar' : 'entrar');
  const nav = useNavigate();
  const loc = useLocation();
  const destino = (loc.state as { de?: string } | null)?.de ?? '/';
  const voltar = () => nav(destino, { replace: true });
  return (
    <div className="login">
      <div className="login__foto hide-mobile">
        <ImageSlot caption={t('conta.fotoLogin')} />
        <div className="login__quote">
          <div style={{ font: "900 28px/1.1 'Londrina Solid',sans-serif" }}>{t('conta.citacao')}</div>
          <div style={{ fontSize: 13, color: 'var(--osso-2)', marginTop: 8 }}>{t('conta.citacaoAutor')}</div>
        </div>
      </div>
      <div className="login__form">
        <h1 className="t-h2">{aba === 'entrar' ? t('conta.bomVer') : t('conta.entrePraTribo')}</h1>
        <Segmented value={aba} onChange={(a) => { setAba(a); nav(a === 'criar' ? '/criar-conta' : '/entrar', { replace: true, state: loc.state }); }}
          options={[{ value: 'entrar', label: t('conta.entrar') }, { value: 'criar', label: t('conta.criarConta') }]} />
        {aba === 'entrar' ? <Login onOk={voltar} /> : <Cadastro onOk={voltar} />}
      </div>
    </div>
  );
}

function Social() {
  const { t } = useLang();
  const toast = useToast();
  // Login com Google/Apple: o backend ainda vai ganhar as rotas OAuth. Os botões já ficam prontos.
  const clicar = (provedor: string) => toast({ kind: 'info', title: t('comum.emBreve'), text: t('conta.socialEmBreve', { provedor }) });
  return (
    <>
      <div className="row" style={{ gap: 12, color: 'var(--pedra)', fontSize: 13 }}><span className="grow dashed-top" />{t('comum.ou')}<span className="grow dashed-top" /></div>
      <div className="grid-2" style={{ gap: 12 }}>
        <button type="button" className="btn btn--contorno btn--md social-btn" onClick={() => clicar('Google')}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
          {t('conta.google')}
        </button>
        <button type="button" className="btn btn--contorno btn--md social-btn" onClick={() => clicar('Apple')}>
          <svg width="16" height="18" viewBox="0 0 814 1000" aria-hidden><path fill="currentColor" d="M788 341c-6 4-108 62-108 190 0 148 130 200 134 201-1 3-21 71-68 140-42 61-87 122-153 122s-84-39-161-39c-75 0-102 40-163 40s-104-57-153-127C59 787 13 663 13 545c0-189 123-289 244-289 64 0 118 42 158 42 38 0 98-45 171-45 28 0 128 3 202 88zM554 159c31-36 52-87 52-137 0-7-1-14-2-20-50 2-109 33-145 75-28 32-54 83-54 134 0 8 1 15 2 18 3 0 8 1 13 1 45 0 101-30 134-71z"/></svg>
          {t('conta.apple')}
        </button>
      </div>
    </>
  );
}

function Login({ onOk }: { onOk: () => void }) {
  const { t } = useLang();
  const { entrar } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(true);
  const m = useMutation({
    mutationFn: () => entrar(email, senha, lembrar),
    onSuccess: (u) => { toast({ kind: 'ok', title: t('conta.deVolta', { nome: u.nome.split(' ')[0] }) }); onOk(); },
  });
  const err = m.error && isApiError(m.error) ? m.error : m.error ? (m.error as Error) : null;
  return (
    <form className="stack" style={{ gap: 18 }} onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
      {err && <Banner kind="erro" title={isApiError(err) ? err.titulo : undefined}>{err.message}</Banner>}
      <TextField label={t('conta.email')} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField label={t('conta.senha')} type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)}
        labelAside={<Link to="/esqueci-senha" style={{ fontSize: 13 }}>{t('conta.esqueci')}</Link>} />
      <Checkbox checked={lembrar} onChange={setLembrar}>{t('conta.lembrar')}</Checkbox>
      <Button variant="fogo" size="lg" block type="submit" loading={m.isPending} loadingText={t('conta.entrando')} disabled={!emailOk(email) || !senha}>{t('conta.entrarCaverna')}</Button>
      <Social />
      <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--texto-2)' }}>{t('conta.soReservar')} <Link to="/cavernas" style={{ fontWeight: 700 }}>{t('conta.semConta')}</Link></div>
    </form>
  );
}

function Cadastro({ onOk }: { onOk: () => void }) {
  const { t } = useLang();
  const { cadastrar } = useAuth();
  const toast = useToast();
  const paises = usePaises();
  const [f, setF] = useState({ nome: '', sobrenome: '', email: '', senha: '', celular: '', pais: 'BR', tipoDocumento: 'CPF', numeroDocumento: '', dataNascimento: '', aceitaOfertas: false });
  const [tocou, setTocou] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const forca = forcaSenha(f.senha);
  const forcaLabels = t('conta.forca', { returnObjects: true }) as string[];
  const forcaDicas = t('conta.forcaDica', { returnObjects: true }) as string[];
  const erros = {
    nome: !f.nome.trim() ? t('reserva.erroNome') : undefined,
    sobrenome: !f.sobrenome.trim() ? t('comum.obrigatorio') : undefined,
    email: !emailOk(f.email) ? t('reserva.erroEmail') : undefined,
    senha: f.senha.length < SENHA_MINIMA ? forcaDicas[1].replace(/^—\s*/, '') : undefined,
    celular: soDigitos(f.celular).length < 10 ? t('reserva.erroCelular') : undefined,
    doc: !f.numeroDocumento.trim() ? t('reserva.erroDoc') : f.tipoDocumento === 'CPF' && !cpfOk(f.numeroDocumento) ? t('reserva.erroCpf') : undefined,
  };
  const ok = Object.values(erros).every((x) => !x);
  const m = useMutation({
    mutationFn: () => cadastrar({
      nome: f.nome.trim(), sobrenome: f.sobrenome.trim(), email: f.email.trim(), senha: f.senha,
      celular: f.pais === 'BR' ? `+55 ${f.celular}` : f.celular, pais: f.pais, tipoDocumento: f.tipoDocumento,
      numeroDocumento: f.tipoDocumento === 'CPF' ? soDigitos(f.numeroDocumento) : f.numeroDocumento.trim(),
      dataNascimento: f.dataNascimento || null, aceitaOfertas: f.aceitaOfertas,
    }),
    onSuccess: (u) => { toast({ kind: 'ok', title: t('conta.bemVindo', { nome: u.nome.split(' ')[0] }) }); onOk(); },
  });
  const apiErr = m.error && isApiError(m.error) ? m.error : null;
  const e = (k: keyof typeof erros) => (tocou ? erros[k] : undefined) ?? apiErr?.campo(k === 'doc' ? 'numeroDocumento' : k);
  const cor = ['var(--linha-clara)', 'var(--barro-erro)', 'var(--ambar)', 'var(--musgo)'][forca];
  return (
    <form className="stack" style={{ gap: 14 }} noValidate onSubmit={(ev) => { ev.preventDefault(); setTocou(true); if (ok) m.mutate(); }}>
      {apiErr && !apiErr.campos.length && <Banner kind="erro" title={apiErr.titulo}>{apiErr.message}</Banner>}
      <div className="grid-2" style={{ gap: 12 }}>
        <TextField label={t('conta.nome')} autoComplete="given-name" value={f.nome} onChange={(x) => set('nome', x.target.value)} error={e('nome')} />
        <TextField label={t('conta.sobrenome')} autoComplete="family-name" value={f.sobrenome} onChange={(x) => set('sobrenome', x.target.value)} error={e('sobrenome')} />
      </div>
      <TextField label={t('conta.email')} type="email" autoComplete="email" value={f.email} onChange={(x) => set('email', x.target.value)} error={e('email')} />
      <div className="stack" style={{ gap: 6 }}>
        <TextField label={t('conta.senha')} type="password" autoComplete="new-password" value={f.senha} onChange={(x) => set('senha', x.target.value)} error={e('senha')} />
        {f.senha && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }} aria-hidden>
              {[1, 2, 3].map((n) => <div key={n} style={{ height: 6, borderRadius: 3, background: n <= forca ? cor : 'var(--linha-clara)' }} />)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--texto-2)' }} aria-live="polite">
              <b style={{ color: forca === 2 ? 'var(--ambar-icone)' : cor }}>{forcaLabels[forca]}</b> <Trans defaults={forcaDicas[forca]} components={{ b: <b /> }} />
            </div>
          </>
        )}
      </div>
      <div className="grid-2" style={{ gap: 12 }}>
        <SelectField label={t('conta.pais')} value={f.pais} onChange={(x) => { set('pais', x.target.value); if (x.target.value !== 'BR') set('tipoDocumento', 'PASSAPORTE'); }}>
          {paises.map((p) => <option key={p.code} value={p.code}>{p.nome}</option>)}
        </SelectField>
        <TextField label={t('conta.celular')} type="tel" autoComplete="tel-national" prefix={f.pais === 'BR' ? '+55' : undefined} value={f.celular} onChange={(x) => set('celular', f.pais === 'BR' ? formatarCelular(x.target.value) : x.target.value)} error={e('celular')} />
        <SelectField label={t('conta.documento')} value={f.tipoDocumento} onChange={(x) => set('tipoDocumento', x.target.value)}>
          <option value="CPF">{t('reserva.cpf')}</option>
          <option value="PASSAPORTE">{t('reserva.passaporte')}</option>
        </SelectField>
        <TextField label={f.tipoDocumento === 'CPF' ? t('reserva.cpf') : t('reserva.passaporte')} value={f.numeroDocumento} inputMode={f.tipoDocumento === 'CPF' ? 'numeric' : 'text'}
          onChange={(x) => set('numeroDocumento', f.tipoDocumento === 'CPF' ? formatarCpf(x.target.value) : x.target.value.toUpperCase())} error={e('doc')} />
      </div>
      <TextField label={t('conta.nascimento')} type="date" value={f.dataNascimento} onChange={(x) => set('dataNascimento', x.target.value)} />
      <Checkbox checked={f.aceitaOfertas} onChange={(v) => set('aceitaOfertas', v)}>{t('conta.ofertas')}</Checkbox>
      <Button variant="fogo" size="lg" block type="submit" loading={m.isPending} loadingText={t('conta.criando')}>{t('conta.criarConta')}</Button>
      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--pedra)' }}>{t('conta.aceite')}</div>
      <Social />
    </form>
  );
}
