import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, forwardRef, useId, useState } from 'react';
import { Icon } from './basics';

type FieldState = 'error' | 'warn' | 'valid' | undefined;

export function Field({ label, labelAside, help, error, warn, valid, children, className = '', htmlFor }: {
  label?: ReactNode; labelAside?: ReactNode; help?: ReactNode; error?: ReactNode; warn?: ReactNode; valid?: boolean;
  children: ReactNode; className?: string; htmlFor?: string;
}) {
  const state: FieldState = error ? 'error' : warn ? 'warn' : valid ? 'valid' : undefined;
  const cls = state === 'error' ? 'is-error' : state === 'warn' ? 'is-warn' : state === 'valid' ? 'is-valid' : '';
  return (
    <div className={`field ${cls} ${className}`}>
      {label && (
        <label className="field__label" htmlFor={htmlFor}>
          <span>{label}</span>
          {labelAside}
        </label>
      )}
      {children}
      {error ? (
        <span className="field__error" role="alert">{error}</span>
      ) : warn ? (
        <span className="field__warn">{warn}</span>
      ) : help ? (
        <span className="field__help">{help}</span>
      ) : null}
    </div>
  );
}

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: ReactNode; labelAside?: ReactNode; help?: ReactNode; error?: ReactNode; warn?: ReactNode; valid?: boolean;
  prefix?: ReactNode; fieldClassName?: string;
}

/** Campo de texto com rótulo, ajuda, erro, aviso e estado válido (ícone ✓). */
export const TextField = forwardRef<HTMLInputElement, InputProps>(function TextField(
  { label, labelAside, help, error, warn, valid, prefix, fieldClassName, id, type, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [show, setShow] = useState(false);
  const isPass = type === 'password';
  const stateIcon = error ? 'error' : valid ? 'check_circle' : null;
  const needsWrap = prefix || isPass || stateIcon;
  const describedBy = error || warn || help ? `${inputId}-desc` : undefined;
  const input = (
    <input
      ref={ref}
      id={inputId}
      className="input"
      type={isPass && show ? 'text' : type}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      {...rest}
    />
  );
  return (
    <Field label={label} labelAside={labelAside} help={help} error={error} warn={warn} valid={valid} className={fieldClassName} htmlFor={inputId}>
      {needsWrap ? (
        <div className="input-wrap">
          {prefix && <span className="input-wrap__prefix">{prefix}</span>}
          {input}
          {isPass && (
            <button type="button" className="input-wrap__btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
              <Icon name={show ? 'visibility_off' : 'visibility'} />
            </button>
          )}
          {!isPass && stateIcon && <Icon name={stateIcon} className={`field-state-icon ${error ? 'field-state-icon--err' : 'field-state-icon--ok'}`} />}
        </div>
      ) : (
        input
      )}
    </Field>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode; help?: ReactNode; error?: ReactNode; warn?: ReactNode; fieldClassName?: string;
}
export const SelectField = forwardRef<HTMLSelectElement, SelectProps>(function SelectField(
  { label, help, error, warn, fieldClassName, id, children, ...rest },
  ref,
) {
  const autoId = useId();
  const selId = id ?? autoId;
  return (
    <Field label={label} help={help} error={error} warn={warn} className={fieldClassName} htmlFor={selId}>
      <select ref={ref} id={selId} className="select" aria-invalid={error ? true : undefined} {...rest}>
        {children}
      </select>
    </Field>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode; help?: ReactNode; error?: ReactNode; fieldClassName?: string;
}
export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaProps>(function TextareaField(
  { label, help, error, fieldClassName, id, ...rest },
  ref,
) {
  const autoId = useId();
  const taId = id ?? autoId;
  return (
    <Field label={label} help={help} error={error} className={fieldClassName} htmlFor={taId}>
      <textarea ref={ref} id={taId} className="textarea" {...rest} />
    </Field>
  );
});

export function Checkbox({ checked, onChange, children, disabled, count, className = '', name }: {
  checked: boolean; onChange: (v: boolean) => void; children: ReactNode; disabled?: boolean; count?: ReactNode; className?: string; name?: string;
}) {
  return (
    <label className={`check ${disabled ? 'check--disabled' : ''} ${className}`} style={count !== undefined ? { width: '100%', alignItems: 'center' } : undefined}>
      <input type="checkbox" name={name} checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="check__box"><Icon name="check" /></span>
      <span className="check__text">{children}</span>
      {count !== undefined && <span className="check__count">{count}</span>}
    </label>
  );
}

export function Radio({ checked, onChange, children, name, disabled }: {
  checked: boolean; onChange: () => void; children: ReactNode; name: string; disabled?: boolean;
}) {
  return (
    <label className={`check ${disabled ? 'check--disabled' : ''}`}>
      <input type="radio" name={name} checked={checked} disabled={disabled} onChange={onChange} />
      <span className="radio__dot" />
      <span className="check__text">{children}</span>
    </label>
  );
}

export function Toggle({ checked, onChange, children, disabled, icon }: {
  checked: boolean; onChange: (v: boolean) => void; children: ReactNode; disabled?: boolean; icon?: string;
}) {
  return (
    <label className="toggle" style={{ width: '100%' }}>
      <span className="row" style={{ gap: 6 }}>
        {icon && <Icon name={icon} style={{ color: 'var(--link)' }} />}
        {children}
      </span>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" />
    </label>
  );
}

export function Counter({ value, onChange, min = 0, max = 99, small, box, label, semValor }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; small?: boolean; box?: boolean; label: string; semValor?: boolean;
}) {
  return (
    <div className={`counter ${small ? 'counter--s' : ''} ${box ? 'counter--box' : ''}`} role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`− ${label}`}>
        <Icon name="remove" />
      </button>
      {!semValor && <span className="counter__value" aria-live="polite">{value}</span>}
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`+ ${label}`}>
        <Icon name="add" />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, className = '', ariaLabel }: {
  value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; className?: string; ariaLabel?: string;
}) {
  return (
    <div className={`segmented ${className}`} role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ value, options, onChange, small, className = '', ariaLabel }: {
  value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; small?: boolean; className?: string; ariaLabel?: string;
}) {
  return (
    <div className={`tabs ${small ? 'tabs--s' : ''} ${className}`} role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={o.value === value} className={o.value === value ? 'is-on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Faixa de preço com dois cursores (valores em reais). */
export function PriceRange({ min, max, value, onChange, format, step = 10 }: {
  min: number; max: number; value: [number, number]; onChange: (v: [number, number]) => void; format: (v: number) => string; step?: number;
}) {
  const span = Math.max(1, max - min);
  const left = ((value[0] - min) / span) * 100;
  const right = 100 - ((value[1] - min) / span) * 100;
  return (
    <div>
      <div className="range">
        <div className="range__track" />
        <div className="range__fill" style={{ left: `${left}%`, right: `${right}%` }} />
        <input
          type="range" min={min} max={max} step={step} value={value[0]} aria-label="Preço mínimo"
          onChange={(e) => onChange([Math.min(Number(e.target.value), value[1] - step), value[1]])}
        />
        <input
          type="range" min={min} max={max} step={step} value={value[1]} aria-label="Preço máximo"
          onChange={(e) => onChange([value[0], Math.max(Number(e.target.value), value[0] + step)])}
        />
      </div>
      <div className="range__labels">
        <span>{format(value[0])}</span>
        <span>{format(value[1])}</span>
      </div>
    </div>
  );
}
