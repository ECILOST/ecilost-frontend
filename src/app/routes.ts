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
  /*
   * Estatica y no `/items/:id`, asi que el router la prefiere aunque las dos encajen: el
   * ranking de react-router puntua mas alto un segmento escrito que uno con nombre. Va en
   * español como el resto de la interfaz; el identificador de un objeto nunca es "nuevo"
   * porque el servicio los emite como UUID.
   */
  newItem: '/items/nuevo',
  editItem: (id: string) => `/items/${id}/editar`,
  lots: '/lots',
  lot: (id: string) => `/lots/${id}`,
  newLot: '/lots/nuevo',
  rechargeWallet: '/wallet/recargar',
} as const;

/** Patron de ruta para el router, donde el id todavia no tiene valor. */
export const routePatterns = {
  item: '/items/:id',
  editItem: '/items/:id/editar',
  lot: '/lots/:id',
} as const;
