import { useEffect, useRef, useState } from 'react';
import { useOnline } from '@/shared/hooks/use-online';
import { Icon } from '../ui/icon';
import styles from './offline-banner.module.css';

/**
 * Aviso global de "sin conexion", justo debajo de la barra superior.
 *
 * Avisa sin bloquear: lo que ya esta en pantalla se puede seguir leyendo, y cada accion que
 * necesita red explica por su lado que no se puede hacer ahora. Al volver la conexion se
 * confirma durante unos segundos y luego desaparece solo, porque la buena noticia no exige
 * hacer nada. React Query reintenta las consultas al recuperar la red, asi que no hace falta
 * un boton de recargar.
 */
export function OfflineBanner() {
  const online = useOnline();
  const wasOffline = useRef(false);
  const [backOnline, setBackOnline] = useState(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setBackOnline(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setBackOnline(true);
    const timer = window.setTimeout(() => setBackOnline(false), 5000);
    return () => window.clearTimeout(timer);
  }, [online]);

  return (
    // La region existe siempre (vacia cuando no hay nada que decir): un `role="status"` que
    // aparece de golpe con texto dentro no lo anuncian todos los lectores de pantalla.
    <div className={styles.region} role="status">
      {!online ? (
        <p className={`${styles.banner} ${styles.offline}`}>
          <Icon name="wifiOff" size={18} />
          <span>
            <strong>Sin conexión.</strong> Puedes seguir mirando lo que ya
            cargó; lo demás se actualizará cuando vuelva el internet.
          </span>
        </p>
      ) : backOnline ? (
        <p className={`${styles.banner} ${styles.online}`}>
          <Icon name="check" size={18} />
          <span>Volviste a tener conexión.</span>
        </p>
      ) : null}
    </div>
  );
}
