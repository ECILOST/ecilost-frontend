import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { buttonClass } from '@/shared/components/ui/button';
import { Icon, type IconName } from '@/shared/components/ui/icon';
import {
  RouletteWheel,
  SEGMENT_ICON,
} from '../components/dynamic/roulette-wheel';
import { MODE_META, WILDCARD_META } from '../domain/dynamic-modes';
import styles from './dynamic-guide.page.module.css';

/**
 * Guia de las subastas dinamicas: que puede salir en la ruleta y como se juega cada
 * modalidad. Antes esto solo se explicaba en el anuncio de tres segundos al empezar la
 * ronda; aqui se puede leer con calma desde la sala de espera.
 *
 * Los textos de cada modalidad salen de `MODE_META`, los mismos del anuncio y de la ruleta:
 * si cambia una regla, cambia en los tres sitios a la vez.
 */
export function DynamicGuidePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.kicker}>
            <Icon name="spin" size={15} /> Guía de juego
          </span>
          <h1 className={styles.title}>
            ¿Cómo funcionan las <span>subastas dinámicas</span>?
          </h1>
          <p className={styles.lead}>
            En una sala con subastas dinámicas, cada ronda puede jugarse
            distinto. Antes de empezar, el organizador gira una ruleta y la
            modalidad que salga cambia las reglas de esa ronda.
          </p>
          <ol className={styles.steps}>
            <li>
              <span>1</span> El organizador gira la ruleta antes de la ronda.
            </li>
            <li>
              <span>2</span> Toda la sala ve el resultado y un anuncio con las
              reglas.
            </li>
            <li>
              <span>3</span> La ronda se juega con esa modalidad.
            </li>
          </ol>
        </div>
        <div className={styles.heroWheel} aria-hidden="true">
          <RouletteWheel rotation={-22} size={260} />
        </div>
      </section>

      <h2 className={styles.sectionTitle}>Las modalidades</h2>
      <div className={styles.modes}>
        <ModeCard
          color="var(--eci-cyan)"
          icon="arrow-up"
          label="Clásica"
          kind="Ascendente"
          tagline="Sube la oferta. Gana la más alta cuando el reloj llega a cero."
          rules={[
            'Cada puja supera a la anterior en al menos 100 ECICoin',
            'Puedes activar la puja automática con un límite',
            'Una puja en el último minuto extiende el cierre',
          ]}
          diagram={<ClassicDiagram />}
        />
        <ModeCard
          color={MODE_META.DUTCH.color}
          icon={SEGMENT_ICON.DUTCH}
          label={MODE_META.DUTCH.label}
          kind="Descendente"
          tagline={MODE_META.DUTCH.tagline}
          rules={MODE_META.DUTCH.rules}
          diagram={<DutchDiagram />}
        />
        <ModeCard
          color={MODE_META.SEALED.color}
          icon={SEGMENT_ICON.SEALED}
          label={MODE_META.SEALED.label}
          kind="Una sola puja"
          tagline={MODE_META.SEALED.tagline}
          rules={MODE_META.SEALED.rules}
          diagram={<SealedDiagram />}
        />
        <ModeCard
          color={MODE_META.MYSTERY.color}
          icon={SEGMENT_ICON.MYSTERY}
          label={MODE_META.MYSTERY.label}
          kind="A ciegas"
          tagline={MODE_META.MYSTERY.tagline}
          rules={MODE_META.MYSTERY.rules}
          diagram={<MysteryDiagram />}
        />
      </div>

      <section
        className={styles.wildcard}
        style={{ '--mode': WILDCARD_META.color } as CSSProperties}
      >
        <span className={styles.wildcardIcon} aria-hidden="true">
          <Icon name={SEGMENT_ICON.WILDCARD} size={30} />
        </span>
        <div>
          <h2>¿Y si sale el comodín?</h2>
          <p>
            {WILDCARD_META.tagline} El comodín no es una modalidad: el
            organizador gira otra vez hasta que salga holandesa, sobre cerrado o
            lote misterioso. Cada segmento tiene la misma probabilidad y el
            resultado lo decide el servidor, no el organizador.
          </p>
        </div>
      </section>

      <h2 className={styles.sectionTitle}>Preguntas frecuentes</h2>
      <div className={styles.faq}>
        <Faq question="¿Se me cobra al pujar?">
          No de inmediato. Lo que pujas queda <strong>comprometido</strong>:
          retenido de tu saldo mientras la ronda sigue abierta. Si alguien te
          supera o no ganas, se libera y vuelve a estar disponible.
        </Faq>
        <Faq question="¿Puedo cambiar mi sobre cerrado?">
          No. En el sobre cerrado solo puedes pujar una vez y la puja no se
          puede cambiar. Piénsala bien: nadie ve las pujas de los demás hasta
          que se abren los sobres.
        </Faq>
        <Faq question="¿Funciona la puja automática en todas las modalidades?">
          Solo donde hay pujas ascendentes: en la clásica y en el lote
          misterioso. En la holandesa y en el sobre cerrado no hay puja
          automática ni compra inmediata.
        </Faq>
        <Faq question="En la holandesa, ¿qué pasa si nadie lo pide?">
          El precio sigue bajando hasta el precio mínimo y ahí se queda. Al
          pulsar «¡Lo quiero!» no hay confirmación: gana quien lo pida primero,
          al precio de ese momento.
        </Faq>
        <Faq question="¿Quién gira la ruleta?">
          El funcionario que programó la sala, antes de cada ronda. Tú ves girar
          la ruleta en vivo y la modalidad se anuncia a toda la sala al empezar.
        </Faq>
      </div>

      <div className={styles.cta}>
        <Link className={buttonClass('primary', 'lg')} to={routes.auctions}>
          Ver subastas
        </Link>
      </div>
    </div>
  );
}

