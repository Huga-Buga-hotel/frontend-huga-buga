import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../../api/endpoints';
import { isApiError, reservaEmails } from '../../api/client';
import { useAuth } from '../../context/auth';
import { useBusca } from '../../context/busca';
import { useLang } from '../../hooks';
import { Banner, Button, Icon } from '../../components/ui/basics';
import { Field, SelectField, TextField, TextareaField } from '../../components/ui/form';
import { ReservaShell, Resumo } from '../../components/reserva/ReservaShell';
import { brl } from '../../lib/format';
import { ADULTO_EXTRA_CENTAVOS, cpfOk, emailOk, faixaIdade, formatarCelular, formatarCpf, soDigitos } from '../../lib/regras';
import type { HospedeDto, ReservaRes } from '../../api/types';

export const PAISES = ['BR', 'AR', 'UY', 'PY', 'CL', 'BO', 'PE', 'CO', 'MX', 'US', 'CA', 'PT', 'ES', 'FR', 'IT', 'DE', 'GB', 'NL', 'CH', 'JP'];

export function usePaises() {
  const { lang } = useLang();
  return useMemo(() => {
    let dn: Intl.DisplayNames | null = null;
    try { dn = new Intl.DisplayNames([lang], { type: 'region' }); } catch { /* sem suporte */ }
    return PAISES.map((c) => ({ code: c, nome: dn?.of(c) ?? c }));
  }, [lang]);
}

interface Membro { nome: string; tipo: 'ADULTO' | 'CRIANCA'; idade: number }

export default function HospedesPage() {
  const { codigo = '' } = useParams();
  return (
    <ReservaShell codigo={codigo} passo={1} aside={(r) => <Resumo r={r} completo />}
      barra={(r) => <BarraM r={r} />}
    >
      {(r) => <Form r={r} />}
    </ReservaShell>
  );
}

function BarraM({ r }: { r: ReservaRes }) {
  const { t, lang } = useLang();
  return (
    <>
      <div><div className="t-price" style={{ fontSize: 22 }}>{brl(r.total, lang)}</div><a href="#resumo" style={{ fontSize: 12, fontWeight: 700, textDecoration: 'underline', color: 'var(--carvao)' }}>{t('reserva.verResumo')}</a></div>
      <Button variant="carvao" type="submit" form="form-hospedes">{t('comum.continuar')}</Button>
    </>
  );
}

