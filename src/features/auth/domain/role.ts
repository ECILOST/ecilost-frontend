/**
 * Los dos roles de ECILOST, copiados del enum de ecilost-auth-service.
 *
 * Se declara como objeto constante y no como `enum` de TypeScript porque asi el valor que
 * viaja por la red y el que usa el codigo son el mismo string, sin tabla intermedia.
 */
export const Role = {
  STAFF: 'STAFF',
  STUDENT: 'STUDENT',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLE_LABELS: Record<Role, string> = {
  STAFF: 'Funcionario',
  STUDENT: 'Estudiante',
};
