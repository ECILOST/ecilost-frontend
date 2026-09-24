import styles from './toggle.module.css';

/** Interruptor del diseño (puja automatica). Es un `switch` real, no un div pulsable. */
export function Toggle({
  checked,
  onChange,
  label,
  tone = 'cyan',
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Nombre accesible: el texto visible va al lado y lo pone quien lo usa. */
  label: string;
  tone?: 'cyan' | 'pink';
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={[styles.toggle, checked ? styles.on : '', styles[tone]].join(
        ' ',
      )}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.knob} aria-hidden="true" />
    </button>
  );
}
