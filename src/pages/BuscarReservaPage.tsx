import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { reservaEmails } from '../api/client';
import { useLang } from '../hooks';
import { Banner, Button } from '../components/ui/basics';
import { TextField } from '../components/ui/form';
import { emailOk } from '../lib/regras';

/** Consulta de reserva feita sem conta (código + e-mail do responsável). */
export default function BuscarReservaPage() {
  const { t } = useLang();
  const nav = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [email, setEmail] = useState('');
  const m = useMutation({
    mutationFn: () => api.reservas.buscarSemConta(codigo.trim().toUpperCase(), email.trim()),
    onSuccess: (r) => { reservaEmails.set(r.codigo, email.trim()); nav(`/reserva/${r.codigo}`); },
  });
  const ok = /^HB-\w{4,}$/i.test(codigo.trim()) && emailOk(email);
  return (
    <div className="container conta-mini">
      <div className="card card--l panel">
        <h1 className="t-h3">{t('buscarReserva.titulo')}</h1>
        <p style={{ color: 'var(--texto-corpo)' }}>{t('buscarReserva.texto')}</p>
        {m.isError && <Banner kind="erro">{t('buscarReserva.naoEncontrada')}</Banner>}
        <form className="stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); if (ok) m.mutate(); }}>
          <TextField label={t('buscarReserva.codigo')} placeholder="HB-4F7K" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} autoCapitalize="characters" />
          <TextField label={t('buscarReserva.email')} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button variant="carvao" size="lg" block type="submit" loading={m.isPending} disabled={!ok}>{t('buscarReserva.buscar')}</Button>
        </form>
      </div>
    </div>
  );
}
