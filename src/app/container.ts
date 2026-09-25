import { config, type AppConfig } from '@/config/env';
import { createDemoAuctionGateway } from '@/features/auctions/api/demo-auction.gateway';
import { createHttpAuctionGateway } from '@/features/auctions/api/http-auction.gateway';
import { createSocketRealtimeChannel } from '@/features/auctions/api/realtime-channel';
import type { AuctionGateway } from '@/features/auctions/ports/auction.gateway';
import { createHttpAuthGateway } from '@/features/auth/api/http-auth.gateway';
import type { AuthGateway } from '@/features/auth/ports/auth.gateway';
import { createHttpItemGateway } from '@/features/catalog/api/http-item.gateway';
import type { ItemGateway } from '@/features/catalog/ports/item.gateway';
import { createHttpLotGateway } from '@/features/lots/api/http-lot.gateway';
import type { LotGateway } from '@/features/lots/ports/lot.gateway';
import { createHttpMediaGateway } from '@/features/media/api/http-media.gateway';
import { createHttpWalletGateway } from '@/features/wallet/api/http-wallet.gateway';
import type { WalletGateway } from '@/features/wallet/ports/wallet.gateway';
import type { MediaGateway } from '@/features/media/ports/media.gateway';
import { createHttpRoomGateway } from '@/features/rooms/api/http-room.gateway';
import type { RoomGateway } from '@/features/rooms/ports/room.gateway';
import { createHttpClient } from '@/shared/api/http-client';
import {
  createSessionChannel,
  type SessionChannel,
} from '@/shared/api/session-channel';
import { createTokenStore, type TokenStore } from '@/shared/api/token-store';

/**
 * Las dependencias de la aplicacion ya resueltas. Es el equivalente de `app.module.ts`: el
 * unico sitio donde se decide que implementacion recibe cada puerto.
 *
 * Que este armado en un solo archivo es lo que permite que una prueba monte la aplicacion
 * entera con dobles, cambiando este objeto y nada mas.
 */
export interface Container {
  tokens: TokenStore;
  /** Por donde avisa el cliente HTTP de que la sesion dejo de valer. */
  sessionLost: SessionChannel;
  auth: AuthGateway;
  items: ItemGateway;
  lots: LotGateway;
  media: MediaGateway;
  wallet: WalletGateway;
  /**
   * Salas, pujas y notificaciones de quien puja. Contra ecilost-auction-service
   * (`createHttpAuctionGateway`), o en memoria (`createDemoAuctionGateway`) con
   * `VITE_AUCTIONS_DEMO=true`. El canal en vivo y la bandeja vienen de
   * ecilost-engagement-service.
   */
  auctions: AuctionGateway;
  /** Programacion de salas por el funcionario, ya contra ecilost-auction-service. */
  rooms: RoomGateway;
}

export function createContainer(appConfig: AppConfig = config): Container {
  const tokens = createTokenStore();
  const sessionLost = createSessionChannel();

  const credentials = {
    getAccessToken: tokens.get,
    onUnauthenticated: sessionLost.emit,
  };

  // Un cliente por servicio: cada uno tiene su base, y asi una pantalla no puede pedirle
  // a catalog una ruta de auth por descuido.
  const authHttp = createHttpClient({
    baseUrl: appConfig.services.auth,
    ...credentials,
  });
  const catalogHttp = createHttpClient({
    baseUrl: appConfig.services.catalog,
    ...credentials,
  });
  /*
   * La billetera lleva el token pero NO avisa de que la sesion se perdio.
   *
   * Un 401 suyo no significa lo mismo que uno de auth o de catalog: puede venir de que su
   * JWKS este mal configurada o de que no alcance al emisor, y entonces cerraria una sesion
   * que los otros dos servicios estan aceptando sin problema. El saldo es informacion
   * auxiliar; si falla, se deja de ver, pero nadie se queda fuera del catalogo por eso.
   */
  const walletHttp = createHttpClient({
    baseUrl: appConfig.services.wallet,
    getAccessToken: tokens.get,
  });
  // Auction verifica el token igual que catalog, contra la misma JWKS: su 401 si significa
  // que la sesion ya no vale.
  const auctionHttp = createHttpClient({
    baseUrl: appConfig.services.auction,
    ...credentials,
  });
  // Engagement tambien verifica contra la misma JWKS: su 401 significa sesion vencida.
  const engagementHttp = createHttpClient({
    baseUrl: appConfig.services.engagement,
    ...credentials,
  });

  // Las subastas reales piden a catalog el nombre y la foto de cada ronda, con los mismos
  // adaptadores que el resto de la aplicacion.
  const itemGateway = createHttpItemGateway(catalogHttp);
  const lotGateway = createHttpLotGateway(catalogHttp);

  return {
    tokens,
    sessionLost,
    auth: createHttpAuthGateway(authHttp),
    items: itemGateway,
    lots: lotGateway,
    media: createHttpMediaGateway(catalogHttp),
    wallet: createHttpWalletGateway(walletHttp),
    auctions: appConfig.auctionsDemo
      ? createDemoAuctionGateway({ latencyMs: 150 })
      : createHttpAuctionGateway({
          http: auctionHttp,
          items: itemGateway,
          lots: lotGateway,
          engagement: engagementHttp,
          realtime: createSocketRealtimeChannel({
            url: appConfig.services.realtime,
            getToken: tokens.get,
          }),
        }),
    rooms: createHttpRoomGateway(auctionHttp),
  };
}
