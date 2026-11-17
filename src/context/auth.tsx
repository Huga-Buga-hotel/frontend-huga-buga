import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { tokens, type SessaoUsuario } from '../api/client';
import type { CadastroReq, Idioma } from '../api/types';
import i18n, { IDIOMAS, trocarIdioma } from '../i18n';

interface AuthCtx {
  usuario: SessaoUsuario | null;
  logado: boolean;
  admin: boolean;
  entrar: (email: string, senha: string, lembrar: boolean) => Promise<SessaoUsuario>;
  cadastrar: (dados: CadastroReq, lembrar?: boolean) => Promise<SessaoUsuario>;
  sair: () => Promise<void>;
  sessaoExpirada: boolean;
  fecharSessaoExpirada: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

/** Traz o idioma salvo no perfil (sincronizado com /me/preferencias). */
async function sincronizarIdioma() {
  try {
    const p = await api.me.preferencias();
    if (p.idioma && (IDIOMAS as readonly string[]).includes(p.idioma) && p.idioma !== i18n.language) {
      await trocarIdioma(p.idioma as Idioma);
    }
  } catch { /* sem preferências: mantém o do navegador */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<SessaoUsuario | null>(() => tokens.usuario);
  const [sessaoExpirada, setSessaoExpirada] = useState(false);
  const qc = useQueryClient();

  useEffect(() => tokens.onChange(() => setUsuario(tokens.usuario)), []);
  useEffect(() => tokens.onExpired(() => { setSessaoExpirada(true); qc.removeQueries({ queryKey: ['me'] }); }), [qc]);

  const entrar = useCallback(async (email: string, senha: string, lembrar: boolean) => {
    const t = await api.auth.login({ email: email.trim(), senha, lembrar });
    tokens.salvar(t, lembrar);
    setSessaoExpirada(false);
    void sincronizarIdioma();
    await qc.invalidateQueries();
    return { usuarioId: t.usuarioId, nome: t.nome, role: t.role };
  }, [qc]);

  const cadastrar = useCallback(async (dados: CadastroReq, lembrar = true) => {
    const t = await api.auth.cadastro(dados);
    tokens.salvar(t, lembrar);
    // o idioma escolhido no site vai para o perfil novo
    try { await api.me.salvarPreferencias({ idioma: i18n.language as Idioma }); } catch { /* ignore */ }
    await qc.invalidateQueries();
    return { usuarioId: t.usuarioId, nome: t.nome, role: t.role };
  }, [qc]);

  const sair = useCallback(async () => {
    const refresh = tokens.refresh;
    if (refresh) { try { await api.auth.logout(refresh); } catch { /* já expirou: tudo bem */ } }
    tokens.limpar();
    qc.removeQueries({ queryKey: ['me'] });
    qc.removeQueries({ queryKey: ['admin'] });
  }, [qc]);

  const value = useMemo<AuthCtx>(() => ({
    usuario,
    logado: !!usuario,
    admin: usuario?.role === 'ADMIN',
    entrar,
    cadastrar,
    sair,
    sessaoExpirada,
    fecharSessaoExpirada: () => setSessaoExpirada(false),
  }), [usuario, entrar, cadastrar, sair, sessaoExpirada]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth fora do AuthProvider');
  return c;
}
