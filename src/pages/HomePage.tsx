import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { useLang } from '../hooks';
import { Icon, ImageSlot, Sk } from '../components/ui/basics';
import { ErrorState } from '../components/ui/states';
import { SearchBoard } from '../components/busca/SearchBoard';
import { CavernaCardGrid, CavernaCardMini } from '../components/cavernas/CavernaCards';
import { duracao, hora, nota, numero } from '../lib/format';
import type { AtividadeRes, CavernaCardRes } from '../api/types';

export function Faixa() {
  const { t } = useLang();
  const palavras = t('home.faixa', { returnObjects: true }) as string[];
  const seq = [...palavras, ...palavras, ...palavras, ...palavras];
  return (
    <div className="faixa" aria-hidden>
      <div className="faixa__track">
        {seq.map((p, i) => (
          <span key={i} style={{ display: 'contents' }}>
            <span>{p}</span>
            <i />
          </span>
        ))}
      </div>
    </div>
  );
}

function resumoNotas(cavernas: CavernaCardRes[]) {
  const total = cavernas.reduce((s, c) => s + c.totalRelatos, 0);
  const media = total ? cavernas.reduce((s, c) => s + c.notaMedia * c.totalRelatos, 0) / total : 0;
  return { total, media };
}

function aventuraDesc(a: AtividadeRes, t: ReturnType<typeof useLang>['t']) {
  if (a.categoria === 'NOITE') return `${t('experiencias.cat.NOITE')} · ${duracao(a.duracaoMin)}`;
  if (a.idadeMin != null && a.idadeMax != null) return `${a.idadeMin}–${a.idadeMax} · ${duracao(a.duracaoMin)}`;
  return `${t(`experiencias.cat.${a.categoria}`)} · ${duracao(a.duracaoMin)}`;
}

export default function HomePage() {
  const { t, lang } = useLang();
  const home = useQuery({ queryKey: ['home'], queryFn: api.home, staleTime: 120_000 });
  const cavernas = home.data?.cavernas ?? [];
  const { total, media } = resumoNotas(cavernas);
  const jantar = home.data?.banquete.turnos.find((x) => /jantar|dinner|cena/i.test(x.nome));

  return (
    <div className="home">
      {/* HERO */}
      <section className="container home-hero">
        <div className="home-hero__text">
          <span className="home-hero__selo hide-mobile">
            <Icon name="local_fire_department" fill size={18} />
            {t('home.selo')}
          </span>
          <div className="home-hero__img only-mobile"><ImageSlot caption={t('home.fotoHeroMob')} mask="heroMob" /></div>
          <h1 className="home-hero__title">
            {t('home.titulo1')} <span className="t-fogo">{t('home.titulo2')}</span>
          </h1>
          <p className="t-body-l hide-mobile" style={{ maxWidth: 500 }}>{t('home.lead')}</p>
          <div className="row hide-mobile" style={{ gap: 12 }}>
            <Link to="/cavernas" className="btn btn--fogo btn--lg">{t('home.verCavernas')}<Icon name="arrow_forward" /></Link>
          </div>
          {total > 0 && (
            <div className="row hide-mobile" style={{ gap: 12, fontSize: 14, color: 'var(--texto-corpo)' }}>
              <div className="home-hero__avatares" aria-hidden><span /><span /><span /></div>
              <span><b style={{ color: 'var(--carvao)' }}>★ {nota(media, lang)}</b> · {t('home.relatosTribo', { n: numero(total, lang) })}</span>
            </div>
          )}
        </div>
        <div className="home-hero__media hide-mobile">
          <ImageSlot caption={t('home.fotoHero')} mask="heroDesk" />
          <div className="home-hero__badge">
            <div className="home-hero__badge-ic"><Icon name="child_care" size={24} /></div>
            <div><div style={{ fontWeight: 800, fontSize: 15 }}>{t('home.criancaGratis')}</div><div style={{ fontSize: 13, color: 'var(--texto-2)' }}>{t('home.criancaKit')}</div></div>
          </div>
        </div>
      </section>

      <div className="container home-board">
        <SearchBoard />
      </div>

      <div className="hide-mobile" style={{ marginTop: 72 }}><Faixa /></div>

      {/* CAVERNAS */}
      <section className="container section home-cavernas">
        <div className="section-head">
          <div>
            <div className="eyebrow hide-mobile">{t('home.ondeDorme')}</div>
            <h2 className="t-h2">{t('home.nossasCavernas')}</h2>
          </div>
          <Link to="/cavernas" className="link-btn" style={{ fontSize: 15 }}>
            <span className="hide-mobile">{t('home.verTodasN', { n: home.data?.totalCavernas ?? cavernas.length })}</span>
            <span className="only-mobile">{t('comum.verTodas')}</span>
            <Icon name="arrow_forward" className="hide-mobile" />
          </Link>
        </div>
        {home.isError ? (
          <ErrorState erro={home.error} onRetry={() => home.refetch()} compacto />
        ) : (
          <>
            <div className="grid-3 hide-mobile">
              {home.isLoading
                ? [0, 1, 2].map((i) => <div key={i} className="sk-card" style={{ height: 392 }}><Sk h={230} /></div>)
                : cavernas.slice(0, 3).map((c) => <CavernaCardGrid key={c.id} c={c} />)}
            </div>
            <div className="carrossel only-mobile">
              {home.isLoading ? [0, 1].map((i) => <div key={i} className="cc-mini"><Sk h={110} /></div>) : cavernas.map((c) => <CavernaCardMini key={c.id} c={c} />)}
            </div>
          </>
        )}
      </section>

      {/* AVENTURAS */}
      {(home.data?.aventuras.length ?? 0) > 0 && (
        <section className="container section" style={{ paddingTop: 24 }}>
          <div>
            <div className="eyebrow">{t('home.praCacadores')}</div>
            <h2 className="t-h2" style={{ marginTop: 6 }}>{t('home.aventuras')}</h2>
          </div>
          <div className="home-aventuras">
            {home.data!.aventuras.slice(0, 4).map((a) => (
              <Link key={a.id} to="/experiencias" className="home-aventura">
                <div className="home-aventura__seixo"><ImageSlot caption={a.nome} circle /></div>
                <div style={{ font: "900 22px/1.1 'Londrina Solid',sans-serif" }}>{a.nome}</div>
                <div style={{ fontSize: 14, color: 'var(--texto-2)' }}>{aventuraDesc(a, t)}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* BANQUETE */}
      <section className="container" style={{ paddingBottom: 64 }}>
        <div className="home-banquete">
          <div style={{ position: 'relative', minHeight: 260 }}><ImageSlot caption={t('home.fotoBanquete')} dark /></div>
          <div className="home-banquete__txt">
            <span className="eyebrow" style={{ color: 'var(--tocha)' }}>{t('home.restaurante')}</span>
            <h2 className="t-h2">{t('comum.banquete')}</h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: 'var(--osso-2)', maxWidth: 420 }}>
              {t('home.banqueteTexto')}
              {jantar && <> <b style={{ color: 'var(--osso)' }}>{hora(jantar.abre, true, lang)} – {hora(jantar.fecha, true, lang)}</b></>}
            </p>
            <div className="row wrap" style={{ gap: 12 }}>
              <Link to="/banquete#reservar" className="btn btn--fogo btn--md" style={{ fontSize: 15 }}>{t('home.reservarMesa')}</Link>
              <Link to="/banquete#cardapio" className="btn btn--claro btn--md" style={{ fontSize: 15 }}>{t('home.verCardapio')}</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
