import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './basics';

function useLockScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [active]);
}

function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active: boolean, onEsc?: () => void) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;
    const prevFocus = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(el.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'));
    (focusables()[0] ?? el).focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEsc) { e.stopPropagation(); onEsc(); }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    el.addEventListener('keydown', onKey);
    return () => { el.removeEventListener('keydown', onKey); prevFocus?.focus?.({ preventScroll: true }); };
  }, [active, ref, onEsc]);
}

/** Modal "tábua" (borda grossa + sombra dura de carvão). */
export function Modal({ open, onClose, children, wide, label, dismissable = true }: {
  open: boolean; onClose: () => void; children: ReactNode; wide?: boolean; label: string; dismissable?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLockScroll(open);
  useFocusTrap(ref, open, dismissable ? onClose : undefined);
  if (!open) return null;
  return createPortal(
    <div className="overlay" onMouseDown={(e) => { if (dismissable && e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={`modal ${wide ? 'modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} style={{ position: 'relative' }}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Bottom sheet "de couro" no mobile; vira modal no desktop. */
export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLockScroll(open);
  useFocusTrap(ref, open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="overlay sheet-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="sheet" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        <div className="sheet__grip" />
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ModalIcon({ icon, kind }: { icon: string; kind: 'fogo' | 'erro' | 'ok' | 'neutro' }) {
  return (
    <div className={`modal__icon modal__icon--${kind}`}>
      <Icon name={icon} />
    </div>
  );
}

/* =========================================================================
   Toasts: aparecem no topo (desktop) ou acima da tab bar (mobile) e somem em 4 s
   ========================================================================= */
export type ToastKind = 'ok' | 'fogo' | 'ambar' | 'erro' | 'info';
export interface ToastInput { kind?: ToastKind; title: string; text?: string; action?: { label: string; onClick: () => void }; duration?: number }
interface ToastItem extends ToastInput { id: number }

const ToastCtx = createContext<(t: ToastInput) => void>(() => {});

const ICONS: Record<ToastKind, string> = { ok: 'check_circle', fogo: 'favorite', ambar: 'warning', erro: 'error', info: 'info' };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const remove = useCallback((id: number) => setItems((l) => l.filter((x) => x.id !== id)), []);
  const push = useCallback((t: ToastInput) => {
    const id = ++seq.current;
    setItems((l) => [...l.slice(-3), { ...t, id }]);
    setTimeout(() => remove(id), t.duration ?? 4000);
  }, [remove]);
  const value = useMemo(() => push, [push]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      {createPortal(
        <div className="toasts" aria-live="polite" aria-atomic="false">
          {items.map((t) => {
            const kind = t.kind ?? 'ok';
            return (
              <div key={t.id} className={`toast toast--${kind}`} role="status">
                <Icon name={ICONS[kind]} />
                <div className="toast__body">
                  <b>{t.title}</b> {t.text && <span>{t.text}</span>}
                </div>
                {t.action ? (
                  <button className="toast__action" onClick={() => { t.action!.onClick(); remove(t.id); }}>{t.action.label}</button>
                ) : (
                  <button className="toast__action" onClick={() => remove(t.id)} aria-label="Fechar">
                    <Icon name="close" size={18} />
                  </button>
                )}
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
