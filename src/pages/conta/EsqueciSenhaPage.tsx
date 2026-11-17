import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../api/endpoints';
import { useLang } from '../../hooks';
import { Banner, Button } from '../../components/ui/basics';
import { TextField } from '../../components/ui/form';
import { emailOk } from '../../lib/regras';

export default function EsqueciSenhaPage() {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const m = useMutation({ mutationFn: () => api.auth.esqueciSenha(email.trim()) });
  return (
    <div className="container conta-mini">
      <div className="card card--l panel">
        <h1 className="t-h3">{t('conta.esqueciTitulo')}</h1>
        <p style={{ color: 'var(--texto-corpo)' }}>{t('conta.esqueciTexto')}</p>
        {m.isSuccess ? (
          <>
            <Banner kind="ok">{t('conta.linkEnviado')}</Banner>
            {m.data?.tokenDev && (
              <Banner kind="info" title={t('conta.linkDev')}>
                <Link to={`/redefinir-senha?token=${encodeURIComponent(m.data.tokenDev)}`}>{t('conta.abrirLinkDev')}</Link>
              </Banner>
            )}
          </>
        ) : (
          <form className="stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); if (emailOk(email)) m.mutate(); }}>
            {m.error && <Banner kind="erro">{(m.error as Error).message}</Banner>}
            <TextField label={t('conta.email')} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button variant="carvao" size="lg" block type="submit" loading={m.isPending} disabled={!emailOk(email)}>{t('conta.enviarLink')}</Button>
          </form>
        )}
        <Link to="/entrar" style={{ fontWeight: 700 }}>{t('conta.voltarEntrar')}</Link>
      </div>
    </div>
  );
}
