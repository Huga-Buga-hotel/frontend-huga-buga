import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Icon, ImageSlot } from '../ui/basics';
import { useFavoritos, useLang } from '../../hooks';
import { api } from '../../api/endpoints';
import { addDays, brl, diaMes, nota } from '../../lib/format';
import { PRAZO_CANCELAR_DIAS } from '../../lib/regras';
import type { CavernaCardRes, ComodidadeRes } from '../../api/types';

export function useComodidades() {
  const q = useQuery({ queryKey: ['comodidades'], queryFn: api.cavernas.comodidades, staleTime: 3_600_000 });
  const mapa = new Map<string, ComodidadeRes>((q.data ?? []).map((c) => [c.id, c]));
  return mapa;
}

export function cavernaHref(c: Pick<CavernaCardRes, 'slug'>, qs?: string) {
  return `/cavernas/${c.slug}${qs ? `?${qs}` : ''}`;
}

function FavBtn({ c, className = '' }: { c: CavernaCardRes; className?: string }) {
  const { ids, toggle } = useFavoritos();
  const { t } = useLang();
  const on = ids.has(c.id);
  return (
    <button
      type="button"
      className={`icon-btn icon-btn--s ${on ? 'is-on' : ''} ${className}`}
      aria-pressed={on}
      aria-label={`${t('comum.favoritas')}: ${c.nome}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(c); }}
    >
      <Icon name="favorite" />
    </button>
  );
}

/** Card de caverna em grade (home e favoritas). */
export function CavernaCardGrid({ c, qs }: { c: CavernaCardRes; qs?: string }) {
  const { t, lang } = useLang();
  return (
    <article className="cc card card--sombra">
      <Link to={cavernaHref(c, qs)} className="cc__media" aria-label={c.nome}>
        <ImageSlot caption={t('home.fotoDe', { nome: c.nome })} mask="lasca" />
        <span className="tag tag--papel cc__tag">{t(`comum.categoria.${c.categoria}`)}</span>
      </Link>
      <FavBtn c={c} className="cc__fav" />
      <div className="cc__body">
        <div className="cc__head">
          <Link to={cavernaHref(c, qs)} className="cc__name">{c.nome}</Link>
          <span className="cc__nota">★ {nota(c.notaMedia, lang)}</span>
        </div>
        <div className="meta">
          <span><Icon name="groups" />{t('comum.ate', { n: c.capacidade })}</span>
          <span><Icon name="bed" />{t('comum.camas', { count: c.camas })}</span>
          <span><Icon name="square_foot" />{c.areaM2} m²</span>
        </div>
        <div className="cc__foot dashed-top">
          <span><span className="t-price" style={{ fontSize: 26 }}>{brl(c.precoBaseCentavos, lang)}</span><span className="t-muted" style={{ fontSize: 13 }}> {t('comum.porNoite')}</span></span>
          <Link to={cavernaHref(c, qs)} className="btn btn--carvao btn--sm" style={{ boxShadow: 'none', fontWeight: 700 }}>{t('comum.verCaverna')}</Link>
        </div>
      </div>
    </article>
  );
}

/** Mini card do carrossel mobile da home. */
export function CavernaCardMini({ c }: { c: CavernaCardRes }) {
  const { lang } = useLang();
  return (
    <Link to={cavernaHref(c)} className="cc-mini">
      <div style={{ height: 110 }}><ImageSlot caption={c.nome} radius={10} /></div>
      <div className="row between" style={{ fontWeight: 800, fontSize: 14, gap: 8 }}><span>{c.nome}</span><span>{brl(c.precoBaseCentavos, lang)}</span></div>
    </Link>
  );
}

/** Linha da lista de cavernas (desktop) e card empilhado (mobile). */
export function CavernaListItem({ c, noites, qs, checkIn }: { c: CavernaCardRes; noites: number; qs?: string; checkIn?: string }) {
  const { t, lang } = useLang();
  const comods = useComodidades();
  const primeira = c.comodidades.map((id) => comods.get(id)).find(Boolean);
  const href = cavernaHref(c, qs);
  const prazo = checkIn ? addDays(checkIn, -PRAZO_CANCELAR_DIAS) : null;
  return (
    <article className="cl card card--sombra">
      <Link to={href} className="cl__media" aria-label={c.nome}>
        <ImageSlot caption={t('home.fotoDe', { nome: c.nome })} mask="lasca" className="hide-mobile" />
        <ImageSlot caption={c.nome} radius={10} className="only-mobile" />
        {c.ultimas && c.unidadesLivres != null && (
          <span className="tag tag--fogo cl__hot"><Icon name="local_fire_department" />{t('comum.ultimas', { n: c.unidadesLivres })}</span>
        )}
      </Link>
      <div className="cl__info">
        <div className="row" style={{ gap: 8 }}>
          <span className="tag tag--bege">{t(`comum.categoria.${c.categoria}`)}</span>
          <b style={{ fontSize: 14 }}>★ {nota(c.notaMedia, lang)}</b>
          <span style={{ fontSize: 13, color: 'var(--pedra)' }}>({t('comum.relatos', { count: c.totalRelatos })})</span>
        </div>
        <Link to={href} className="cl__name">{c.nome}</Link>
        <p className="cl__desc">{c.resumo}</p>
        <div className="meta" style={{ color: 'var(--texto-corpo)' }}>
          <span><Icon name="groups" />{t('comum.ate', { n: c.capacidade })}</span>
          <span><Icon name="bed" />{t('comum.camas', { count: c.camas })}</span>
          {primeira && <span><Icon name={primeira.icone} />{primeira.nome}</span>}
        </div>
        {prazo && <div className="ok-line" style={{ marginTop: 'auto' }}><Icon name="check_circle" />{t('comum.cancelamentoGratis', { data: diaMes(prazo, lang) })}</div>}
      </div>
      <div className="cl__price">
        <span className="t-price" style={{ fontSize: 34 }}>{brl(c.precoBaseCentavos, lang)}</span>
        <span className="t-muted" style={{ fontSize: 13 }}>{t('comum.porNoiteLongo')}</span>
        {c.totalEstadiaCentavos != null && noites > 0 && (
          <span style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
            {t('lista.totalNoites', { total: brl(c.totalEstadiaCentavos, lang), noites: t('comum.noites', { count: noites }) })}
          </span>
        )}
        <Link to={href} className="btn btn--carvao btn--sm" style={{ boxShadow: 'none', alignSelf: 'stretch' }}>{t('comum.verCaverna')}</Link>
      </div>
      {/* rodapé do card no mobile */}
      <div className="cl__m">
        <div>
          <div className="t-price" style={{ fontSize: 22 }}>{c.nome}</div>
          <div style={{ fontSize: 12, color: 'var(--texto-2)', marginTop: 3 }}>★ {nota(c.notaMedia, lang)} · {t('comum.ate', { n: c.capacidade })}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="t-price" style={{ fontSize: 22 }}>{brl(c.precoBaseCentavos, lang)}</div>
          <div style={{ fontSize: 11, color: 'var(--texto-2)' }}>{t('comum.porNoite')}</div>
        </div>
      </div>
    </article>
  );
}

export function CavernaListSkeleton() {
  return (
    <div className="sk-card" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,200px) 1fr 150px', gap: 20 }} aria-hidden>
      <div className="sk" style={{ height: 130, borderRadius: 'var(--r-l1)' }} />
      <div className="stack" style={{ gap: 10, paddingTop: 6 }}>
        <div className="sk sk--2" style={{ height: 12, width: '28%' }} />
        <div className="sk" style={{ height: 24, width: '62%' }} />
        <div className="sk sk--2" style={{ height: 10, width: '88%' }} />
        <div className="sk sk--2" style={{ height: 10, width: '70%' }} />
      </div>
      <div className="stack" style={{ gap: 8, alignItems: 'flex-end', justifyContent: 'flex-end' }}>
        <div className="sk" style={{ height: 26, width: 90 }} />
        <div className="sk" style={{ height: 38, width: '100%', borderRadius: 'var(--r-m)' }} />
      </div>
    </div>
  );
}
