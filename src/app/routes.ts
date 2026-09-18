/**
 * Las rutas viven en un solo sitio porque no solo las usa el router: los guards redirigen
 * a `login`, y `rooms` es la direccion que ecilost-auth-service tiene configurada en
 * POST_LOGIN_REDIRECT_URL. Escrita a mano en cada archivo, renombrar una seria cazar
 * cadenas sueltas.
 */
export const routes = {
  login: '/login',
  rooms: '/rooms',
  items: '/items',
  item: (id: string) => `/items/${id}`,
} as const;

/** Patron de ruta para el router, donde el id todavia no tiene valor. */
export const routePatterns = {
  item: '/items/:id',
} as const;
