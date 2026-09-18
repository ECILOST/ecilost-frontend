import type { ReactNode } from 'react';
import { Notice } from './ui/notice';

/** Lista vacia. Distinta de un error: aqui la consulta funciono y no habia nada. */
export function EmptyState({
  title,
  children,
  actions,
}: {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Notice title={title} actions={actions}>
      {children}
    </Notice>
  );
}
