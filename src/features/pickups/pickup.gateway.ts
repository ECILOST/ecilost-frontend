import type { ItemGateway } from '@/features/catalog/ports/item.gateway';
import type { LotGateway } from '@/features/lots/ports/lot.gateway';
import type { HttpClient } from '@/shared/api/http-client';

type Entry = { kind: 'ITEM' | 'LOT'; catalogId: string };

export interface Slot {
  id: string;
  location: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  available: number;
}

export interface Pickup {
  roundId: string;
  roomId: string;
  winnerId: string;
  entries: Entry[];
  title?: string;
  createdAt: string;
  status: 'PENDING' | 'BOOKED' | 'NEEDS_HELP' | 'DELIVERED';
  slot: Omit<Slot, 'available'> | null;
}

export interface Conversation extends Pickup {
  messages: Array<{ id: string; author: 'BOT' | 'WINNER' | 'STAFF'; body: string; createdAt: string }>;
}

export type SlotInput = Pick<Slot, 'location' | 'startsAt' | 'endsAt' | 'capacity'>;

export function createPickupGateway(http: HttpClient, items: ItemGateway, lots: LotGateway) {
  function path(staff: boolean, roundId?: string) {
    const base = staff ? '/pickups/staff' : '/pickups/mine';
    return roundId ? `${base}/${encodeURIComponent(roundId)}` : base;
  }

  const names = new Map<string, Promise<string>>();
  async function describe<T extends Pickup>(pickup: T): Promise<T> {
    if (!pickup.entries.length) return pickup;
    const labels = await Promise.all(pickup.entries.map(({ kind, catalogId }) => {
      const key = `${kind}:${catalogId}`;
      const existing = names.get(key);
      if (existing) return existing;
      const gateway = kind === 'LOT' ? lots : items;
      const name = gateway.findById(catalogId).then((item) => item.name).catch(() => {
        names.delete(key);
        return '';
      });
      names.set(key, name);
      return name;
    }));
    return { ...pickup, title: labels.filter(Boolean).join(' · ') || undefined };
  }

  return {
    async list(staff: boolean) {
      const pickups = await http.get<Pickup[]>(path(staff));
      return Promise.all(pickups.map(describe));
    },
    async conversation(staff: boolean, roundId: string) {
      return describe(await http.get<Conversation>(path(staff, roundId)));
    },
    slots(staff: boolean) {
      return http.get<Slot[]>(staff ? '/pickups/staff/slots' : '/pickups/slots');
    },
    createSlot(input: SlotInput) {
      return http.post('/pickups/staff/slots', input);
    },
    book(roundId: string, slotId: string) {
      return http.post(`${path(false, roundId)}/booking`, { slotId });
    },
    code(roundId: string) {
      return http.post<{ code: string }>(`${path(false, roundId)}/code`);
    },
    message(staff: boolean, roundId: string, message: string) {
      return http.post(`${path(staff, roundId)}/${staff ? 'reply' : 'help'}`, { message });
    },
    missed(roundId: string) {
      return http.post(`${path(true, roundId)}/missed`);
    },
    deliver(roundId: string, code: string) {
      return http.post(`${path(true, roundId)}/delivery`, { code });
    },
  };
}
