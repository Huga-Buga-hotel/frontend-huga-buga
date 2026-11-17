import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Nav } from './Nav';
import { Icon } from '../ui/basics';
import { Modal, ModalIcon } from '../ui/overlay';
import { Button } from '../ui/basics';
import { useAuth } from '../../context/auth';
import { useLang } from '../../hooks';
import { Trans } from 'react-i18next';
import { PageLoader } from '../ui/states';

const ChatWidget = lazy(() => import('../chat/ChatWidget'));

export function TabBar() {
  const { t } = useLang();
  const { logado } = useAuth();
  const loc = useLocation();
  const p = loc.pathname;
  const tabs = [
    { to: '/', icon: 'home', label: t('comum.inicio'), on: p === '/' || p.startsWith('/experiencias') || p.startsWith('/banquete') || p.startsWith('/a-tribo') },
    { to: '/cavernas', icon: 'cabin', label: t('comum.cavernas'), on: p.startsWith('/cavernas') },
    { to: logado ? '/minhas-reservas' : '/buscar-reserva', icon: 'confirmation_number', label: t('comum.reservas'), on: p.startsWith('/minhas-reservas') || p.startsWith('/buscar-reserva') || p.startsWith('/reserva') },
    { to: logado ? '/perfil' : '/entrar', icon: 'person', label: t('comum.perfil'), on: p.startsWith('/perfil') || p.startsWith('/entrar') || p.startsWith('/criar-conta') },
  ];
  return (
    <nav className="tabbar" aria-label={t('nav.principal')}>
      {tabs.map((tb) => (
        <NavLink key={tb.label} to={tb.to} className={tb.on ? 'is-on' : ''} aria-current={tb.on ? 'page' : undefined}>
          <span className="tabbar__pill"><Icon name={tb.icon} /></span>
          <span>{tb.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function Footer() {
  const { t } = useLang();
  return (
    <footer className="footer tx-caverna">
      <div className="footer__inner">
        <div className="footer__col footer__brand" style={{ gap: 10 }}>
          <span className="logo">HUGA BUGA</span>
          <span>{t('rodape.slogan')}</span>
        </div>
        <div className="footer__col">
          <b>{t('rodape.hotel')}</b>
          <Link to="/cavernas">{t('comum.cavernas')}</Link>
          <Link to="/experiencias">{t('comum.experiencias')}</Link>
          <Link to="/banquete">{t('comum.banquete')}</Link>
        </div>
        <div className="footer__col">
          <b>{t('rodape.ajuda')}</b>
          <Link to="/a-tribo#faq">{t('rodape.faq')}</Link>
          <Link to="/a-tribo#cancelamento">{t('rodape.cancelamento')}</Link>
          <Link to="/a-tribo#contato">{t('rodape.fale')}</Link>
          <Link to="/buscar-reserva">{t('rodape.buscarReserva')}</Link>
        </div>
        <div className="footer__col">
          <b>{t('rodape.onde')}</b>
          <span>{t('rodape.endereco1')}<br />{t('rodape.endereco2')}</span>
          <a href="tel:+555430000000">{t('rodape.telefone')}</a>
        </div>
      </div>
    </footer>
  );
}

/** Modal "A fogueira apagou" (sessão expirada). */
function SessaoExpiradaModal() {
  const { sessaoExpirada, fecharSessaoExpirada } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const loc = useLocation();
  return (
    <Modal open={sessaoExpirada} onClose={fecharSessaoExpirada} label={t('estados.sessaoTitulo')}>
      <ModalIcon icon="mode_heat_off" kind="neutro" />
      <div className="modal__title">{t('estados.sessaoTitulo')}</div>
      <p className="modal__text"><Trans i18nKey="estados.sessaoTexto" components={{ b: <b /> }} /></p>
      <Button variant="fogo" size="lg" block onClick={() => { fecharSessaoExpirada(); nav('/entrar', { state: { de: loc.pathname + loc.search } }); }}>
        {t('estados.acender')}
      </Button>
      <button className="link-btn link-btn--muted" onClick={fecharSessaoExpirada}>{t('conta.semConta')}</button>
    </Modal>
  );
}

/** Esqueleto geral: navbar escura, conteúdo, rodapé, tab bar (mobile) e o Bugão. */
export function Layout({ semRodape }: { semRodape?: boolean }) {
  const loc = useLocation();
  const [chatAberto, setChatAberto] = useState(false);
  const { t } = useLang();
  useEffect(() => {
    if (!loc.hash) window.scrollTo({ top: 0 });
  }, [loc.pathname, loc.hash]);
  useEffect(() => {
    const abrir = () => setChatAberto(true);
    window.addEventListener('hb:abrir-chat', abrir);
    return () => window.removeEventListener('hb:abrir-chat', abrir);
  }, []);
  const esconderFab = loc.pathname.startsWith('/reserva/') || loc.pathname.startsWith('/admin');
  return (
    <div className="page com-tabbar">
      <a href="#conteudo" className="sr-only">Pular para o conteúdo</a>
      <Nav />
      <main id="conteudo" className="page__main">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      {!semRodape && <Footer />}
      <TabBar />
      {!esconderFab && !chatAberto && (
        <button className="chat-fab" onClick={() => setChatAberto(true)} aria-label={t('chat.abrir')}>
          <span className="chat-fab__icon"><Icon name="forum" /></span>
          <span className="chat-fab__label">{t('chat.abrir')}</span>
        </button>
      )}
      {chatAberto && (
        <Suspense fallback={null}>
          <ChatWidget onClose={() => setChatAberto(false)} />
        </Suspense>
      )}
      <SessaoExpiradaModal />
    </div>
  );
}
