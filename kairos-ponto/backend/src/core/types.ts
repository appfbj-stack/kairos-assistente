/**
 * Papéis do Kairos Ponto (alinhados ao PRD seção 5):
 * - SUPER_ADMIN   → gestão da plataforma (empresas, planos, licenças, métricas globais)
 * - ADMIN_EMPRESA → "Administrador": funcionários, escalas, aprovações, relatórios
 * - SUPERVISOR    → visualiza equipe e aprova solicitações
 * - FUNCIONARIO   → registra ponto, consulta histórico, solicita ajustes
 */
export type PontoRole = "SUPER_ADMIN" | "ADMIN_EMPRESA" | "SUPERVISOR" | "FUNCIONARIO";

export const PONTO_ROLES: PontoRole[] = ["SUPER_ADMIN", "ADMIN_EMPRESA", "SUPERVISOR", "FUNCIONARIO"];

export interface AuthUser {
  id: string;
  empresa_id: string | null;
  email: string;
  role: PontoRole;
  funcionario_id?: string | null;
}

export const TIPOS_REGISTRO = ["entrada", "saida_almoco", "retorno_almoco", "saida_final"] as const;
export type TipoRegistro = (typeof TIPOS_REGISTRO)[number];
