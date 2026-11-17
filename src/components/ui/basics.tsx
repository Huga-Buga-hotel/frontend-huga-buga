import { type ButtonHTMLAttributes, type ReactNode, forwardRef, type CSSProperties } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

/* ---------- Ícone Material Symbols Rounded ---------- */
export function Icon({ name, fill, size, className = '', style, title }: {
  name: string; fill?: boolean; size?: number; className?: string; style?: CSSProperties; title?: string;
}) {
  return (
    <span
      className={`ms ${fill ? 'ms--fill' : ''} ${className}`}
      style={size ? { fontSize: size, ...style } : style}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
    >
      {name}
    </span>
  );
}

/* ---------- Botões ---------- */
export type BtnVariant = 'fogo' | 'carvao' | 'contorno' | 'claro' | 'perigo' | 'ambar';
export type BtnSize = 'xl' | 'lg' | 'md' | 'sm' | 'xs';

function btnClass(variant: BtnVariant, size?: BtnSize, block?: boolean, loading?: boolean, extra = '') {
  return ['btn', `btn--${variant}`, size && `btn--${size}`, block && 'btn--block', loading && 'btn--loading', extra]
    .filter(Boolean)
    .join(' ');
}

type LoadingKind = 'ring' | 'feet';

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  block?: boolean;
  loading?: boolean;
  loadingText?: ReactNode;
  loadingKind?: LoadingKind;
  icon?: string;
  iconRight?: string;
}

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = 'carvao', size, block, loading, loadingText, loadingKind = 'ring', icon, iconRight, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={btnClass(variant, size, block, loading, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <>
          {loadingKind === 'feet' ? <Feet /> : <Ring />}
          {loadingText ?? children}
        </>
      ) : (
        <>
          {icon && <Icon name={icon} />}
          {children}
          {iconRight && <Icon name={iconRight} />}
        </>
      )}
    </button>
  );
});

interface BtnLinkProps extends LinkProps {
  variant?: BtnVariant;
  size?: BtnSize;
  block?: boolean;
  icon?: string;
  iconRight?: string;
}
export function ButtonLink({ variant = 'carvao', size, block, icon, iconRight, className, children, ...rest }: BtnLinkProps) {
  return (
    <Link className={btnClass(variant, size, block, false, className)} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
      {iconRight && <Icon name={iconRight} />}
    </Link>
  );
}

export function Ring({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <span className={`ring ${className}`} style={style} aria-hidden />;
}

/** Pegadas "andando" (busca). */
export function Feet({ n = 3, large }: { n?: number; large?: boolean }) {
  return (
    <span className={`feet ${large ? 'feet--l' : ''}`} aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="ms">footprint</span>
      ))}
    </span>
  );
}

/* ---------- Placeholder de imagem com máscara "rocha"/"lasca" ---------- */
export const MASKS = {
  heroDesk: 'polygon(8% 6%, 40% 0, 78% 4%, 97% 14%, 100% 55%, 94% 92%, 60% 100%, 22% 97%, 3% 84%, 0 38%)',
  heroMob: 'polygon(4% 5%, 40% 0, 80% 3%, 98% 10%, 100% 60%, 95% 95%, 55% 100%, 15% 97%, 1% 85%, 0 30%)',
  lasca: 'polygon(1% 3%, 22% 0, 55% 2%, 80% 0, 99% 3%, 100% 45%, 98% 97%, 70% 100%, 35% 98%, 3% 100%, 0 60%)',
  vazio: 'polygon(14% 100%, 10% 55%, 18% 22%, 35% 6%, 55% 0, 74% 8%, 88% 26%, 92% 60%, 86% 100%)',
} as const;

const PHOTO_ICON = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);

export function ImageSlot({ caption, mask, radius, circle, dark, src, alt, className = '', style }: {
  caption: string; mask?: keyof typeof MASKS | string; radius?: number | string; circle?: boolean; dark?: boolean;
  src?: string | null; alt?: string; className?: string; style?: CSSProperties;
}) {
  const clip = mask ? (mask in MASKS ? MASKS[mask as keyof typeof MASKS] : mask) : undefined;
  const frameStyle: CSSProperties = {
    clipPath: clip,
    borderRadius: circle ? '50%' : radius,
  };
  return (
    <div className={`img-slot ${dark ? 'img-slot--dark' : ''} ${className}`} style={style} role="img" aria-label={alt ?? caption}>
      <div className="img-slot__frame" style={frameStyle}>
        {src ? (
          <img src={src} alt={alt ?? caption} loading="lazy" />
        ) : (
          <>
            {PHOTO_ICON}
            <span className="img-slot__cap">{caption}</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Selos e tags ---------- */
export function Badge({ kind, icon, children }: { kind: 'ok' | 'wait' | 'err' | 'info' | 'neutro'; icon?: string; children: ReactNode }) {
  return (
    <span className={`badge badge--${kind}`}>
      {icon && <Icon name={icon} />}
      {children}
    </span>
  );
}

/* ---------- Banner inline ---------- */
export function Banner({ kind, icon, title, children, onClose, action, small, className = '' }: {
  kind: 'ambar' | 'fogo' | 'erro' | 'ok' | 'info'; icon?: string; title?: ReactNode; children?: ReactNode;
  onClose?: () => void; action?: ReactNode; small?: boolean; className?: string;
}) {
  const defaultIcon = { ambar: 'warning', fogo: 'local_fire_department', erro: 'error', ok: 'check_circle', info: 'info' }[kind];
  return (
    <div className={`banner banner--${kind} ${small ? 'banner--s' : ''} ${className}`} role={kind === 'erro' ? 'alert' : 'status'}>
      <Icon name={icon ?? defaultIcon} />
      <div className="banner__body">
        {title && <span className="banner__title">{title}</span>} {children && (title ? <div className="banner__text">{children}</div> : children)}
      </div>
      {action}
      {onClose && (
        <button className="banner__close" onClick={onClose} aria-label="Fechar">
          <Icon name="close" />
        </button>
      )}
    </div>
  );
}

/* ---------- Esqueletos ---------- */
export function Sk({ w, h, className = '', style }: { w?: number | string; h: number | string; className?: string; style?: CSSProperties }) {
  return <div className={`sk ${className}`} style={{ width: w, height: h, ...style }} aria-hidden />;
}
