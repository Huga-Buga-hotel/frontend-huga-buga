/**
 * Tipos dos contratos da API do Backend-Huga-Buga (records em com.hugabuga.api.dto).
 * Valores em dinheiro vêm SEMPRE em centavos (int). Datas: "2026-10-12"; horários: "19:00:00";
 * instantes: ISO 8601 com fuso.
 */

export type UUID = string;
export type ISODate = string; // 2026-10-12
export type ISOTime = string; // 19:00:00
export type ISODateTime = string;

export type Role = 'VISITANTE' | 'ADMIN';
export type CategoriaCaverna = 'FAMILIA' | 'CASAL' | 'AMIGOS' | 'GRUPO';
export type CategoriaAtividade = 'CRIANCAS' | 'FAMILIA' | 'AVENTURA' | 'NOITE' | 'ADULTOS';
export type CategoriaCardapio = 'NA_FOGUEIRA' | 'ENTRADAS' | 'MENU_KIDS' | 'DA_HORTA' | 'SOBREMESAS' | 'POCOES';
export type StatusReserva = 'PENDENTE' | 'AGUARDANDO_PAGAMENTO' | 'CONFIRMADA' | 'CANCELADA' | 'EXPIRADA' | 'CONCLUIDA';
export type StatusPagamento = 'PENDENTE' | 'APROVADO' | 'RECUSADO' | 'EXPIRADO';
export type StatusMesa = 'PENDENTE' | 'CONFIRMADA' | 'CANCELADA' | 'NAO_COMPARECEU';
export type StatusAgendamento = 'ATIVO' | 'CANCELADO';
export type MetodoPagamento = 'CARTAO' | 'PIX' | 'NA_CHEGADA';
export type OrigemMesa = 'HOSPEDE' | 'COMBO' | 'EXTERNO';
export type TipoHospede = 'ADULTO' | 'CRIANCA';
export type CobrancaExtra = 'POR_ESTADIA' | 'POR_CRIANCA' | 'POR_PESSOA';
export type Idioma = 'pt-BR' | 'en' | 'es';

// ---------- erro ----------
export interface CampoErro { campo: string; erro: string }
export interface ErroResposta {
  status: number;
  codigo: string;
  titulo?: string;
  mensagem?: string;
  ref?: string;
  campos?: CampoErro[];
  dados?: Record<string, unknown>;
}

// ---------- auth ----------
export interface LoginReq { email: string; senha: string; lembrar: boolean }
export interface CadastroReq {
  nome: string; sobrenome: string; email: string; senha: string; celular: string; pais: string;
  tipoDocumento: string; numeroDocumento: string; dataNascimento?: ISODate | null; aceitaOfertas: boolean;
}
export interface TokensRes {
  accessToken: string; refreshToken: string; expiraEmSegundos: number; usuarioId: UUID; nome: string; role: Role;
}
export interface EsqueciSenhaRes { mensagem: string; tokenDev?: string | null }

// ---------- cavernas ----------
export interface CavernaCardRes {
  id: UUID; slug: string; nome: string; categoria: CategoriaCaverna; ala: string; resumo: string;
  capacidade: number; camas: number; areaM2: number; precoBaseCentavos: number;
  totalEstadiaCentavos: number | null; notaMedia: number; totalRelatos: number;
  acessivel: boolean; aceitaPets: boolean; fotoUrl: string | null;
  unidadesLivres: number | null; ultimas: boolean; comodidades: string[];
}
export interface SugestaoData { checkIn: ISODate; checkOut: ISODate; rotulo: string }
export interface BuscaRes {
  total: number; filtrosAtivos: string[]; avisos: string[]; itens: CavernaCardRes[]; sugestoes: SugestaoData[];
}
export interface NoiteValor { data: ISODate; precoNoiteCentavos: number; adicionalAdultosCentavos: number }
export interface CotacaoRes {
  noites: number; adultosCobrados: number; adultosExtras: number; criancasGratis: number;
  valorDiariasCentavos: number; detalhe: NoiteValor[]; feriado: boolean;
}
export interface FotoRes { url: string; legenda: string }
export interface ComodidadeRes { id: string; nome: string; icone: string }
export interface CavernaDetalheRes {
  caverna: CavernaCardRes; descricao: string; fotos: FotoRes[]; comodidades: ComodidadeRes[];
}
export interface RelatoRes { id: UUID; nota: number; texto: string | null; autor: string; criadoEm: ISODateTime; fotos: string[] }
export interface DiaDisponibilidadeRes {
  data: ISODate; unidadesLivres: number; totalUnidades: number; disponivel: boolean; precoNoiteCentavos: number; feriado: boolean;
}
export interface OpcaoContagemRes { valor: string; quantidade: number }
export interface FiltrosRes {
  categorias: OpcaoContagemRes[]; precoMinCentavos: number; precoMaxCentavos: number;
  comodidades: ComodidadeRes[]; capacidadeMaxima: number; ordens: string[];
  minNoites: number; maxNoites: number; antecedenciaMaxDias: number; horarioCheckIn: string; horarioCheckOut: string;
}
export interface PaginaRes<T> { itens: T[]; page: number; size: number; total: number }

