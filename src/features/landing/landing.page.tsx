import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { useSession } from '@/features/auth/hooks/use-session';
import { Brand } from '@/shared/components/shell/brand';
import { buttonClass } from '@/shared/components/ui/button';
import { ObjectGlyph, type ObjectGlyphName } from './object-glyphs';
import styles from './landing.page.module.css';

interface Step {
  title: string;
  text: string;
}

const STEPS: Step[] = [
  {
    title: 'Se pierde y se registra',
    text: 'Lo que aparece en el campus llega a objetos perdidos y queda registrado con foto y estado.',
  },
  {
    title: 'Nadie lo reclama',
    text: 'Si su dueño no aparece en el plazo establecido, el objeto pasa a subasta.',
  },
  {
    title: 'Entras y pujas',
    text: 'Ingresas con tu cuenta, recibes ECICoin y pujas en vivo contra otros estudiantes.',
  },
  {
    title: 'Lo recoges',
    text: 'Si ganas, agendas la recogida y te lo llevas en la universidad.',
  },
];

interface Example {
  name: string;
  detail: string;
  category: string;
  condition: string;
  glyph: ObjectGlyphName;
  /** Variante de las manchas de color: cambia el collage de una tarjeta a otra. */
  deco: 'a' | 'b' | 'c';
}

const EXAMPLES: Example[] = [
  {
    name: 'Gafas de sol',
    detail: 'Montura negra',
    category: 'Accesorios',
    condition: 'Bueno',
    glyph: 'glasses',
    deco: 'a',
  },
  {
    name: 'Termo',
    detail: 'Naranja, 1 litro',
    category: 'Hidratación',
    condition: 'Bueno',
    glyph: 'bottle',
    deco: 'c',
  },
  {
    name: 'Calculadora científica',
    detail: 'Con tapa',
    category: 'Académico',
    condition: 'Como nuevo',
    glyph: 'calculator',
    deco: 'b',
  },
  {
    name: 'Audífonos',
    detail: 'De diadema',
    category: 'Tecnología',
    condition: 'Usado',
    glyph: 'headphones',
    deco: 'a',
  },
  {
    name: 'Sombrilla',
    detail: 'Plegable',
    category: 'Accesorios',
    condition: 'Bueno',
    glyph: 'umbrella',
    deco: 'b',
  },
  {
    name: 'Libro de cálculo',
    detail: 'Tapa dura',
    category: 'Académico',
    condition: 'Usado',
    glyph: 'book',
    deco: 'c',
  },
];

/**
 * Portada publica: la primera pantalla de quien llega sin sesion. Explica que es ECI Lost
 * antes de pedir nada, con una sola accion principal (Ingresar).
 *
 * Es estatica a proposito: no depende de ningun servicio, asi que no tiene estados de
 * carga ni de error y abre aunque el backend este caido.
 */
