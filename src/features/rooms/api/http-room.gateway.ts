import type { HttpClient } from '@/shared/api/http-client';
import type {
  RoomDetail,
  RoomSummary,
  ScheduleRoomRequest,
  SpinResult,
} from '../model/room';
import type { RoomGateway } from '../ports/room.gateway';

/** Adaptador HTTP de salas, contra ecilost-auction-service. */
export function createHttpRoomGateway(http: HttpClient): RoomGateway {
  return {
    list: () => http.get<RoomSummary[]>('/rooms'),

    findById: (id: string) => http.get<RoomDetail>(`/rooms/${id}`),

    schedule: (request: ScheduleRoomRequest) =>
      http.post<RoomDetail>('/rooms', request),

    setDynamicModes: async (roomId: string, enabled: boolean) => {
      await http.patch(`/rooms/${roomId}/dynamic-modes`, { enabled });
    },

    spin: (roomId: string, roundId: string) =>
      http.post<SpinResult>(`/rooms/${roomId}/rounds/${roundId}/spin`),
  };
}