// ---------- home ----------
export interface HomeRes {
  cavernas: CavernaCardRes[]; aventuras: AtividadeRes[]; banquete: RestauranteRes;
  depoimentos: RelatoRes[]; totalCavernas: number; totalTocas: number;
}

// ---------- atividades ----------
export interface AtividadeRes {
  id: UUID; nome: string; categoria: CategoriaAtividade; descricao: string; duracaoMin: number;
  idadeMin: number | null; idadeMax: number | null; precoCentavos: number; cobranca: string; destaque: string | null;
}
export interface CatalogoRes { itens: AtividadeRes[]; contagemPorCategoria: Record<string, number> }
export interface SessaoRes { id: UUID; inicio: ISODateTime; vagasTotais: number; vagasLivres: number; esgotada: boolean }
export interface SessaoDoDiaRes {
  sessaoId: UUID; atividadeId: UUID; atividade: string; categoria: CategoriaAtividade; inicio: ISODateTime;
  duracaoMin: number; precoCentavos: number; vagasTotais: number; vagasLivres: number; esgotada: boolean;
}
export interface AgendamentoRes {
  id: UUID; sessaoId: UUID; atividade: string; inicio: ISODateTime; quantidade: number; valorCentavos: number; status: StatusAgendamento;
}
export interface AgendaItemRes { hora: string; tipo: string; titulo: string; detalhe: string }
export interface AgendaRes { data: ISODate; itens: AgendaItemRes[] }
export interface AlertaReq {
  email: string; tipo: string; cavernaId?: UUID; sessaoId?: UUID; checkIn?: ISODate; checkOut?: ISODate; pessoas?: number;
}

// ---------- restaurante ----------
export interface TurnoRes { nome: string; abre: ISOTime; fecha: ISOTime }
export interface RestauranteRes {
  turnos: TurnoRes[]; abertoAgora: boolean; turnoAtual: string | null; descontoHospedePct: number; capacidadePessoas: number;
}
export interface ItemCardapioRes { id: UUID; nome: string; descricao: string; precoCentavos: number; categoria: CategoriaCardapio; tags: string[] }
export interface HorarioRes { horario: ISOTime; status: 'LIVRE' | 'LOTADO'; vagasRestantes: number }
export interface MesaReq {
  codigoReserva?: string | null; nomeContato?: string; emailContato?: string; celularContato?: string;
  data: ISODate; horario: ISOTime; pessoas: number; cadeirinhas: number; pertoFogueira: boolean;
}
export interface MesaRes {
  codigo: string; origem: OrigemMesa; codigoReserva: string | null; data: ISODate; horario: ISOTime; pessoas: number;
  cadeirinhas: number; pertoFogueira: boolean; status: StatusMesa; nomeContato: string | null; descontoHospedePct: number;
}

// ---------- reserva ----------
export interface CriarReservaReq {
  cavernaId: UUID; checkIn: ISODate; checkOut: ISODate; adultos: number; idadesCriancas: number[];
  email?: string; precoEsperadoCentavos?: number;
}
export interface HospedeDto { nome: string; tipo: TipoHospede; idade?: number | null }
export interface HospedesReq {
  responsavelNome: string; responsavelEmail: string; celular: string; pais: string; tipoDocumento: string;
  documento: string; pedidoEspecial?: string; hospedes: HospedeDto[];
}
export interface ExtraRes { id: string; nome: string; descricao: string; icone: string; precoCentavos: number; cobranca: CobrancaExtra; incluso: boolean }
export interface ExtraSelecionadoRes { extraId: string; nome: string; quantidade: number; precoUnitarioCentavos: number; subtotalCentavos: number }
export interface ComboRes { id: string; nome: string; descricao: string; precoAdultoCentavos: number; precoCriancaCentavos: number }
export interface ComboSelecionadoRes {
  comboId: string; nome: string; horario: ISOTime; noites: number; adultosPagantes: number; criancasPagantes: number;
  valorCentavos: number; mesas: string[];
}
export interface ReservaRes {
  codigo: string; status: StatusReserva; cavernaId: UUID; cavernaNome: string; unidadeCodigo: string;
  checkIn: ISODate; checkOut: ISODate; noites: number; adultos: number; criancas: number;
  expiraEm: ISODateTime | null; prorrogada: boolean; responsavelNome: string | null; responsavelEmail: string | null;
  celular: string | null; hospedes: HospedeDto[]; extras: ExtraSelecionadoRes[]; combo: ComboSelecionadoRes | null;
  cupom: string | null; pedidoEspecial: string | null; lateCheckout: boolean; valorDiarias: number; valorExtras: number;
  valorCombo: number; desconto: number; total: number; pago: boolean; checkinOnlineEm: ISODateTime | null;
}
export interface AlterarDatasRes { reserva: ReservaRes; diferencaCentavos: number }
export interface CancelarRes { reserva: ReservaRes; reembolsoCentavos: number; multaCentavos: number }

