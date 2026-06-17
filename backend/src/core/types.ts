export type CoreRole =
  | "SUPER_ADMIN"
  | "ADMIN_EMPRESA"
  | "GERENTE"
  | "OPERADOR"
  | "USUARIO"
  | "CLIENTE";

export const CORE_ROLES: CoreRole[] = [
  "SUPER_ADMIN",
  "ADMIN_EMPRESA",
  "GERENTE",
  "OPERADOR",
  "USUARIO",
  "CLIENTE",
];

export type LicenseStatus = "ATIVA" | "TRIAL" | "SUSPENSA" | "EXPIRADA" | "BLOQUEADA";

export const TRIAL_DURATIONS_DAYS = [7, 15, 30] as const;

export interface AuthUser {
  id: string;
  empresa_id: string | null;
  email: string;
  role: CoreRole;
}
