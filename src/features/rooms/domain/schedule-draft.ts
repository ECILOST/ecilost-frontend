import { isValidAmount } from '@/features/wallet/domain/ecicoin';
import { parseBogotaLocal } from '@/shared/format/date';
import { ROOM_NAME_MAX, type RoundEntry, type ScheduleRoomRequest } from '../model/room';

/**
 * El formulario de programar sala tal como lo escribe el funcionario: todo texto, porque asi
 * llega de los controles. Se convierte a la peticion solo cuando pasa las reglas.
 */
export interface RoundDraft {
  /** Identificador local de la fila, estable al quitar rondas de en medio. */
  id: string;
  /** `KIND:catalogId` de la opcion elegida, o vacio. */
  entry: string;
  /** Precio minimo en ECICoin, tal como se escribio. */
  startingPrice: string;
  /** Precio de compra inmediata (HU-24), opcional: vacio si la ronda no la ofrece. */
  buyNowPrice?: string;
}

export interface ScheduleDraft {
  name: string;
  /** Valor de un `<input type="datetime-local">`, sin zona: se lee como hora de Bogota. */
  startsAt: string;
  capacity: string;
  rounds: RoundDraft[];
  /** Subastas dinamicas: activar la ruleta de modalidades desde que se programa. */
  dynamicModes?: boolean;
}

export interface ScheduleErrors {
  name?: string;
  startsAt?: string;
  capacity?: string;
  rounds: Record<string, RoundErrors>;
}

type RoundErrors = { entry?: string; startingPrice?: string; buyNowPrice?: string };

export const hasErrors = (errors: ScheduleErrors): boolean =>
  Boolean(errors.name || errors.startsAt || errors.capacity) ||
  Object.keys(errors.rounds).length > 0;

/**
 * Las mismas reglas que aplica ecilost-auction-service, comprobadas antes de enviar para no
 * gastar una reserva en catalog en una peticion que el servicio va a rechazar.
 *
 * La hora de inicio tiene que ser futura aunque el servicio no lo exija: una sala que nace
 * con la hora pasada se abre en el acto y cierra el registro antes de que nadie entre.
 */
export function validateDraft(draft: ScheduleDraft, now = new Date()): ScheduleErrors {
  const errors: ScheduleErrors = { rounds: {} };

  const name = draft.name.trim();
  if (!name) errors.name = 'Ponle un nombre a la sala.';
  else if (name.length > ROOM_NAME_MAX)
    errors.name = `El nombre admite ${ROOM_NAME_MAX} caracteres como máximo.`;

  const startsAt = parseBogotaLocal(draft.startsAt);
  if (!draft.startsAt || Number.isNaN(startsAt.getTime()))
    errors.startsAt = 'Indica la fecha y la hora de inicio.';
  else if (startsAt.getTime() <= now.getTime())
    errors.startsAt = 'La sala tiene que empezar en el futuro.';

  if (!/^\d+$/.test(draft.capacity.trim()) || Number(draft.capacity) < 1)
    errors.capacity = 'El aforo es un número entero mayor que cero.';

  const used = new Set<string>();
  for (const round of draft.rounds) {
    const roundErrors: RoundErrors = {};

    if (!round.entry) roundErrors.entry = 'Elige un objeto o un lote.';
    else if (used.has(round.entry))
      roundErrors.entry = 'Ya está en otra ronda de esta sala.';
    used.add(round.entry);

    if (!isValidAmount(round.startingPrice))
      roundErrors.startingPrice =
        'Escribe un precio entero mayor que cero, sin centavos.';

    // Como en el servicio: entero, y mayor que el minimo para que comprar no salga mas
    // barato que pujar.
    const buyNow = round.buyNowPrice?.trim() ?? '';
    if (buyNow && !isValidAmount(buyNow))
      roundErrors.buyNowPrice = 'Escribe un precio entero mayor que cero, sin centavos.';
    else if (buyNow && isValidAmount(round.startingPrice) && Number(buyNow) <= Number(round.startingPrice.trim()))
      roundErrors.buyNowPrice = 'Tiene que ser mayor que el precio mínimo.';

    if (roundErrors.entry || roundErrors.startingPrice || roundErrors.buyNowPrice)
      errors.rounds[round.id] = roundErrors;
  }

  return errors;
}

/** Convierte un borrador ya validado en el cuerpo de `POST /rooms`. */
export function toScheduleRequest(draft: ScheduleDraft): ScheduleRoomRequest {
  return {
    name: draft.name.trim(),
    maximumCapacity: Number(draft.capacity.trim()),
    startsAt: parseBogotaLocal(draft.startsAt).toISOString(),
    rounds: draft.rounds.map((round) => ({
      entries: [parseEntry(round.entry)],
      startingPrice: Number(round.startingPrice.trim()),
      // Solo viaja si se escribio: sin el campo, la ronda no ofrece compra inmediata.
      ...(round.buyNowPrice?.trim() ? { buyNowPrice: Number(round.buyNowPrice.trim()) } : {}),
    })),
    // Solo se manda si se activo: un servicio anterior no conoce el campo y lo rechazaria.
    ...(draft.dynamicModes ? { dynamicModes: true } : {}),
  };
}

function parseEntry(key: string): RoundEntry {
  const [kind, catalogId] = key.split(':');
  return { kind: kind as RoundEntry['kind'], catalogId };
}