function ModeCard({
  color,
  icon,
  label,
  kind,
  tagline,
  rules,
  diagram,
}: {
  color: string;
  icon: IconName;
  label: string;
  kind: string;
  tagline: string;
  rules: readonly string[];
  diagram: ReactNode;
}) {
  return (
    <article
      className={styles.mode}
      style={{ '--mode': color } as CSSProperties}
    >
      <header className={styles.modeHead}>
        <span className={styles.modeIcon} aria-hidden="true">
          <Icon name={icon} size={22} />
        </span>
        <h3>{label}</h3>
        <span className={styles.modeKind}>{kind}</span>
      </header>
      <p className={styles.modeTagline}>{tagline}</p>
      <div className={styles.diagram} aria-hidden="true">
        {diagram}
      </div>
      <ul className={styles.rules}>
        {rules.map((rule) => (
          <li key={rule}>
            <Icon name="check" size={16} />
            {rule}
          </li>
        ))}
      </ul>
    </article>
  );
}

function Faq({
  question,
  children,
}: {
  question: string;
  children: ReactNode;
}) {
  return (
    <details className={styles.faqItem}>
      <summary>
        {question}
        <Icon name="plus" size={18} />
      </summary>
      <p>{children}</p>
    </details>
  );
}

/* --- Diagramas: dibujos esquematicos, decorativos (el texto de al lado dice lo mismo) --- */

function Bars({ values, highlight }: { values: number[]; highlight: number }) {
  return (
    <div className={styles.bars}>
      {values.map((value, index) => (
        <span
          key={index}
          className={index === highlight ? styles.barOn : undefined}
          style={{ height: `${value}%` }}
        />
      ))}
    </div>
  );
}

function ClassicDiagram() {
  return (
    <>
      <Bars values={[25, 38, 50, 64, 80]} highlight={4} />
      <span className={styles.diagramNote}>
        +100 · +100 · +100 → gana la más alta
      </span>
    </>
  );
}

function DutchDiagram() {
  return (
    <>
      <Bars values={[90, 76, 62, 48, 34]} highlight={2} />
      <span className={styles.diagramNote}>
        <Icon name="hand" size={14} /> «¡Lo quiero!» en el tercer escalón
      </span>
    </>
  );
}

function SealedDiagram() {
  return (
    <>
      <div className={styles.envelopes}>
        {['???', '???', 'Tú', '???'].map((who, index) => (
          <span
            key={index}
            className={who === 'Tú' ? styles.envelopeMine : undefined}
          >
            <Icon name={who === 'Tú' ? 'lock' : 'mail'} size={18} />
            <small>{who}</small>
          </span>
        ))}
      </div>
      <span className={styles.diagramNote}>
        Se abren todos a la vez al cerrar
      </span>
    </>
  );
}

function MysteryDiagram() {
  return (
    <>
      <div className={styles.mysteryBox}>
        <span className={styles.mysteryQ}>?</span>
        <div className={styles.mysteryClues}>
          <span>Pista 1 · Electrónica</span>
          <span>Pista 2 · Cabe en un bolsillo</span>
          <span className={styles.locked}>
            <Icon name="lock" size={12} /> Pista 3
          </span>
        </div>
      </div>
      <span className={styles.diagramNote}>
        Solo quien gana descubre qué es
      </span>
    </>
  );
}