// ---------- pagamento ----------
export interface PagamentoReq {
  metodo: MetodoPagamento; parcelas?: number; numeroCartao?: string; validade?: string; cvv?: string; aceitoRegras: boolean;
}
export interface PagamentoRes {
  id: UUID; reservaCodigo: string; metodo: MetodoPagamento; status: StatusPagamento; valorCentavos: number;
  parcelas: number | null; valorParcelaCentavos: number | null; cartaoFinal: string | null; cartaoBandeira: string | null;
  pixCopiaCola: string | null; pixExpiraEm: ISODateTime | null; motivoRecusa: string | null;
}

// ---------- conta ----------
export interface PerfilRes {
  id: UUID; nome: string; sobrenome: string; email: string; celular: string | null; pais: string | null;
  tipoDocumento: string | null; documentoMascarado: string | null; dataNascimento: ISODate | null;
  aceitaOfertas: boolean; role: Role; idioma: Idioma | null;
}
export interface PerfilReq {
  nome?: string; sobrenome?: string; celular?: string; pais?: string; tipoDocumento?: string; numeroDocumento?: string;
  dataNascimento?: ISODate | null; aceitaOfertas?: boolean;
}
export interface PreferenciasRes { idioma: Idioma; notificacoesEmail: boolean; notificacoesWhatsapp: boolean; aceitaOfertas: boolean }
export type PreferenciasReq = Partial<PreferenciasRes>;
export interface MembroReq { nome: string; tipo: TipoHospede; dataNascimento?: ISODate | null; observacoes?: string }
export interface MembroRes { id: UUID; nome: string; tipo: TipoHospede; dataNascimento: ISODate | null; idade: number | null; observacoes: string | null }
export interface ReservaResumoRes {
  codigo: string; cavernaId: UUID; cavernaNome: string; cavernaSlug: string; fotoUrl: string | null;
  checkIn: ISODate; checkOut: ISODate; noites: number; adultos: number; criancas: number; status: StatusReserva;
  total: number; pago: boolean; diasParaCheckIn: number | null; temCombo: boolean; podeAvaliar: boolean;
}
export interface MesaResumoRes { codigo: string; data: ISODate; horario: ISOTime; pessoas: number; status: StatusMesa; origem: OrigemMesa }
export interface MinhasReservasRes { estadias: ReservaResumoRes[]; mesas: MesaResumoRes[]; contagem: Record<string, number> }
export interface PagamentoResumoRes {
  id: UUID; reservaCodigo: string; metodo: MetodoPagamento; status: StatusPagamento; valorCentavos: number;
  parcelas: number | null; cartaoFinal: string | null; cartaoBandeira: string | null; criadoEm: ISODateTime; aprovadoEm: ISODateTime | null;
}

// ---------- chat ----------
export interface ChatRes { resposta: string }
export interface ChatAudioRes { transcricao: string; resposta: string }

// ---------- admin ----------
export interface ReservaAdminRes {
  codigo: string; status: StatusReserva; cavernaNome: string; unidadeCodigo: string; checkIn: ISODate; checkOut: ISODate;
  responsavelNome: string | null; responsavelEmail: string | null; adultos: number; criancas: number; total: number;
  temCombo: boolean; criadoEm: ISODateTime;
}
export interface DashboardRes {
  data: ISODate; tocasTotal: number; tocasOcupadas: number; ocupacaoPct: number;
  checkInsDoDia: ReservaAdminRes[]; checkOutsDoDia: ReservaAdminRes[]; receitaDoMesCentavos: number;
  pessoasNoBanquete: number; capacidadeBanquete: number;
}
export interface OcupacaoUnidadeRes {
  unidadeId: UUID; codigo: string; cavernaNome: string; situacao: string; reservaCodigo: string | null;
  reservaStatus: StatusReserva | null; checkIn: ISODate | null; checkOut: ISODate | null; responsavelNome: string | null;
}
export interface CavernaAdminRes {
  id: UUID; slug: string; nome: string; categoria: CategoriaCaverna; capacidade: number; precoBaseCentavos: number;
  ativa: boolean; unidades: number; unidadesAtivas: number; notaMedia: number; totalRelatos: number;
}
export interface CavernaAdminReq { nome?: string; resumo?: string; descricao?: string; precoBaseCentavos?: number; ativa?: boolean }
export interface OcupacaoHorarioRes { horario: ISOTime; pessoas: number; lugaresLivres: number }
export interface MesaAdminRes {
  codigo: string; origem: OrigemMesa; status: StatusMesa; horario: ISOTime; pessoas: number; cadeirinhas: number;
  pertoFogueira: boolean; nomeContato: string | null; celularContato: string | null; emailContato: string | null; reservaCodigo: string | null;
}
export interface MesasDoDiaRes { data: ISODate; capacidadePessoas: number; ocupacao: OcupacaoHorarioRes[]; mesas: MesaAdminRes[] }
export interface UsuarioAdminRes { id: UUID; nome: string; sobrenome: string; email: string; role: Role; criadoEm: ISODateTime }
