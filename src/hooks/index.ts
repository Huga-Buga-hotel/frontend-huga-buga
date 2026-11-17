import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { useAuth } from '../context/auth';
import { useToast } from '../components/ui/overlay';
import { useNavigate } from 'react-router-dom';
import type { CavernaCardRes } from '../api/types';

/** Idioma atual + t tipado. */
export function useLang() {
  const { t, i18n } = useTranslation();
  return { t, lang: i18n.language, i18n };
}

/** Segundos até um instante ISO (atualiza a cada segundo). */
export function useCountdown(alvo: string | null | undefined): number | null {
  const calc = useCallback(() => (alvo ? Math.round((new Date(alvo).getTime() - Date.now()) / 1000) : null), [alvo]);
  const [s, setS] = useState<number | null>(calc);
  useEffect(() => {
    setS(calc());
    if (!alvo) return;
    const id = setInterval(() => setS(calc()), 1000);
    return () => clearInterval(id);
  }, [alvo, calc]);
  return s;
}

/** "2 adultos · 2 crianças" */
export function useTriboTexto() {
  const { t } = useLang();
  return useCallback(
    (adultos: number, criancas: number, curto = false) => {
      if (curto) {
        return criancas ? `${t('comum.adultosCurto', { count: adultos })} · ${t('comum.criancasCurto', { count: criancas })}` : t('comum.adultosCurto', { count: adultos });
      }
      return criancas
        ? `${t('comum.adultos', { count: adultos })} · ${t('comum.criancas', { count: criancas })}`
        : t('comum.adultos', { count: adultos });
    },
    [t],
  );
}

/** Favoritos da conta, com toast "Salva!" e desfazer. */
export function useFavoritos() {
  const { logado } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const { t } = useLang();
  const nav = useNavigate();
  const q = useQuery({ queryKey: ['me', 'favoritos'], queryFn: api.me.favoritos, enabled: logado, staleTime: 60_000 });
  const ids = new Set((q.data ?? []).map((c) => c.id));

  const m = useMutation({
    mutationFn: async ({ c, on }: { c: Pick<CavernaCardRes, 'id' | 'nome'>; on: boolean }) =>
      on ? api.me.favoritar(c.id) : api.me.desfavoritar(c.id),
    onSettled: () => qc.invalidateQueries({ queryKey: ['me', 'favoritos'] }),
  });

  const toggle = useCallback(
    (c: Pick<CavernaCardRes, 'id' | 'nome'>) => {
      if (!logado) {
        toast({ kind: 'info', title: t('perfil.entreParaSalvar'), action: { label: t('comum.entrar'), onClick: () => nav('/entrar') } });
        return;
      }
      const on = !ids.has(c.id);
      m.mutate({ c, on });
      if (on) {
        toast({ kind: 'fogo', title: t('perfil.salvaFav'), text: t('perfil.salvaFavTexto', { nome: c.nome }), action: { label: t('perfil.desfazer'), onClick: () => m.mutate({ c, on: false }) } });
      } else {
        toast({ kind: 'info', title: t('perfil.removidaFav') });
      }
    },
    [logado, ids, m, toast, t, nav],
  );

  return { ids, toggle, lista: q.data ?? [], carregando: q.isLoading };
}

/** Rola para o topo ao montar (troca de página). */
export function useScrollTop(dep?: unknown) {
  useEffect(() => { window.scrollTo({ top: 0 }); }, [dep]);
}

export function useMediaQuery(q: string) {
  const [m, setM] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q).matches : false));
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}

export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
