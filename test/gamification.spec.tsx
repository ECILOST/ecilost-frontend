import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  createHttpGamificationGateway,
  toLeaderboard,
  toProfile,
} from '@/features/gamification/api/http-gamification.gateway';
import { createDemoGamificationGateway } from '@/features/gamification/api/demo-gamification.gateway';
import {
  toMedalIds,
  winsToPodium,
} from '@/features/gamification/domain/medals';
import type { HttpClient } from '@/shared/api/http-client';
import { ApiError, ProblemType } from '@/shared/api/problem-details';
import {
  STAFF,
  STUDENT,
  createFakeAuthGateway,
  createFakeWalletGateway,
  createTestContainer,
  walletFixture,
} from './helpers/fake-gateways';
import { renderApp } from './helpers/render-app';

/**
 * Perfil, top semanal y medallas.
 *
 * Lo que se fija aqui: que el perfil y el top se leen del modelo de lectura de engagement y
 * dicen de cuando son (consistencia eventual), que lo que llega por la red se filtra antes
 * de pintarse (medallas desconocidas, cifras como texto) y que las medallas se ven junto al
 * alias en la sala, tanto en las pujas como en el chat.
 */

function student() {
  return createTestContainer({
    auth: createFakeAuthGateway(STUDENT),
    wallet: createFakeWalletGateway({
      wallet: walletFixture({ availableBalance: '950.00' }),
    }),
  });
}

const sectionOf = async (name: string) =>
  within(
    (await screen.findByRole('heading', { name })).closest(
      'section',
    ) as HTMLElement,
  );

