/**
 * Como se escribe una cantidad de ECICoin.
 *
 * Un ECICoin vale lo mismo que un peso colombiano, y como el peso se escribe sin centavos:
 * "1.250.000" se lee de un vistazo, y dos ceros decimales que nunca cambian solo estorban.
 * Los servicios siguen guardando `Decimal(18, 2)`, pero ya no aceptan fracciones.
 */
const FORMAT = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
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
 * Cierto si la cadena es un importe entero y positivo, que es lo que aceptan los servicios.
 * Se comprueba sobre el texto y no sobre un `number` para que "1500.5" se rechace aqui en
 * vez de redondearse a algo que nadie pidio.
 */
export function isValidAmount(input: string): boolean {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return false;

  return Number(trimmed) > 0;
}
