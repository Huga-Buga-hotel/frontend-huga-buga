import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../api/endpoints';
import { useLang } from '../../hooks';
import { Banner, Button } from '../../components/ui/basics';
import { TextField } from '../../components/ui/form';
import { useToast } from '../../components/ui/overlay';
import { SENHA_MINIMA } from '../../lib/regras';

export default function RedefinirSenhaPage() {
  const { t } = useLang();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [senha, setSenha] = useState('');
  const nav = useNavigate();
  const toast = useToast();
  const m = useMutation({
    mutationFn: () => api.auth.redefinirSenha(token, senha),
    onSuccess: () => { toast({ kind: 'ok', title: t('conta.redefinida') }); nav('/entrar'); },
  });
  return (
    <div className="container conta-mini">
      <div className="card card--l panel">
        <h1 className="t-h3">{t('conta.redefinirTitulo')}</h1>
        {!token ? (
          <Banner kind="ambar">{t('conta.tokenFaltando')} <Link to="/esqueci-senha">{t('conta.esqueci')}</Link></Banner>
        ) : (
          <form className="stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); if (senha.length >= SENHA_MINIMA) m.mutate(); }}>
            {m.error && <Banner kind="erro">{(m.error as Error).message}</Banner>}
            <TextField label={t('conta.novaSenha')} type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} help={`min. ${SENHA_MINIMA}`} />
            <Button variant="fogo" size="lg" block type="submit" loading={m.isPending} disabled={senha.length < SENHA_MINIMA}>{t('conta.redefinir')}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
