import { request, reservaEmails, baixarArquivo } from './client';
import type * as T from './types';

/** E-mail do responsável guardado para a reserva (quando foi feita sem conta). */
const resp = (codigo: string) => reservaEmails.get(codigo);
const enc = encodeURIComponent;

export const api = {
  health: () => request<{ status: string }>('/health', { anonimo: true }),
  home: () => request<T.HomeRes>('/home'),

  // ---------- auth ----------
  auth: {
    login: (b: T.LoginReq) => request<T.TokensRes>('/auth/login', { method: 'POST', body: b, anonimo: true }),
    cadastro: (b: T.CadastroReq) => request<T.TokensRes>('/auth/cadastro', { method: 'POST', body: b, anonimo: true }),
    logout: (refreshToken: string) => request<void>('/auth/logout', { method: 'POST', body: { refreshToken } }),
    esqueciSenha: (email: string) => request<T.EsqueciSenhaRes>('/auth/esqueci-senha', { method: 'POST', body: { email }, anonimo: true }),
    redefinirSenha: (token: string, novaSenha: string) =>
      request<void>('/auth/redefinir-senha', { method: 'POST', body: { token, novaSenha }, anonimo: true }),
  },

  // ---------- cavernas ----------
  cavernas: {
    buscar: (q: {
      checkIn?: string; checkOut?: string; adultos?: number; idadesCriancas?: number[]; categoria?: string[];
      precoMin?: number; precoMax?: number; comodidades?: string[]; acessivel?: boolean; ordem?: string; page?: number; size?: number;
    }) => request<T.BuscaRes>('/cavernas', { query: q }),
    filtros: () => request<T.FiltrosRes>('/cavernas/filtros'),
    detalhe: (slug: string) => request<T.CavernaDetalheRes>(`/cavernas/${enc(slug)}`),
    disponibilidade: (id: string, de?: string, ate?: string) =>
      request<T.DiaDisponibilidadeRes[]>(`/cavernas/${id}/disponibilidade`, { query: { de, ate } }),
    cotacao: (id: string, q: { checkIn: string; checkOut: string; adultos: number; idadesCriancas?: number[] }) =>
      request<T.CotacaoRes>(`/cavernas/${id}/cotacao`, { query: q }),
    relatos: (id: string, page = 0) => request<T.PaginaRes<T.RelatoRes>>(`/cavernas/${id}/relatos`, { query: { page } }),
    comodidades: () => request<T.ComodidadeRes[]>('/comodidades'),
  },

  // ---------- atividades ----------
  atividades: {
    catalogo: (categoria?: T.CategoriaAtividade) => request<T.CatalogoRes>('/atividades', { query: { categoria } }),
    sessoesDoDia: (data: string, categoria?: T.CategoriaAtividade) =>
      request<T.SessaoDoDiaRes[]>('/atividades/sessoes', { query: { data, categoria } }),
    detalhe: (id: string) => request<T.AtividadeRes>(`/atividades/${id}`),
    sessoes: (id: string, de?: string, ate?: string) => request<T.SessaoRes[]>(`/atividades/${id}/sessoes`, { query: { de, ate } }),
    alerta: (b: T.AlertaReq) => request<void>('/alertas-vaga', { method: 'POST', body: b }),
    agendamentos: (codigo: string) => request<T.AgendamentoRes[]>(`/reservas/${enc(codigo)}/agendamentos`, { responsavel: resp(codigo) }),
    agendar: (codigo: string, sessaoId: string, quantidade: number) =>
      request<T.AgendamentoRes>(`/reservas/${enc(codigo)}/agendamentos`, { method: 'POST', body: { sessaoId, quantidade }, responsavel: resp(codigo) }),
    cancelarAgendamento: (codigo: string, id: string) =>
      request<void>(`/reservas/${enc(codigo)}/agendamentos/${id}`, { method: 'DELETE', responsavel: resp(codigo) }),
    agenda: (codigo: string, data?: string) =>
      request<T.AgendaRes>(`/reservas/${enc(codigo)}/agenda`, { query: { data }, responsavel: resp(codigo) }),
  },

  // ---------- restaurante ----------
  restaurante: {
    visao: () => request<T.RestauranteRes>('/restaurante'),
    cardapio: (categoria?: T.CategoriaCardapio) => request<T.ItemCardapioRes[]>('/restaurante/cardapio', { query: { categoria } }),
    combos: () => request<T.ComboRes[]>('/restaurante/combos'),
    horarios: (data: string, pessoas: number) => request<T.HorarioRes[]>('/restaurante/horarios', { query: { data, pessoas } }),
    reservarMesa: (b: T.MesaReq) =>
      request<T.MesaRes>('/restaurante/reservas-mesa', {
        method: 'POST', body: b,
        responsavel: b.codigoReserva ? resp(b.codigoReserva) : b.emailContato,
      }),
    mesa: (codigo: string, email?: string) => request<T.MesaRes>(`/restaurante/reservas-mesa/${enc(codigo)}`, { responsavel: email }),
    cancelarMesa: (codigo: string, email?: string) =>
      request<T.MesaRes>(`/restaurante/reservas-mesa/${enc(codigo)}`, { method: 'DELETE', responsavel: email }),
  },

  // ---------- reserva ----------
  reservas: {
    criar: (b: T.CriarReservaReq) => request<T.ReservaRes>('/reservas', { method: 'POST', body: b, responsavel: b.email }),
    hospedes: (codigo: string, b: T.HospedesReq) =>
      request<T.ReservaRes>(`/reservas/${enc(codigo)}/hospedes`, { method: 'PUT', body: b, responsavel: resp(codigo) }),
    prorrogar: (codigo: string) => request<T.ReservaRes>(`/reservas/${enc(codigo)}/prorrogar`, { method: 'POST', responsavel: resp(codigo) }),
    extras: () => request<T.ExtraRes[]>('/extras'),
    salvarExtras: (codigo: string, extras: { extraId: string; quantidade?: number }[]) =>
      request<T.ReservaRes>(`/reservas/${enc(codigo)}/extras`, { method: 'PUT', body: { extras }, responsavel: resp(codigo) }),
    definirCombo: (codigo: string, comboId: string, horario: string) =>
      request<T.ReservaRes>(`/reservas/${enc(codigo)}/combo`, { method: 'PUT', body: { comboId, horario }, responsavel: resp(codigo) }),
    removerCombo: (codigo: string) => request<T.ReservaRes>(`/reservas/${enc(codigo)}/combo`, { method: 'DELETE', responsavel: resp(codigo) }),
    aplicarCupom: (codigo: string, cupom: string) =>
      request<T.ReservaRes>(`/reservas/${enc(codigo)}/cupom`, { method: 'POST', body: { codigo: cupom }, responsavel: resp(codigo) }),
    removerCupom: (codigo: string) => request<T.ReservaRes>(`/reservas/${enc(codigo)}/cupom`, { method: 'DELETE', responsavel: resp(codigo) }),
    obter: (codigo: string) => request<T.ReservaRes>(`/reservas/${enc(codigo)}`, { responsavel: resp(codigo) }),
    buscarSemConta: (codigo: string, email: string) =>
      request<T.ReservaRes>('/reservas/buscar', { query: { codigo, email }, anonimo: true }),
    baixarVoucher: (codigo: string) => baixarArquivo(`/reservas/${enc(codigo)}/voucher.pdf`, `voucher-${codigo}.pdf`, resp(codigo)),
    baixarAgenda: (codigo: string) => baixarArquivo(`/reservas/${enc(codigo)}/agenda.ics`, `huga-buga-${codigo}.ics`, resp(codigo)),
    alterarDatas: (codigo: string, checkIn: string, checkOut: string) =>
      request<T.AlterarDatasRes>(`/reservas/${enc(codigo)}/datas`, { method: 'PATCH', body: { checkIn, checkOut }, responsavel: resp(codigo) }),
    cancelar: (codigo: string) => request<T.CancelarRes>(`/reservas/${enc(codigo)}/cancelar`, { method: 'POST', responsavel: resp(codigo) }),
    checkin: (codigo: string) => request<T.ReservaRes>(`/reservas/${enc(codigo)}/checkin`, { method: 'POST', responsavel: resp(codigo) }),
    avaliar: (codigo: string, nota: number, texto: string, fotos: File[]) => {
      const fd = new FormData();
      fd.append('nota', String(nota));
      if (texto.trim()) fd.append('texto', texto.trim());
      fotos.forEach((f) => fd.append('fotos', f));
      return request<T.RelatoRes>(`/reservas/${enc(codigo)}/relato`, { method: 'POST', body: fd });
    },
  },

  // ---------- pagamento ----------
  pagamentos: {
    pagar: (codigo: string, b: T.PagamentoReq) =>
      request<T.PagamentoRes>(`/reservas/${enc(codigo)}/pagamentos`, { method: 'POST', body: b, responsavel: resp(codigo) }),
    consultar: (id: string, codigo: string) => request<T.PagamentoRes>(`/pagamentos/${id}`, { responsavel: resp(codigo) }),
    simularConfirmacao: (id: string, codigo: string) =>
      request<T.PagamentoRes>(`/pagamentos/${id}/simular-confirmacao`, { method: 'POST', responsavel: resp(codigo) }),
  },

  // ---------- conta ----------
  me: {
    perfil: () => request<T.PerfilRes>('/me'),
    atualizar: (b: T.PerfilReq) => request<T.PerfilRes>('/me', { method: 'PATCH', body: b }),
    trocarSenha: (senhaAtual: string, novaSenha: string) => request<void>('/me/senha', { method: 'PATCH', body: { senhaAtual, novaSenha } }),
    preferencias: () => request<T.PreferenciasRes>('/me/preferencias'),
    salvarPreferencias: (b: T.PreferenciasReq) => request<T.PreferenciasRes>('/me/preferencias', { method: 'PUT', body: b }),
    membros: () => request<T.MembroRes[]>('/me/membros'),
    adicionarMembro: (b: T.MembroReq) => request<T.MembroRes>('/me/membros', { method: 'POST', body: b }),
    editarMembro: (id: string, b: T.MembroReq) => request<T.MembroRes>(`/me/membros/${id}`, { method: 'PATCH', body: b }),
    removerMembro: (id: string) => request<void>(`/me/membros/${id}`, { method: 'DELETE' }),
    favoritos: () => request<T.CavernaCardRes[]>('/me/favoritos'),
    favoritar: (cavernaId: string) => request<void>(`/me/favoritos/${cavernaId}`, { method: 'POST' }),
    desfavoritar: (cavernaId: string) => request<void>(`/me/favoritos/${cavernaId}`, { method: 'DELETE' }),
    pagamentos: () => request<T.PagamentoResumoRes[]>('/me/pagamentos'),
    reservas: (aba: 'proximas' | 'passadas' | 'canceladas') => request<T.MinhasReservasRes>('/me/reservas', { query: { aba } }),
  },

  // ---------- chatbot Bugão ----------
  chat: {
    texto: (mensagem: string, idSessao: string) => request<T.ChatRes>('/chat', { method: 'POST', body: { mensagem, idSessao } }),
    audio: (audio: Blob, idSessao: string, idioma?: string) => {
      const fd = new FormData();
      const ext = audio.type.includes('ogg') ? 'ogg' : audio.type.includes('mp4') ? 'm4a' : 'webm';
      fd.append('audio', audio, `mensagem.${ext}`);
      fd.append('idSessao', idSessao);
      if (idioma) fd.append('idioma', idioma);
      return request<T.ChatAudioRes>('/chat/audio', { method: 'POST', body: fd });
    },
    encerrar: (idSessao: string) => request<void>(`/chat/${idSessao}`, { method: 'DELETE' }),
  },

  // ---------- admin ----------
  admin: {
    dashboard: (data?: string) => request<T.DashboardRes>('/admin/dashboard', { query: { data } }),
    reservas: (q: { status?: string; de?: string; ate?: string; busca?: string; page?: number; size?: number }) =>
      request<T.PaginaRes<T.ReservaAdminRes>>('/admin/reservas', { query: q }),
    ocupacao: (data?: string) => request<T.OcupacaoUnidadeRes[]>('/admin/ocupacao', { query: { data } }),
    alterarUnidade: (id: string, ativa: boolean) => request<T.OcupacaoUnidadeRes>(`/admin/unidades/${id}`, { method: 'PATCH', body: { ativa } }),
    cavernas: () => request<T.CavernaAdminRes[]>('/admin/cavernas'),
    alterarCaverna: (id: string, b: T.CavernaAdminReq) => request<T.CavernaAdminRes>(`/admin/cavernas/${id}`, { method: 'PATCH', body: b }),
    mesas: (data?: string) => request<T.MesasDoDiaRes>('/admin/restaurante/mesas', { query: { data } }),
    naoCompareceu: (codigo: string) => request<void>(`/admin/restaurante/mesas/${enc(codigo)}/nao-compareceu`, { method: 'POST' }),
    excluirRelato: (id: string) => request<void>(`/admin/relatos/${id}`, { method: 'DELETE' }),
    usuarios: (q: { busca?: string; page?: number; size?: number }) => request<T.PaginaRes<T.UsuarioAdminRes>>('/admin/usuarios', { query: q }),
    alterarRole: (id: string, role: T.Role) => request<T.UsuarioAdminRes>(`/admin/usuarios/${id}/role`, { method: 'PATCH', body: { role } }),
  },
};
