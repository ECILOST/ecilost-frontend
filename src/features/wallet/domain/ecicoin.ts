/**
 * Como se escribe una cantidad de ECICoin.
 *
 * Siempre con dos decimales, aunque sean ceros: es la moneda de la plataforma y el saldo se
 * lee para decidir si alcanza para pujar. "1.250" y "1.250,00" se leen distinto de un
 * vistazo, y el segundo no deja dudas de que no falta nada.
 */
const FORMAT = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Da formato al importe **sin convertirlo a numero**.
 *
 * `Intl.NumberFormat.format` acepta una cadena decimal y la formatea con precision exacta,
 * que es justo lo que hace falta aqui: el servicio manda `Decimal(18, 2)` como texto
 * precisamente para que nadie lo pase por un `double`. Un `Number(...)` intermedio
 * desharia esa precaucion.
 */
export function formatEcicoin(amount: string): string {
  // Un valor que no tenga forma de numero no se pinta como "NaN": se dice que no se sabe.
  if (!/^-?\d+(\.\d+)?$/.test(amount)) return '—';
  return FORMAT.format(amount as unknown as number);
}

/**
 * Cierto si la cadena es un importe positivo con dos decimales como mucho, que es lo que
 * acepta el servicio. Se comprueba sobre el texto y no sobre un `number` para que "0.005"
 * se rechace aqui en vez de redondearse a algo que el servicio no pidio.
 */
export function isValidAmount(input: string): boolean {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return false;
  return Number(trimmed) > 0;
}
