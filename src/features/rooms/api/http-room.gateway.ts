import type { HttpClient } from '@/shared/api/http-client';
import type {
  RoomDetail,
  RoomSummary,
  ScheduleRoomRequest,
} from '../model/room';
import type { RoomGateway } from '../ports/room.gateway';

/** Adaptador HTTP de salas, contra ecilost-auction-service. */
export function createHttpRoomGateway(http: HttpClient): RoomGateway {
  return {
    list: () => http.get<RoomSummary[]>('/rooms'),

    findById: (id: string) => http.get<RoomDetail>(`/rooms/${id}`),

    schedule: (request: ScheduleRoomRequest) =>
      http.post<RoomDetail>('/rooms', request),
  };
}