function Form({ r }: { r: ReservaRes }) {
  const { t, lang } = useLang();
  const { logado } = useAuth();
  const { busca } = useBusca();
  const nav = useNavigate();
  const paises = usePaises();
  const perfil = useQuery({ queryKey: ['me', 'perfil'], queryFn: api.me.perfil, enabled: logado });
  const salvos = useQuery({ queryKey: ['me', 'membros'], queryFn: api.me.membros, enabled: logado });

  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [email, setEmail] = useState(r.responsavelEmail ?? '');
  const [celular, setCelular] = useState('');
  const [pais, setPais] = useState('BR');
  const [tipoDoc, setTipoDoc] = useState<'CPF' | 'PASSAPORTE'>('CPF');
  const [doc, setDoc] = useState('');
  const [pedido, setPedido] = useState(r.pedidoEspecial ?? '');
  const [tocou, setTocou] = useState(false);
  const [membros, setMembros] = useState<Membro[]>(() => {
    if (r.hospedes.length > 1) return r.hospedes.slice(1).map((h) => ({ nome: h.nome, tipo: h.tipo, idade: h.idade ?? 6 }));
    const idades = busca.idadesCriancas.length === r.criancas ? busca.idadesCriancas : Array(r.criancas).fill(6);
    return [
      ...Array.from({ length: Math.max(0, r.adultos - 1) }, () => ({ nome: '', tipo: 'ADULTO' as const, idade: 30 })),
      ...idades.map((i: number) => ({ nome: '', tipo: 'CRIANCA' as const, idade: i })),
    ];
  });

  // preenche com a conta
  useEffect(() => {
    const p = perfil.data;
    if (!p) return;
    setNome((v) => v || p.nome);
    setSobrenome((v) => v || p.sobrenome);
    setEmail((v) => v || p.email);
    if (p.celular) setCelular((v) => v || formatarCelular(p.celular!.replace(/^\+?55/, '')));
    if (p.pais) setPais(p.pais);
  }, [perfil.data]);
  // responsável já salvo na reserva
  useEffect(() => {
    if (r.responsavelNome) {
      const [n, ...s] = r.responsavelNome.split(' ');
      setNome(n); setSobrenome(s.join(' '));
      if (r.celular) setCelular(r.celular);
    }
  }, [r.responsavelNome, r.celular]);

  const erros = {
    nome: !nome.trim() ? t('reserva.erroNome') : undefined,
    sobrenome: !sobrenome.trim() ? t('comum.obrigatorio') : undefined,
    email: !emailOk(email) ? t('reserva.erroEmail') : undefined,
    celular: soDigitos(celular).length < 10 ? t('reserva.erroCelular') : undefined,
    doc: !doc.trim() ? t('reserva.erroDoc') : tipoDoc === 'CPF' && pais === 'BR' && !cpfOk(doc) ? t('reserva.erroCpf') : undefined,
    membros: membros.map((m) => (!m.nome.trim() ? t('comum.obrigatorio') : undefined)),
  };
  const nErros = [erros.nome, erros.sobrenome, erros.email, erros.celular, erros.doc, ...erros.membros].filter(Boolean).length;

  const salvar = useMutation({
    mutationFn: () => {
      const hospedes: HospedeDto[] = [
        { nome: `${nome.trim()} ${sobrenome.trim()}`, tipo: 'ADULTO' },
        ...membros.map((m) => ({ nome: m.nome.trim(), tipo: m.tipo, idade: m.tipo === 'CRIANCA' ? m.idade : null })),
      ];
      return api.reservas.hospedes(r.codigo, {
        responsavelNome: `${nome.trim()} ${sobrenome.trim()}`,
        responsavelEmail: email.trim(),
        celular: `+${pais === 'BR' ? '55 ' : ''}${celular}`.replace('+55 +55', '+55'),
        pais,
        tipoDocumento: tipoDoc,
        documento: tipoDoc === 'CPF' ? soDigitos(doc) : doc.trim(),
        pedidoEspecial: pedido.trim() || undefined,
        hospedes,
      });
    },
    onSuccess: (nova) => {
      if (!logado) reservaEmails.set(nova.codigo, email.trim());
      nav(`/reserva/${r.codigo}/extras`);
    },
  });

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setTocou(true);
    if (nErros === 0) salvar.mutate();
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const usarSalvos = () => {
    const lista = salvos.data ?? [];
    setMembros((atual) => atual.map((m, i) => {
      const cand = lista.filter((s) => s.tipo === m.tipo)[atual.slice(0, i).filter((x) => x.tipo === m.tipo).length];
      return cand ? { ...m, nome: cand.nome, idade: cand.idade ?? m.idade } : m;
    }));
  };

  const err = (msg?: string) => (tocou ? msg : undefined);
  const apiErr = salvar.error && isApiError(salvar.error) ? salvar.error : null;

  return (
    <form id="form-hospedes" className="stack" style={{ gap: 28 }} onSubmit={enviar} noValidate>
      <div>
        <div className="only-mobile" style={{ fontSize: 12, fontWeight: 800, color: 'var(--fogo)' }}>
          <span className="row" style={{ gap: 4 }}><Icon name="footprint" fill size={16} />{t('reserva.pegada', { n: 1 })}</span>
        </div>
        <h1 className="t-h1" style={{ fontSize: 48 }}>{t('reserva.titulo1')}</h1>
      </div>
      {tocou && nErros > 0 && <Banner kind="erro">{t('reserva.erroCampos', { count: nErros })}</Banner>}
      {apiErr && <Banner kind="erro" title={apiErr.titulo}>{apiErr.message}</Banner>}

      <section className="card panel">
        <div className="row between wrap" style={{ alignItems: 'baseline', gap: 8 }}>
          <span className="t-h5">{t('reserva.chefe')}</span>
          {!logado && <span style={{ fontSize: 13, color: 'var(--pedra)' }}>{t('reserva.temConta')} <Link to="/entrar" state={{ de: `/reserva/${r.codigo}/quem-vem` }}>{t('comum.entrar')}</Link></span>}
        </div>
        <div className="grid-2" style={{ gap: 16 }}>
          <TextField label={t('reserva.nome')} value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="given-name" error={err(erros.nome)} />
          <TextField label={t('reserva.sobrenome')} value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} autoComplete="family-name" error={err(erros.sobrenome)} />
          <TextField label={t('reserva.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" help={t('reserva.emailAjuda')} error={err(erros.email)} valid={tocou && !erros.email} />
          <TextField label={t('reserva.celular')} type="tel" value={celular} onChange={(e) => setCelular(pais === 'BR' ? formatarCelular(e.target.value) : e.target.value)} autoComplete="tel-national" prefix={pais === 'BR' ? 'BR +55' : pais} placeholder={pais === 'BR' ? '(54) 9 0000-0000' : ''} error={err(erros.celular)} />
          <SelectField label={t('reserva.pais')} value={pais} onChange={(e) => { setPais(e.target.value); if (e.target.value !== 'BR') setTipoDoc('PASSAPORTE'); }}>
            {paises.map((p) => <option key={p.code} value={p.code}>{p.nome}</option>)}
          </SelectField>
          <Field label={t('reserva.documento')} error={err(erros.doc)}>
            <div className="doc-seg">
              <button type="button" aria-pressed={tipoDoc === 'CPF'} onClick={() => setTipoDoc('CPF')}>{t('reserva.cpf')}</button>
              <button type="button" aria-pressed={tipoDoc === 'PASSAPORTE'} onClick={() => setTipoDoc('PASSAPORTE')}>{t('reserva.passaporte')}</button>
              <input aria-label={t('reserva.documento')} value={doc} onChange={(e) => setDoc(tipoDoc === 'CPF' ? formatarCpf(e.target.value) : e.target.value.toUpperCase())} placeholder={tipoDoc === 'CPF' ? '000.000.000-00' : 'AB123456'} inputMode={tipoDoc === 'CPF' ? 'numeric' : 'text'} />
            </div>
          </Field>
        </div>
      </section>

      <section className="card panel" style={{ gap: 14 }}>
        <div className="row between wrap" style={{ gap: 8 }}>
          <span className="t-h5">{t('reserva.membros')}</span>
          {logado && (salvos.data?.length ?? 0) > 0 && membros.length > 0 && (
            <button type="button" className="link-btn" style={{ fontSize: 14 }} onClick={usarSalvos}><Icon name="groups" size={18} />{t('reserva.usarMembros')}</button>
          )}
        </div>
        {membros.map((m, i) => {
          const f = m.tipo === 'CRIANCA' ? faixaIdade(m.idade) : null;
          return (
            <div key={i} className="tribo-linha">
              <span className="avatar-member"><Icon name={m.tipo === 'ADULTO' ? 'person' : 'child_care'} /></span>
              <TextField aria-label={t('reserva.nomeMembro', { n: i + 2 })} placeholder={t('reserva.nomeMembro', { n: i + 2 })} value={m.nome}
                onChange={(e) => setMembros((l) => l.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))}
                error={err(erros.membros[i])}
                warn={f === 'adulto' ? t('reserva.avisoIdade', { valor: brl(ADULTO_EXTRA_CENTAVOS, lang) }) : undefined} />
              {m.tipo === 'ADULTO' ? (
                <div className="input" style={{ color: 'var(--carvao)' }}>{t('reserva.adulto')}</div>
              ) : (
                <select className="select" aria-label={t('busca.idadeCrianca', { n: i + 1 })} value={m.idade} onChange={(e) => setMembros((l) => l.map((x, j) => (j === i ? { ...x, idade: Number(e.target.value) } : x)))} style={f === 'adulto' ? { borderColor: 'var(--ambar)', background: 'var(--ambar-campo)' } : undefined}>
                  {Array.from({ length: 18 }, (_, n) => <option key={n} value={n}>{n === 0 ? t('busca.menos1') : t('reserva.idadeAnos', { n })}</option>)}
                </select>
              )}
            </div>
          );
        })}
        <TextareaField label={t('reserva.pedido')} placeholder={t('reserva.pedidoPlaceholder')} value={pedido} onChange={(e) => setPedido(e.target.value)} maxLength={1000} fieldClassName="mt-6" />
      </section>

      <div className="checkout-acoes hide-mobile">
        <button type="button" className="link-btn link-btn--tinta" style={{ textDecoration: 'none' }} onClick={() => nav(-1)}><Icon name="arrow_back" />{t('reserva.voltarCaverna')}</button>
        <Button variant="carvao" size="lg" type="submit" iconRight="arrow_forward" loading={salvar.isPending}>{t('reserva.continuarExtras')}</Button>
      </div>
      <div id="resumo" className="only-mobile"><Resumo r={r} /></div>
    </form>
  );
}
