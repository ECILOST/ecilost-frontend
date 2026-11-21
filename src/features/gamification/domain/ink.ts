/**
 * Version legible como texto de un color de acento. Los acentos del tema claro son
 * rellenos luminosos (contraste ~1.5:1 sobre crema); mezclados al 40% con la tinta superan
 * 4.5:1 (WCAG AA) y conservan el matiz.
 */
export function inkOf(color: string): string {
  return `color-mix(in srgb, ${color} 40%, var(--color-text))`;
}
