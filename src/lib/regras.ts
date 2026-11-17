/**
 * Regras de negócio espelhadas do backend só para dar retorno imediato na tela.
 * A API sempre recalcula: estes valores nunca são enviados como verdade.
 */

/** Criança até 5 anos não paga; de 6 a 12 não soma adicional; acima de 12 conta como adulto. */
export const IDADE_GRATIS_MAX = 5;
export const IDADE_CRIANCA_MAX = 12;
export const ADULTO_EXTRA_CENTAVOS = 6000;
export const ADULTOS_INCLUSOS = 2;
export const PIX_DESCONTO_PCT = 5;
export const PARCELAS_MAX = 6;
export const PRAZO_CANCELAR_DIAS = 2;
export const CHECKIN_ONLINE_DIAS = 3;
export const SENHA_MINIMA = 8;
export const MAX_FOTOS_RELATO = 5;
export const MAX_FOTO_BYTES = 25 * 1024 * 1024;

export type FaixaIdade = 'gratis' | 'crianca' | 'adulto';

export function faixaIdade(idade: number): FaixaIdade {
  if (idade <= IDADE_GRATIS_MAX) return 'gratis';
  if (idade <= IDADE_CRIANCA_MAX) return 'crianca';
  return 'adulto';
}

/** Adultos que pagam (os adultos + crianças acima de 12). */
export function adultosCobrados(adultos: number, idadesCriancas: number[]): number {
  return adultos + idadesCriancas.filter((i) => faixaIdade(i) === 'adulto').length;
}

/** Pessoas que contam na capacidade da caverna (criança de até 5 anos não conta). */
export function pessoasNaCapacidade(adultos: number, idadesCriancas: number[]): number {
  return adultos + idadesCriancas.filter((i) => faixaIdade(i) !== 'gratis').length;
}

/** Estimativa local de diárias (a cotação oficial vem de /cavernas/{id}/cotacao). */
export function estimarDiarias(precoNoiteCentavos: number, nNoites: number, adultos: number, idadesCriancas: number[]): number {
  const extras = Math.max(0, adultosCobrados(adultos, idadesCriancas) - ADULTOS_INCLUSOS);
  return (precoNoiteCentavos + extras * ADULTO_EXTRA_CENTAVOS) * nNoites;
}

/** Valor com o desconto do Pix (aplicado por último, como no backend). */
export function valorComPix(totalCentavos: number): number {
  return totalCentavos - Math.round((totalCentavos * PIX_DESCONTO_PCT) / 100);
}

/** Parcela arredondada igual ao backend: (161100 + 1) / 3 = 53700. */
export function valorParcela(totalCentavos: number, parcelas: number): number {
  return Math.floor((totalCentavos + Math.floor(parcelas / 2)) / parcelas);
}

// ---------------------------------------------------------------------------
// Cartão (simulado)
// ---------------------------------------------------------------------------
export function soDigitos(s: string): string {
  return s.replace(/\D/g, '');
}

export function luhn(numero: string): boolean {
  const n = soDigitos(numero);
  if (n.length < 12) return false;
  let soma = 0;
  let dobrar = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = n.charCodeAt(i) - 48;
    if (dobrar) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    soma += d;
    dobrar = !dobrar;
  }
  return soma % 10 === 0;
}

export type Bandeira = 'VISA' | 'MASTERCARD' | 'AMEX' | 'OUTRA';
export function bandeira(numero: string): Bandeira {
  const n = soDigitos(numero);
  if (n.startsWith('4')) return 'VISA';
  if (n.startsWith('34') || n.startsWith('37')) return 'AMEX';
  if (n.startsWith('5') || n.startsWith('2')) return 'MASTERCARD';
  return 'OUTRA';
}

/** "4821 1111 2222 7730" */
export function formatarCartao(numero: string): string {
  return soDigitos(numero).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** "4821 •••• •••• 7730" (como aparece no cartão de granito) */
export function cartaoMascarado(numero: string): string {
  const n = soDigitos(numero);
  if (n.length < 8) return formatarCartao(n).padEnd(19, '•');
  return `${n.slice(0, 4)} •••• •••• ${n.slice(-4)}`;
}

/** "0829" → "08/29" */
export function formatarValidade(v: string): string {
  const d = soDigitos(v).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export function validadeOk(v: string, hoje = new Date()): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(v);
  if (!m) return false;
  const mes = Number(m[1]);
  const ano = 2000 + Number(m[2]);
  if (mes < 1 || mes > 12) return false;
  const fim = new Date(ano, mes, 0, 23, 59, 59);
  return fim >= hoje;
}

// ---------------------------------------------------------------------------
// Senha: pedra lascada → pedra polida → diamante
// ---------------------------------------------------------------------------
export type ForcaSenha = 0 | 1 | 2 | 3;
export function forcaSenha(senha: string): ForcaSenha {
  if (!senha) return 0;
  if (senha.length < SENHA_MINIMA) return 1;
  const tipos = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(senha)).length;
  if (tipos >= 3 && senha.length >= 10) return 3;
  if (tipos >= 3 || (tipos >= 2 && senha.length >= 12)) return 3;
  return 2;
}

// ---------------------------------------------------------------------------
// Documentos e contato
// ---------------------------------------------------------------------------
export function emailOk(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function cpfOk(cpf: string): boolean {
  const c = soDigitos(cpf);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (base: string, peso: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (peso - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(c.slice(0, 9), 10) === Number(c[9]) && dv(c.slice(0, 10), 11) === Number(c[10]);
}

export function formatarCpf(cpf: string): string {
  const c = soDigitos(cpf).slice(0, 11);
  return c
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

/** Celular BR: (54) 9 0000-0000 */
export function formatarCelular(cel: string): string {
  const c = soDigitos(cel).slice(0, 11);
  if (c.length <= 2) return c.length ? `(${c}` : '';
  if (c.length <= 3) return `(${c.slice(0, 2)}) ${c.slice(2)}`;
  if (c.length <= 7) return `(${c.slice(0, 2)}) ${c.slice(2, 3)} ${c.slice(3)}`;
  return `(${c.slice(0, 2)}) ${c.slice(2, 3)} ${c.slice(3, 7)}-${c.slice(7)}`;
}

/** Status da reserva → selo visual. */
export function seloStatus(status: string): 'ok' | 'wait' | 'err' | 'info' | 'neutro' {
  switch (status) {
    case 'CONFIRMADA':
      return 'ok';
    case 'PENDENTE':
    case 'AGUARDANDO_PAGAMENTO':
      return 'wait';
    case 'CANCELADA':
    case 'EXPIRADA':
      return 'err';
    case 'CONCLUIDA':
      return 'info';
    default:
      return 'neutro';
  }
}
