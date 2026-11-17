import type { ErroResposta, TokensRes } from './types';

/** URL base da API (com /api/v1). Configure em .env: VITE_API_URL. */
export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1').replace(/\/$/, '');

/* =========================================================================
   Tokens: access token na memória + storage; refresh token em localStorage
   (com "lembrar de mim") ou sessionStorage (sem).
   ========================================================================= */
const K_ACCESS = 'hb.accessToken';
const K_REFRESH = 'hb.refreshToken';
const K_USER = 'hb.usuario';

export interface SessaoUsuario { usuarioId: string; nome: string; role: TokensRes['role'] }

type Listener = () => void;
const listeners = new Set<Listener>();
const expiredListeners = new Set<Listener>();

function store(lembrar: boolean): Storage {
  return lembrar ? localStorage : sessionStorage;
}
function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key) ?? localStorage.getItem(key);
  } catch {
    return null;
  }
}

export const tokens = {
  get access() { return read(K_ACCESS); },
  get refresh() { return read(K_REFRESH); },
  get usuario(): SessaoUsuario | null {
    const raw = read(K_USER);
    if (!raw) return null;
    try { return JSON.parse(raw) as SessaoUsuario; } catch { return null; }
  },
  get lembrar() {
    try { return localStorage.getItem(K_REFRESH) != null; } catch { return false; }
  },
  salvar(t: TokensRes, lembrar: boolean) {
    this.limpar(false);
    try {
      const s = store(lembrar);
      s.setItem(K_ACCESS, t.accessToken);
      s.setItem(K_REFRESH, t.refreshToken);
      s.setItem(K_USER, JSON.stringify({ usuarioId: t.usuarioId, nome: t.nome, role: t.role } satisfies SessaoUsuario));
    } catch { /* storage indisponível (modo privado): segue só na memória da aba */ }
    listeners.forEach((l) => l());
  },
  limpar(notificar = true) {
    try {
      for (const s of [localStorage, sessionStorage]) {
        s.removeItem(K_ACCESS); s.removeItem(K_REFRESH); s.removeItem(K_USER);
      }
    } catch { /* ignore */ }
    if (notificar) listeners.forEach((l) => l());
  },
  onChange(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; },
  onExpired(l: Listener) { expiredListeners.add(l); return () => { expiredListeners.delete(l); }; },
};

/* =========================================================================
   E-mail do responsável por reserva feita sem conta (header X-Responsavel-Email)
   ========================================================================= */
const K_EMAILS = 'hb.reservas.email';
export const reservaEmails = {
  todos(): Record<string, string> {
    try { return JSON.parse(localStorage.getItem(K_EMAILS) ?? '{}') as Record<string, string>; } catch { return {}; }
  },
  get(codigo: string): string | undefined { return this.todos()[codigo.toUpperCase()]; },
  set(codigo: string, email: string) {
    try {
      const all = this.todos();
      all[codigo.toUpperCase()] = email.trim().toLowerCase();
      localStorage.setItem(K_EMAILS, JSON.stringify(all));
    } catch { /* ignore */ }
  },
};

/* =========================================================================
   Erro padrão da API
   ========================================================================= */
export class ApiError extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly titulo?: string;
  readonly ref?: string;
  readonly campos: { campo: string; erro: string }[];
  readonly dados: Record<string, unknown>;

  constructor(body: ErroResposta) {
    super(body.mensagem ?? body.titulo ?? body.codigo);
    this.name = 'ApiError';
    this.status = body.status;
    this.codigo = body.codigo;
    this.titulo = body.titulo;
    this.ref = body.ref;
    this.campos = body.campos ?? [];
    this.dados = body.dados ?? {};
  }

  /** Mensagem do campo (ex.: "responsavelEmail") devolvida no 400 VALIDACAO. */
  campo(nome: string): string | undefined {
    return this.campos.find((c) => c.campo === nome || c.campo.endsWith('.' + nome))?.erro;
  }

  get rede() { return this.codigo === 'REDE'; }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/* =========================================================================
   Requisição
   ========================================================================= */
type Query = Record<string, string | number | boolean | null | undefined | (string | number)[]>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Query;
  body?: unknown;
  /** E-mail do responsável (reserva sem conta). */
  responsavel?: string;
  /** Não tentar renovar o token nem anexar Authorization. */
  anonimo?: boolean;
  /** Resposta binária (PDF, .ics). */
  blob?: boolean;
  signal?: AbortSignal;
}

export function buildUrl(path: string, query?: Query): string {
  const url = new URL(API_URL + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      if (Array.isArray(v)) {
        if (v.length === 0) continue;
        v.forEach((item) => url.searchParams.append(k, String(item)));
      } else {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url.toString();
}

let refreshing: Promise<boolean> | null = null;

async function renovar(): Promise<boolean> {
  const refresh = tokens.refresh;
  if (!refresh) return false;
  if (!refreshing) {
    const lembrar = tokens.lembrar;
    refreshing = fetch(API_URL + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    })
      .then(async (r) => {
        if (!r.ok) return false;
        tokens.salvar((await r.json()) as TokensRes, lembrar);
        return true;
      })
      .catch(() => false)
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

async function parseErro(res: Response): Promise<ApiError> {
  let body: ErroResposta = { status: res.status, codigo: 'ERRO' };
  try {
    const json = (await res.json()) as Partial<ErroResposta>;
    body = { ...body, ...json, status: json.status ?? res.status, codigo: json.codigo ?? 'ERRO' };
  } catch { /* corpo vazio */ }
  return new ApiError(body);
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, responsavel, anonimo, blob, signal } = opts;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

  const doFetch = () => {
    const headers: Record<string, string> = { Accept: blob ? '*/*' : 'application/json' };
    if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
    const access = anonimo ? null : tokens.access;
    if (access) headers.Authorization = `Bearer ${access}`;
    if (responsavel) headers['X-Responsavel-Email'] = responsavel;
    return fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      signal,
    });
  };

  let res: Response;
  try {
    res = await doFetch();
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError({ status: 0, codigo: 'REDE', titulo: 'Buga… o mamute tropeçou no cabo' });
  }

  if (res.status === 401 && !anonimo && tokens.refresh) {
    const ok = await renovar();
    if (ok) {
      res = await doFetch();
    } else {
      tokens.limpar();
      expiredListeners.forEach((l) => l());
    }
  }

  if (!res.ok) throw await parseErro(res);
  if (blob) return (await res.blob()) as T;
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Baixa um arquivo autenticado (PDF do voucher, .ics) e dispara o download no navegador. */
export async function baixarArquivo(path: string, nome: string, responsavel?: string) {
  const data = await request<Blob>(path, { blob: true, responsavel });
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
