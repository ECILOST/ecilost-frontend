import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { Brand } from '@/shared/components/shell/brand';
import { buttonClass } from '@/shared/components/ui/button';
import { ObjectCard, type ExampleObject } from '../components/object-card';
import { ObjectIllustration } from '../components/object-illustration';
import styles from './landing.page.module.css';

const MAIN_ID = 'contenido';
const HOW_ID = 'como-funciona';

/** Es una secuencia de verdad: el orden de los pasos es el del objeto. */
const STEPS: Array<{ title: string; body: string }> = [
  {
    title: 'Alguien encuentra un objeto',
    body: 'Lo entrega en objetos perdidos de la Escuela y queda registrado con fotos y el lugar donde apareció.',
  },
  {
    title: 'Nadie lo reclama a tiempo',
    body: 'Si su dueño no aparece dentro del plazo de reclamo, el objeto queda disponible para subasta.',
  },
  {
    title: 'Sale a una subasta en vivo',
    body: 'Se programa una sala con fecha y hora. Puedes ver los objetos antes de que empiece.',
  },
  {
    title: 'Pujas con ECICoin y lo recoges',
    body: 'Entras con tu cuenta de Google, pujas con ECICoin y, si ganas, lo recoges en el punto de entrega.',
  },
];

const EXAMPLES: ExampleObject[] = [
  { kind: 'umbrella', name: 'Paraguas', foundAt: 'el bloque G', tone: 'violet' },
  { kind: 'headphones', name: 'Audífonos', foundAt: 'la biblioteca', tone: 'teal' },
  { kind: 'bottle', name: 'Termo', foundAt: 'la cafetería', tone: 'pink' },
  { kind: 'calculator', name: 'Calculadora científica', foundAt: 'un salón del bloque C', tone: 'blue' },
];

/**
 * Portada publica: lo primero que ve quien llega sin sesion a `/`.
 *
 * Explica que es la plataforma y como llega un objeto a subasta, y lleva a una sola accion
 * principal: ingresar. No muestra subastas reales porque el catalogo exige sesion; los
 * objetos de abajo son ejemplos ilustrados, y asi se dice.
 */
export function LandingPage() {
  const year = new Date().getFullYear();

  return (
    <div className={styles.screen}>
      <a className={styles.skip} href={`#${MAIN_ID}`}>
        Saltar al contenido
      </a>

      <header className={styles.top}>
        <Brand />
        <Link className={buttonClass('primary')} to={routes.login}>
          Ingresar
        </Link>
      </header>

      <main id={MAIN_ID} tabIndex={-1} className={styles.main}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>
              Escuela Colombiana de Ingeniería Julio Garavito
            </p>
            <h1 id="hero-title" className={styles.title}>
              Los objetos perdidos que nadie reclamó, ahora se subastan
            </h1>
            <p className={styles.lead}>
              ECI Lost es la plataforma de subastas en línea de la Escuela. Lo que
              se queda en objetos perdidos sin que su dueño aparezca sale a
              subasta, y la comunidad puja por ello con ECICoin.
            </p>
            <div className={styles.actions}>
              <Link className={buttonClass('primary', 'lg')} to={routes.login}>
                Ingresar
              </Link>
              <a className={buttonClass('secondary', 'lg')} href={`#${HOW_ID}`}>
                Ver cómo funciona
              </a>
            </div>
          </div>

          {/* La pieza protagonista: un objeto en su plato sobre el collage de manchas. */}
          <div className={styles.collage} aria-hidden="true">
            <span className={`${styles.splash} ${styles.splashViolet}`} />
            <span className={`${styles.splash} ${styles.splashTeal}`} />
            <span className={`${styles.splash} ${styles.splashPink}`} />
            <span className={`${styles.splash} ${styles.splashYellow}`} />
            <span className={`${styles.splash} ${styles.splashBlue}`} />
            <div className={styles.heroPlate}>
              <ObjectIllustration kind="umbrella" />
            </div>
            <div className={`${styles.miniPlate} ${styles.miniA}`}>
              <ObjectIllustration kind="headphones" />
            </div>
            <div className={`${styles.miniPlate} ${styles.miniB}`}>
              <ObjectIllustration kind="bottle" />
            </div>
          </div>
        </section>

        <section
          id={HOW_ID}
          className={styles.section}
          aria-labelledby="how-title"
        >
          <p className={styles.eyebrow}>Cómo funciona</p>
          <h2 id="how-title" className={styles.sectionTitle}>
            De objetos perdidos a tu mochila, en cuatro pasos
          </h2>
          <ol className={styles.steps}>
            {STEPS.map((step, index) => (
              <li key={step.title} className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepBody}>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section} aria-labelledby="examples-title">
          <p className={styles.eyebrow}>Ejemplos</p>
          <h2 id="examples-title" className={styles.sectionTitle}>
            Lo que suele terminar en subasta
          </h2>
          <p className={styles.sectionLead}>
            Ilustraciones de objetos típicos. Las subastas reales las ves al
            ingresar con tu cuenta.
          </p>
          <ul className={styles.examples}>
            {EXAMPLES.map((object) => (
              <li key={object.kind}>
                <ObjectCard object={object} />
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.closing} aria-labelledby="closing-title">
          <h2 id="closing-title" className={styles.closingTitle}>
            ¿Listo para tu primera puja?
          </h2>
          <p className={styles.closingBody}>
            Ingresa con tu cuenta de Google, la personal o la de la Escuela. La
            contraseña la pide Google: ECI Lost nunca la ve.
          </p>
          <Link className={buttonClass('primary', 'lg')} to={routes.login}>
            Ingresar
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>
          Escuela Colombiana de Ingeniería Julio Garavito, {year}
        </p>
        <Link className={styles.footerLink} to={routes.login}>
          Ingresar
        </Link>
      </footer>
    </div>
  );
}
