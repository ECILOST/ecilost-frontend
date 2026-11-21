import { ObjectIllustration, type ObjectKind } from './object-illustration';
import styles from './object-card.module.css';

export interface ExampleObject {
  kind: ObjectKind;
  name: string;
  /** Donde aparecio: es lo primero que reconoce quien lo perdio. */
  foundAt: string;
  /** Combinacion de manchas detras del plato. */
  tone: 'violet' | 'teal' | 'blue' | 'pink';
}

/**
 * Tarjeta de objeto como la del catalogo de referencia: manchas de color detras, el objeto
 * sobre un plato blanco que lo despega del fondo, y debajo el nombre y donde se encontro.
 * El nombre es el encabezado de la tarjeta; el dibujo es decorativo.
 */
export function ObjectCard({ object }: { object: ExampleObject }) {
  return (
    <article className={`${styles.card} ${styles[object.tone]}`}>
      <div className={styles.stage}>
        <span className={`${styles.blob} ${styles.blobA}`} aria-hidden="true" />
        <span className={`${styles.blob} ${styles.blobB}`} aria-hidden="true" />
        <span className={`${styles.blob} ${styles.blobC}`} aria-hidden="true" />
        <div className={styles.plate}>
          <ObjectIllustration kind={object.kind} />
        </div>
      </div>
      <h3 className={styles.name}>{object.name}</h3>
      <p className={styles.meta}>Encontrado en {object.foundAt}</p>
    </article>
  );
}