export function LandingPage() {
  const { status } = useSession();
  const signedIn = status === 'authenticated';
  const primaryTo = signedIn ? routes.home : routes.login;
  const primaryLabel = signedIn ? 'Ir a las subastas' : 'Ingresar';

  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#landing-main">
        Saltar al contenido
      </a>

      <header className={styles.header}>
        <div className={styles.bar}>
          <Brand asLink={false} />
          <nav aria-label="Portada" className={styles.headerNav}>
            <a className={styles.headerLink} href="#como-funciona">
              Cómo funciona
            </a>
            <Link className={buttonClass('primary', 'md')} to={primaryTo}>
              {primaryLabel}
            </Link>
          </nav>
        </div>
      </header>

      <main id="landing-main" tabIndex={-1} className={styles.main}>
        {/* --- Hero ------------------------------------------------------------ */}
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>
              Escuela Colombiana de Ingeniería Julio Garavito
            </p>
            <h1 id="hero-title" className={styles.title}>
              Lo que nadie reclamó,{' '}
              <span className={styles.mark}>hoy puede ser tuyo</span>.
            </h1>
            <p className={styles.lead}>
              ECI Lost es la plataforma de subastas en línea de la Escuela. Aquí
              se subastan los objetos perdidos que nunca fueron reclamados:
              pujas con ECICoin, en vivo y desde tu celular.
            </p>
            <div className={styles.ctas}>
              <Link className={buttonClass('primary', 'lg')} to={primaryTo}>
                {primaryLabel}
              </Link>
              <a className={buttonClass('secondary', 'lg')} href="#ejemplos">
                Ver ejemplos de objetos
              </a>
            </div>
            <p className={styles.note}>
              Entras con tu cuenta de Google. ECI Lost nunca ve tu contraseña.
            </p>
          </div>

          <div className={styles.collage} aria-hidden="true">
            <span className={`${styles.blob} ${styles.blobA}`} />
            <span className={`${styles.blob} ${styles.blobB}`} />
            <span className={`${styles.blob} ${styles.blobC}`} />
            <span className={`${styles.dot} ${styles.dotPink}`} />
            <span className={`${styles.dot} ${styles.dotYellow}`} />
            <div className={`${styles.plate} ${styles.plateMain}`}>
              <ObjectGlyph name="bottle" size={96} />
            </div>
            <div className={`${styles.plate} ${styles.plateSide}`}>
              <ObjectGlyph name="glasses" size={64} />
            </div>
            <div className={styles.badge}>
              <span className={styles.badgeDot} />
              En subasta
            </div>
          </div>
        </section>

        {/* --- Como funciona -------------------------------------------------- */}
        <section
          id="como-funciona"
          className={styles.section}
          aria-labelledby="steps-title"
        >
          <p className={styles.kicker}>Cómo funciona</p>
          <h2 id="steps-title" className={styles.sectionTitle}>
            De objetos perdidos a tus manos, en cuatro pasos
          </h2>
          <ol className={styles.steps}>
            {STEPS.map((step, index) => (
              <li key={step.title} className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepText}>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* --- Ejemplos -------------------------------------------------------- */}
        <section
          id="ejemplos"
          className={styles.section}
          aria-labelledby="examples-title"
        >
          <p className={styles.kicker}>Ejemplos</p>
          <h2 id="examples-title" className={styles.sectionTitle}>
            Lo que suele terminar en subasta
          </h2>
          <p className={styles.sectionLead}>
            Ilustraciones de objetos típicos. El catálogo real lo ves al
            ingresar.
          </p>
          <ul className={styles.examples}>
            {EXAMPLES.map((example) => (
              <li key={example.name} className={styles.card}>
                <div className={styles.cardArt} data-deco={example.deco}>
                  <span className={styles.cardBlob} />
                  <span className={styles.cardBlob2} />
                  <span className={styles.cardDot} />
                  <div className={styles.cardPlate}>
                    <ObjectGlyph name={example.glyph} size={56} />
                  </div>
                </div>
                <h3 className={styles.cardTitle}>{example.name}</h3>
                <p className={styles.cardDetail}>{example.detail}</p>
                <div className={styles.tags}>
                  <span className={styles.tagCategory}>{example.category}</span>
                  <span className={styles.tagCondition}>
                    {example.condition}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* --- Cierre ---------------------------------------------------------- */}
        <section className={styles.closing} aria-labelledby="closing-title">
          <h2 id="closing-title" className={styles.closingTitle}>
            ¿Listo para tu primera puja?
          </h2>
          <Link className={buttonClass('primary', 'lg')} to={primaryTo}>
            {primaryLabel}
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Brand asLink={false} />
          <p>
            Proyecto académico de la Escuela Colombiana de Ingeniería Julio
            Garavito.
            <br />
            Subastas de objetos perdidos no reclamados.
          </p>
          <nav aria-label="Pie de página" className={styles.footerNav}>
            <a href="#como-funciona">Cómo funciona</a>
            <Link to={primaryTo}>{primaryLabel}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
