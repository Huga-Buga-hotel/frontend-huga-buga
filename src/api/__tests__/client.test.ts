import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_URL, ApiError, buildUrl, request, reservaEmails, tokens } from '../client';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const sessao = { accessToken: 'velho', refreshToken: 'r1', usuarioId: 'u1', nome: 'Marina', role: 'VISITANTE' as const, expiraEmSegundos: 900 };

describe('buildUrl', () => {
  it('ignora vazios e repete arrays', () => {
    const url = new URL(buildUrl('/cavernas', { adultos: 2, idadesCriancas: [4, 9], categoria: [], q: '', x: null }));
    expect(url.pathname.endsWith('/cavernas')).toBe(true);
    expect(url.searchParams.get('adultos')).toBe('2');
    expect(url.searchParams.getAll('idadesCriancas')).toEqual(['4', '9']);
    expect(url.searchParams.has('categoria')).toBe(false);
    expect(url.searchParams.has('q')).toBe(false);
  });
});

describe('request', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('converte o ErroResposta em ApiError com campos', async () => {
    fetchMock.mockResolvedValueOnce(json(400, {
      status: 400, codigo: 'VALIDACAO', titulo: 'Ugh!', ref: 'abc',
      campos: [{ campo: 'responsavel.email', erro: 'falta a @' }],
    }));
    const e = await request('/reservas', { method: 'POST', body: {} }).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect((e as ApiError).codigo).toBe('VALIDACAO');
    expect((e as ApiError).campo('email')).toBe('falta a @');
    expect((e as ApiError).ref).toBe('abc');
  });

  it('falha de rede vira ApiError REDE', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const e = await request('/home').catch((x: unknown) => x);
    expect((e as ApiError).rede).toBe(true);
  });

  it('envia o e-mail do responsável e o token', async () => {
    tokens.salvar(sessao, false);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await request('/reservas/HB-1', { responsavel: 'ana@x.com' });
    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer velho');
    expect(headers['X-Responsavel-Email']).toBe('ana@x.com');
  });

  it('renova o token no 401 e repete a chamada uma vez', async () => {
    tokens.salvar(sessao, true);
    fetchMock
      .mockResolvedValueOnce(json(401, { status: 401, codigo: 'TOKEN_EXPIRADO' }))
      .mockResolvedValueOnce(json(200, { ...sessao, accessToken: 'novo', refreshToken: 'r2' }))
      .mockResolvedValueOnce(json(200, { ok: true }));
    await expect(request<{ ok: boolean }>('/me')).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls[1][0]).toBe(API_URL + '/auth/refresh');
    expect((fetchMock.mock.calls[2][1]?.headers as Record<string, string>).Authorization).toBe('Bearer novo');
    expect(localStorage.getItem('hb.refreshToken')).toBe('r2');
  });

  it('limpa a sessão e avisa quando o refresh falha', async () => {
    tokens.salvar(sessao, false);
    const expirou = vi.fn();
    const off = tokens.onExpired(expirou);
    fetchMock
      .mockResolvedValueOnce(json(401, { status: 401, codigo: 'TOKEN_EXPIRADO' }))
      .mockResolvedValueOnce(json(401, { status: 401, codigo: 'REFRESH_INVALIDO' }));
    await expect(request('/me')).rejects.toBeInstanceOf(ApiError);
    expect(expirou).toHaveBeenCalledOnce();
    expect(tokens.access).toBeNull();
    off();
  });
});

describe('reservaEmails', () => {
  it('guarda o e-mail por código, sem diferenciar maiúsculas', () => {
    reservaEmails.set('hb-7k2m', ' Ana@X.com ');
    expect(reservaEmails.get('HB-7K2M')).toBe('ana@x.com');
  });
});