describe('Mi perfil', () => {
  it('muestra estadisticas, medallas logradas y en progreso, y las ultimas subastas', async () => {
    renderApp({ route: '/mi-perfil', container: student() });

    expect(
      await screen.findByRole('heading', { name: 'buho-nocturno' }),
    ).toBeInTheDocument();
    expect(screen.getByText('87')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();

    const medals = await sectionOf('Medallas');
    expect(medals.getByText('Rey de la holandesa')).toBeInTheDocument();
    // Una bloqueada muestra cuanto le falta, como barra accesible.
    expect(
      medals.getByRole('progressbar', { name: 'Avance de Detective' }),
    ).toHaveAttribute('aria-valuenow', '1');

    const recent = await sectionOf('Últimas subastas');
    expect(recent.getByText('Calculadora Casio fx-991')).toBeInTheDocument();
    expect(recent.getAllByText('Ganada').length).toBeGreaterThan(0);

    // Es un modelo de lectura: la pantalla dice de cuando es lo que muestra.
    expect(screen.getByText(/actualizado hace/i)).toBeInTheDocument();
  });

  it('el puesto del top lleva al ranking', async () => {
    renderApp({ route: '/mi-perfil', container: student() });

    const link = await screen.findByRole('link', { name: /top de la semana/i });
    expect(link).toHaveAttribute('href', '/top-semanal');
  });

  it('el funcionario no tiene perfil de postor', async () => {
    renderApp({
      route: '/mi-perfil',
      container: createTestContainer({ auth: createFakeAuthGateway(STAFF) }),
    });

    expect(
      screen.queryByRole('heading', { name: 'buho-nocturno' }),
    ).not.toBeInTheDocument();
  });
});

describe('Top semanal', () => {
  it('muestra el podio y la tabla, con la fila propia marcada', async () => {
    renderApp({ route: '/top-semanal', container: student() });

    expect(
      await screen.findByRole('heading', { name: /top de la semana/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText('gata-lunar')).toBeInTheDocument();

    const mine = (await screen.findByText('buho-nocturno')).closest(
      'li, tr',
    ) as HTMLElement;
    expect(within(mine).getByText('Tú')).toBeInTheDocument();
    // Falta una victoria mas que el tercero (4 victorias) para el podio.
    expect(screen.getByText(/te falta/i)).toBeInTheDocument();
  });

  it('cambia a la semana pasada sin perder la pantalla', async () => {
    const user = userEvent.setup();
    renderApp({ route: '/top-semanal', container: student() });

    await screen.findByText('gata-lunar');
    await user.click(screen.getByRole('button', { name: 'Semana pasada' }));

    expect(
      screen.getByRole('button', { name: 'Semana pasada' }),
    ).toHaveAttribute('aria-pressed', 'true');
    // La semana pasada el estudiante quedo en el podio: ya no hay aviso de lo que falta.
    expect(await screen.findByText('lobo-andino')).toBeInTheDocument();
    expect(screen.queryByText(/te falta/i)).not.toBeInTheDocument();
  });
});

describe('Medallas en la sala', () => {
  it('se ven junto al alias en las pujas recientes y en el chat', async () => {
    renderApp({ route: '/salas/sala-04', container: student() });

    const chat = await sectionOf('Chat de la sala');
    const greeting = (await chat.findByText('¡Suerte a todos!')).closest(
      'li',
    ) as HTMLElement;
    // Para el lector de pantalla la medalla se nombra; para el raton va en el tooltip.
    expect(
      within(greeting).getByText(/medalla: top 3 semanal/i),
    ).toBeInTheDocument();
    expect(greeting.querySelector('[title^="Top 3 semanal"]')).not.toBeNull();

    const bids = await sectionOf('Pujas recientes');
    expect(bids.queryAllByText(/^medallas?:/i).length).toBeGreaterThan(0);
  });
});

describe('Contrato con engagement', () => {
  const profileWire = {
    alias: 'buho-nocturno',
    stats: {
      bids: 10,
      wins: 2,
      spent: '350.50',
      streakWeeks: 1,
      favoriteMode: 'DUTCH',
    },
    weeklyRank: null,
    medals: [
      {
        id: 'FIRST_WIN',
        unlockedAt: '2026-11-01T00:00:00Z',
        progress: 1,
        goal: 1,
      },
      { id: 'MEDALLA_DEL_FUTURO', unlockedAt: null, progress: 0, goal: 1 },
      { id: 'DETECTIVE', unlockedAt: null, progress: 9, goal: 3 },
    ],
    modes: [
      { mode: 'DUTCH', played: 4, won: 2 },
      { mode: 'OTRA', played: 1, won: 0 },
    ],
    recent: [],
    updatedAt: '2026-11-07T00:00:00Z',
  };

  it('el perfil ignora medallas y modalidades que el front no conoce y acota el avance', () => {
    const profile = toProfile(profileWire);

    expect(profile.spent).toBe(351);
    expect(profile.favoriteModeBids).toBe(0);
    expect(profile.medals.map((medal) => medal.id)).toEqual([
      'FIRST_WIN',
      'DETECTIVE',
    ]);
    expect(profile.medals[1].progress).toBe(3);
    expect(profile.modes).toEqual([{ mode: 'DUTCH', played: 4, won: 2 }]);
  });

  it('el top ordena por puesto y marca a quien mira', () => {
    const board = toLeaderboard({
      week: 'current',
      from: '2026-11-02',
      to: '2026-11-08',
      entries: [
        {
          rank: 2,
          alias: 'b',
          wins: 3,
          bids: 5,
          spent: '10',
          favoriteMode: null,
        },
        {
          rank: 1,
          alias: 'a',
          wins: 4,
          bids: 6,
          spent: 20,
          favoriteMode: 'SEALED',
          badges: ['PERFECT_SEAL', 'NUEVA', 'PERFECT_SEAL'],
        },
      ],
      me: {
        rank: 9,
        alias: 'yo',
        wins: 1,
        bids: 2,
        spent: 3,
        favoriteMode: null,
      },
      updatedAt: '2026-11-07T00:00:00Z',
    });

    expect(board.entries.map((entry) => entry.alias)).toEqual(['a', 'b']);
    expect(board.entries[0].badges).toEqual(['PERFECT_SEAL']);
    expect(board.me?.mine).toBe(true);
  });

  it('un estudiante sin actividad recibe un perfil en cero, no un error', async () => {
    const http = {
      get: () =>
        Promise.reject(
          new ApiError({
            status: 404,
            type: ProblemType.NOT_FOUND,
            title: 'Not Found',
          }),
        ),
    } as unknown as HttpClient;

    const profile = await createHttpGamificationGateway(http).myProfile();
    expect(profile.wins).toBe(0);
    expect(profile.medals).toEqual([]);
  });

  it('el nombre y la foto de las ultimas subastas se piden a catalog, como en la sala', async () => {
    const wire = {
      ...profileWire,
      recent: [
        {
          roundId: 'r1',
          roomId: 'room',
          entry: { kind: 'ITEM', catalogId: 'item-1' },
          mode: 'DUTCH',
          amount: '180.00',
          result: 'WON',
          at: '2026-11-04T15:00:00Z',
        },
        {
          roundId: 'r2',
          roomId: 'room',
          entry: { kind: 'LOT', catalogId: 'lot-1' },
          mode: 'SEALED',
          amount: '95.00',
          result: 'LOST',
          at: '2026-11-03T15:00:00Z',
        },
      ],
    };
    const http = { get: () => Promise.resolve(wire) } as unknown as HttpClient;
    const catalog = {
      items: {
        findById: () =>
          Promise.resolve({
            name: 'Calculadora Casio',
            photos: [{ url: 'https://foto' }],
          }),
      },
      // Catalog falla con el lote: queda con el nombre generico y el perfil se ve igual.
      lots: { findById: () => Promise.reject(new Error('caido')) },
    };

    const profile = await createHttpGamificationGateway(
      http,
      catalog as never,
    ).myProfile();
    expect(
      profile.recent.map((auction) => [auction.itemName, auction.imageUrl]),
    ).toEqual([
      ['Calculadora Casio', 'https://foto'],
      ['Lote del catálogo', null],
    ]);
    expect(profile.recent[0].amount).toBe(180);
  });

  it('las insignias de la sala son a lo sumo dos y solo conocidas', () => {
    expect(toMedalIds(['DUTCH_KING', 'X', 'STREAK_3', 'FIRST_WIN'])).toEqual([
      'DUTCH_KING',
      'STREAK_3',
    ]);
    expect(toMedalIds('DUTCH_KING')).toEqual([]);
  });

  it('cuenta las victorias que faltan para el podio', async () => {
    const board = await createDemoGamificationGateway().leaderboard('current');
    expect(winsToPodium(board.entries, board.me)).toBe(2);
  });
});
