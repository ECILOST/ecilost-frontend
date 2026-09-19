import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Notice } from './ui/notice';

/** Lo que una pantalla le deja dicho a la siguiente. */
export interface FlashState {
  flash?: string;
}

/** Estado de navegacion con un aviso dentro, para pasarselo a `navigate`. */
export function flash(message: string): FlashState {
  return { flash: message };
}

/**
 * Confirmacion de que la escritura salio bien, en la pantalla a la que se llega despues.
 *
 * Despues de escribir, la aplicacion navega: registrar lleva a la ficha del objeto nuevo,
 * editar vuelve a la ficha y borrar vuelve al catalogo. Esa navegacion ya es media
 * confirmacion, pero solo media: "estoy en la ficha" no distingue entre "se guardo" y "no
 * se guardo y volvi". El aviso viaja con la navegacion, en el estado de la ruta, y por eso
 * no hace falta un proveedor global para algo que dura una pantalla.
 *
 * `role="status"` y no `alert`: es una buena noticia, y no tiene por que interrumpir lo que
 * el lector de pantalla estuviera anunciando.
 */
export function Flash() {
  const location = useLocation();
  const navigate = useNavigate();
  const arriving = (location.state as FlashState | null)?.flash ?? null;
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!arriving) return;

    // Se copia al estado propio y se limpia el del historial en el mismo paso: asi recargar
    // la pagina no vuelve a anunciar algo que ya paso, y el mensaje sigue en pantalla
    // porque quien lo pinta ya no es la ruta.
    setMessage(arriving);
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: null,
    });
  }, [arriving, navigate, location.pathname, location.search]);

  if (!message) return null;

  return <Notice tone="success" live="status" title={message} />;
}
