import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Icon } from '../ui/basics';
import { useAuth } from '../../context/auth';
import { useLang } from '../../hooks';
import { IDIOMAS, type Idioma, trocarIdioma } from '../../i18n';
import { iniciais } from '../../lib/format';
import { api } from '../../api/endpoints';

const LANG_LABEL: Record<Idioma, string> = { 'pt-BR': 'PT', en: 'EN', es: 'ES' };

/** Troca o idioma e, com conta, salva no perfil (/me/preferencias). */
export function useTrocarIdioma() {
  const { logado } = useAuth();
  return (l: Idioma) => {
    void trocarIdioma(l);
    if (logado) void api.me.salvarPreferencias({ idioma: l }).catch(() => {});
  };
}

export function Nav() {
  const { t, lang } = useLang();
  const { usuario, logado, admin, sair } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const loc = useLocation();
  const nav = useNavigate();
  const mudarIdioma = useTrocarIdioma();

  useEffect(() => { setMenuAberto(false); setUserMenu(false); }, [loc.pathname]);
  useEffect(() => {
    if (!userMenu) return;
    const fn = (e: MouseEvent) => { if (!userRef.current?.contains(e.target as Node)) setUserMenu(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setUserMenu(false); };
    document.addEventListener('mousedown', fn);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fn); document.removeEventListener('keydown', esc); };
  }, [userMenu]);

  const primeiroNome = usuario?.nome.split(' ')[0] ?? '';
  const links = [
    { to: '/cavernas', label: t('comum.cavernas') },
    { to: '/experiencias', label: t('comum.experiencias') },
    { to: '/banquete', label: t('comum.banquete') },
    { to: '/a-tribo', label: t('comum.aTribo') },
  ];

  return (
    <header className="nav tx-caverna">
      <div className="nav__inner">
        <Link to="/" className="nav__brand" aria-label="Huga Buga Hotel — início">
          <span className="logo">HUGA BUGA</span>
          <span className="nav__sub">{t('comum.hotelSub')}</span>
        </Link>
        <div className="nav__spacer" />
        <nav className="nav__links" aria-label={t('nav.principal')}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav__link ${isActive ? 'is-on' : ''}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="nav__div" />
        <div className="nav__langs" role="group" aria-label={t('nav.trocarIdioma')}>
          {IDIOMAS.map((l, i) => (
            <span key={l} style={{ display: 'contents' }}>
              {i > 0 && <span aria-hidden>·</span>}
              <button type="button" aria-pressed={lang === l} onClick={() => mudarIdioma(l)} lang={l}>
                {LANG_LABEL[l]}
              </button>
            </span>
          ))}
        </div>
        {logado ? (
          <div className="nav__user" ref={userRef}>
            <button className="nav__user-btn" aria-haspopup="menu" aria-expanded={userMenu} onClick={() => setUserMenu((v) => !v)}>
              <span className="avatar">{iniciais(usuario?.nome)}</span>
              {primeiroNome}
            </button>
            {userMenu && (
              <div className="dropdown" role="menu">
                <Link to="/minhas-reservas" role="menuitem"><Icon name="confirmation_number" />{t('minhas.titulo')}</Link>
                <Link to="/perfil" role="menuitem"><Icon name="person" />{t('perfil.dados')}</Link>
                <Link to="/perfil/favoritas" role="menuitem"><Icon name="favorite" />{t('perfil.favoritas')}</Link>
                {admin && <Link to="/admin" role="menuitem"><Icon name="dashboard" />{t('perfil.menu.admin')}</Link>}
                <button role="menuitem" className="dropdown__sair" onClick={async () => { await sair(); nav('/'); }}>
                  <Icon name="logout" />{t('comum.sair')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/entrar" className="nav__entrar">{t('comum.entrar')}</Link>
        )}
        <Link to="/cavernas" className="nav__reservar">{t('comum.reservar')}</Link>

        <div className="nav__icons">
          <Link to={logado ? '/perfil/favoritas' : '/entrar'} aria-label={t('comum.favoritas')}><Icon name="favorite" /></Link>
          <button className="nav__menu" aria-label={t('nav.abrirMenu')} aria-expanded={menuAberto} onClick={() => setMenuAberto(true)}>
            <Icon name="menu" />
          </button>
        </div>
      </div>
      {menuAberto && <MobileMenu onClose={() => setMenuAberto(false)} links={links} />}
    </header>
  );
}

function MobileMenu({ onClose, links }: { onClose: () => void; links: { to: string; label: string }[] }) {
  const { t, lang } = useLang();
  const { logado, admin, usuario, sair } = useAuth();
  const mudarIdioma = useTrocarIdioma();
  const nav = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('button, a')?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', esc); };
  }, [onClose]);

  return createPortal(
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer tx-caverna" ref={ref} role="dialog" aria-modal="true" aria-label={t('comum.menu')}>
        <div className="drawer__head">
          <span className="logo">HUGA BUGA</span>
          <button onClick={onClose} aria-label={t('comum.fechar')}><Icon name="close" size={28} /></button>
        </div>
        {logado && (
          <div className="row" style={{ gap: 12, padding: '4px 10px 12px' }}>
            <span className="avatar">{iniciais(usuario?.nome)}</span>
            <b>{usuario?.nome}</b>
          </div>
        )}
        <NavLink to="/" end><Icon name="home" />{t('comum.inicio')}</NavLink>
        {links.map((l, i) => (
          <NavLink key={l.to} to={l.to}><Icon name={['cabin', 'hiking', 'restaurant', 'groups'][i]} />{l.label}</NavLink>
        ))}
        <div className="drawer__sep" />
        {logado ? (
          <>
            <NavLink to="/minhas-reservas"><Icon name="confirmation_number" />{t('minhas.titulo')}</NavLink>
            <NavLink to="/perfil" end><Icon name="person" />{t('perfil.dados')}</NavLink>
            {admin && <NavLink to="/admin"><Icon name="dashboard" />{t('perfil.menu.admin')}</NavLink>}
          </>
        ) : (
          <>
            <NavLink to="/entrar"><Icon name="login" />{t('comum.entrar')}</NavLink>
            <NavLink to="/buscar-reserva"><Icon name="search" />{t('rodape.buscarReserva')}</NavLink>
          </>
        )}
        <div className="drawer__sep" />
        <div className="caption" style={{ color: 'var(--osso-3)', padding: '0 10px' }}>{t('comum.idioma')}</div>
        <div className="drawer__langs">
          {IDIOMAS.map((l) => (
            <button key={l} aria-pressed={lang === l} onClick={() => mudarIdioma(l)} lang={l}>{t(`comum.idiomas.${l}`)}</button>
          ))}
        </div>
        {logado && (
          <>
            <div className="drawer__sep" />
            <button className="drawer__item" style={{ color: 'var(--barro-toast)' }} onClick={async () => { await sair(); onClose(); nav('/'); }}>
              <Icon name="logout" style={{ color: 'var(--barro-toast)' }} />{t('comum.sair')}
            </button>
          </>
        )}
      </div>
    </>,
    document.body,
  );
}
