import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button, Feet, Icon, ImageSlot } from './basics';
import { useLang } from '../../hooks';
import { isApiError } from '../../api/client';

/** Carregando página: pegadas andando. */
export function PageLoader({ texto }: { texto?: string }) {
  const { t } = useLang();
  return (
    <div className="container" style={{ padding: '96px var(--gutter)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }} role="status">
      <Feet n={4} large />
      <span className="t-muted" style={{ fontWeight: 700 }}>{texto ?? t('comum.carregando')}</span>
    </div>
  );
}

/** Loader temático (pedras batendo + fogueira) para transições longas, ex.: pagamento. */
export function FireLoader({ titulo, texto }: { titulo: string; texto: string }) {
  const pedra = (anim: string, radius: string) => (
    <div className="tx-granito" style={{ width: 64, height: 48, border: '3px solid #120e0b', borderRadius: radius, animation: anim }} />
  );
  return (
    <div className="overlay tx-caverna" style={{ background: undefined, color: 'var(--osso)', flexDirection: 'column', gap: 28, textAlign: 'center', zIndex: 120 }} role="alertdialog" aria-live="assertive" aria-label={titulo}>
      <div style={{ position: 'relative', width: 200, height: 170, display: 'flex', flexDirection: 'column', alignItems: 'center' }} aria-hidden>
        <div style={{ display: 'flex', gap: 40, alignItems: 'center', height: 70 }}>
          {pedra('hbKnockL 1.2s ease-in-out infinite', '46% 54% 40% 60% / 55% 45% 55% 45%')}
          {pedra('hbKnockR 1.2s ease-in-out infinite', '54% 46% 60% 40% / 45% 55% 45% 55%')}
        </div>
        <div style={{ position: 'absolute', left: 92, top: 26, width: 16, height: 16, background: '#ffd27a', boxShadow: '0 0 18px 6px rgba(255,170,70,.8)', animation: 'hbSpark 1.2s ease-in-out infinite' }} />
        <div style={{ marginTop: 18, width: 54, height: 72, borderRadius: '50% 50% 45% 45% / 62% 62% 38% 38%', background: 'radial-gradient(circle at 50% 75%,#ffe08a 0 22%,#f39a3c 45%,#d4622a 75%)', boxShadow: '0 0 40px 10px rgba(224,116,60,.35)', transformOrigin: '50% 100%', animation: 'hbFlame .9s ease-in-out infinite' }} />
        <div style={{ width: 90, height: 12, marginTop: -4, borderRadius: 6, background: '#5a4030', border: '2px solid #120e0b' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360, padding: '0 24px' }}>
        <div style={{ font: "900 34px/1 'Londrina Solid', sans-serif" }}>{titulo}</div>
        <div style={{ fontSize: 15, color: 'var(--osso-2)', lineHeight: 1.5 }}>{texto}</div>
      </div>
      <div style={{ width: 240, height: 14, border: '2.5px solid var(--osso)', borderRadius: '7px 3px 6px 4px', padding: 2 }}>
        <div style={{ height: '100%', background: 'var(--tocha)', borderRadius: '4px 2px 4px 2px', animation: 'hbGrow 4s ease-out infinite alternate' }} />
      </div>
      <div className="logo" style={{ fontSize: 22, marginTop: 20 }}>HUGA BUGA</div>
    </div>
  );
}

/** Erro de rede/servidor: diz o que aconteceu e o próximo passo. */
export function ErrorState({ erro, onRetry, compacto }: { erro: unknown; onRetry?: () => void; compacto?: boolean }) {
  const { t } = useLang();
  const api = isApiError(erro) ? erro : null;
  const rede = !api || api.rede || api.status >= 500;
  const titulo = rede ? t('estados.redeTitulo') : (api?.titulo ?? t('estados.redeTitulo'));
  const texto = rede ? t('estados.redeTexto') : (api?.message ?? '');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center', padding: compacto ? 24 : '64px 24px' }} role="alert">
      {!compacto && <div style={{ width: 260, height: 180 }}><ImageSlot caption={t('estados.redeImg')} mask="heroDesk" /></div>}
      <div className="t-h3" style={{ fontSize: compacto ? 28 : 36 }}>{titulo}</div>
      <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--texto-corpo)', maxWidth: 380 }}>{texto}</p>
      <div className="row wrap" style={{ gap: 10, justifyContent: 'center' }}>
        {onRetry && <Button variant="carvao" size="md" icon="refresh" onClick={onRetry}>{t('comum.tentarDeNovo')}</Button>}
        <a className="btn btn--contorno btn--md" href="tel:+555430000000">{t('estados.falarRecepcao')}</a>
      </div>
      {api?.ref && <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--pedra)' }}>{t('estados.erroRef', { status: api.status || 503, ref: api.ref })}</span>}
    </div>
  );
}

export function EmptyState({ img, titulo, texto, children }: { img?: string; titulo: string; texto?: ReactNode; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center', padding: '40px 24px' }}>
      {img && <div style={{ width: 220, height: 160 }}><ImageSlot caption={img} mask="vazio" /></div>}
      <div className="t-h3" style={{ fontSize: 30 }}>{titulo}</div>
      {texto && <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--texto-corpo)', maxWidth: 420 }}>{texto}</p>}
      {children}
    </div>
  );
}

export function NotFoundContent() {
  const { t } = useLang();
  return (
    <div className="container nf">
      <div className="stack" style={{ gap: 18 }}>
        <div className="nf__num" aria-label="404">4<Icon name="skeleton" />4</div>
        <h1 className="t-h1" style={{ fontSize: 44 }}>{t('estados.naoExisteTitulo')}</h1>
        <p style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--texto-corpo)' }}>{t('estados.naoExisteTexto')}</p>
        <div className="row wrap" style={{ gap: 10 }}>
          <Link to="/" className="btn btn--fogo btn--md">{t('estados.voltarInicio')}</Link>
          <Link to="/cavernas" className="btn btn--contorno btn--md">{t('home.verCavernas')}</Link>
        </div>
      </div>
      <div style={{ height: 340 }}><ImageSlot caption={t('estados.naoExisteImg')} mask="heroDesk" /></div>
    </div>
  );
}
