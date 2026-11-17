import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLang } from '../hooks';
import { Button, Icon, ImageSlot } from '../components/ui/basics';
import { Faixa } from './HomePage';

/** "A Tribo": sobre o hotel, perguntas frequentes, regras e contato (sem prancha própria no Figma: segue o sistema de design). */
export default function ATriboPage() {
  const { t } = useLang();
  const loc = useLocation();
  const faq = t('tribo.faq', { returnObjects: true }) as { q: string; a: string }[];
  const regras = t('tribo.regras', { returnObjects: true }) as string[];
  useEffect(() => {
    if (loc.hash) document.getElementById(loc.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [loc.hash]);
  return (
    <div>
      <section className="container tribo-hero">
        <div className="stack" style={{ gap: 18 }}>
          <span className="eyebrow">{t('tribo.eyebrow')}</span>
          <h1 className="t-h1">{t('tribo.titulo')}</h1>
          <p className="t-body-l" style={{ maxWidth: 520 }}>{t('tribo.texto')}</p>
        </div>
        <div style={{ height: 320 }}><ImageSlot caption={t('home.fotoHero')} mask="heroDesk" /></div>
      </section>
      <div className="hide-mobile"><Faixa /></div>
      <section className="container section tribo-grid">
        <div id="faq" className="stack" style={{ gap: 14, scrollMarginTop: 100 }}>
          <h2 className="t-h3">{t('tribo.faqTitulo')}</h2>
          {faq.map((f, i) => (
            <details key={i} className="card faq" id={i === 2 ? 'cancelamento' : undefined} open={i === 2 && loc.hash === '#cancelamento'}>
              <summary><span>{f.q}</span><Icon name="expand_more" /></summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
        <div className="stack" style={{ gap: 24 }}>
          <div id="regras" className="panel--couro tx-couro" style={{ scrollMarginTop: 100 }}>
            <h2 className="t-h4">{t('tribo.regrasTitulo')}</h2>
            <ul className="stack" style={{ gap: 10 }}>
              {regras.map((r) => <li key={r} className="row" style={{ gap: 10, alignItems: 'flex-start' }}><Icon name="footprint" fill style={{ color: 'var(--fogo)' }} />{r}</li>)}
            </ul>
          </div>
          <div id="contato" className="card card--l panel" style={{ scrollMarginTop: 100 }}>
            <h2 className="t-h4">{t('tribo.contatoTitulo')}</h2>
            <p className="t-muted">{t('tribo.contatoTexto')}</p>
            <div className="stack" style={{ gap: 8, fontWeight: 700 }}>
              <a href="tel:+555430000000" className="row" style={{ gap: 8, color: 'var(--carvao)' }}><Icon name="call" style={{ color: 'var(--link)' }} />{t('rodape.telefone')}</a>
              <span className="row" style={{ gap: 8 }}><Icon name="location_on" style={{ color: 'var(--link)' }} />{t('rodape.endereco1')} · {t('rodape.endereco2')}</span>
            </div>
            <Button variant="fogo" icon="forum" onClick={() => window.dispatchEvent(new Event('hb:abrir-chat'))}>{t('perfil.falarBugao')}</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
