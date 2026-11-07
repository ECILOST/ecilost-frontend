import { formatAgo } from '@/features/auctions/domain/auction-rules';
import { Icon } from '@/shared/components/ui/icon';
import styles from './freshness.module.css';

/**
 * De cuando es lo que se ve. El perfil y el top salen de un modelo de lectura que se pone al
 * dia unos segundos despues de que cierra cada ronda (consistencia eventual): decirlo evita
 * que quien acaba de ganar crea que su victoria se perdio.
 */
export function Freshness({
  updatedAt,
  compact = false,
}: {
  updatedAt: string;
  compact?: boolean;
}) {
  const ago = formatAgo(updatedAt).replace(/^Hace/, 'hace');
  if (compact) {
    return (
      <p className={styles.compact}>
        Actualizado {ago} · se recalcula al cerrar cada subasta
      </p>
    );
  }
  return (
    <div className={styles.box} role="note">
      <Icon name="swap" size={18} />
      <div>
        <strong>Actualizado {ago}</strong>
        <p>
          Se recalcula unos segundos después de que cierra cada subasta. Si
          acabas de ganar, puede tardar un momento en aparecer.
        </p>
      </div>
    </div>
  );
}
