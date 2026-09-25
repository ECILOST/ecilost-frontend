import type {
  AuctionableKind,
  RoomStatus,
  RoundStatus,
} from '../domain/room-status';

/**
 * Contratos de salas de ecilost-auction-service (HU-15), tal como viajan por la red.
 *
 * Los importes son **cadenas**: el servicio los guarda como `Decimal(18, 2)` y Prisma los
 * serializa como texto. Se muestran con `formatEcicoin`, sin pasarlos por un `number`.
 */

/** Una fila de `GET /rooms`. */
export interface RoomSummary {
  id: string;
  name: string;
  status: RoomStatus;
  startsAt: string;
  maximumCapacity: number;
  /** Estudiantes ya registrados. Nunca supera `maximumCapacity` (HU-16). */
  admittedCount: number;
  createdAt: string;
  roundCount: number;
  /** Si quien consulta ya esta registrado. Para el funcionario siempre es `false`. */
  isParticipant: boolean;
}

/**
 * Lo que va en una ronda. Solo el tipo y el identificador del catalogo: auction no guarda el
 * nombre para no desincronizarse, asi que la pantalla lo pide a catalog.
 */
export interface RoundEntry {
  kind: AuctionableKind;
  catalogId: string;
}

export interface RoundDetail {
  id: string;
  /** Orden en la sala, desde 1. */
  position: number;
  status: RoundStatus;
  /** Precio minimo que fijo el funcionario: la primera puja debe alcanzarlo. */
  startingPrice: string;
  /** Arranca en `startingPrice` y sube con cada puja aceptada. */
  currentPrice: string;
  startedAt: string | null;
  endsAt: string | null;
  maximumEndsAt: string | null;
  entries: RoundEntry[];
}

/** `GET /rooms/:id`: la sala con sus rondas en orden. */
export interface RoomDetail extends Omit<RoomSummary, 'roundCount'> {
  rounds: RoundDetail[];
}

export const ROOM_NAME_MAX = 80;

/** Cuerpo de `POST /rooms`. Operacion de funcionario. */
export interface ScheduleRoomRequest {
  name: string;
  maximumCapacity: number;
  /** ISO 8601. La sala se abre sola a esta hora y cierra el registro (HU-17). */
  startsAt: string;
  rounds: Array<{
    /**
     * El servicio admite varias entradas por ronda, pero la pantalla pone una sola: la sala
     * cambia de objeto en cada ronda, como la describe el deck.
     */
    entries: RoundEntry[];
    /** Entero: un ECICoin vale un peso colombiano. */
    startingPrice: number;
  }>;
}
