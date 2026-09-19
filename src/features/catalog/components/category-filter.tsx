import { FilterPills, type FilterOption } from './filter-pills';

/**
 * Filtro por categoria.
 *
 * Las opciones no vienen de ningun endpoint porque no existe: el servicio filtra por
 * categoria exacta pero no publica cuales hay. Se arman con las que traen los objetos ya
 * cargados, que alcanza porque la primera consulta del catalogo siempre sale sin filtros.
 *
 * Con mas de una pagina de objetos puede faltar alguna categoria hasta que se cargue la
 * pagina donde aparece. Es una limitacion conocida y se corrige sola al seguir cargando; lo
 * que la cerraria del todo es que el catalogo publicara sus categorias.
 */
export function CategoryFilter({
  value,
  categories,
  onChange,
}: {
  value: string;
  categories: string[];
  onChange: (value: string) => void;
}) {
  // Con una sola categoria el filtro no decide nada: seria un control que no lleva a
  // ninguna parte, igual que una fila de miniaturas con una sola fotografia.
  if (categories.length < 2) return null;

  const options: FilterOption<string>[] = [
    { value: '', label: 'Todas' },
    ...categories.map((category) => ({ value: category, label: category })),
  ];

  return (
    <FilterPills
      legend="Filtrar por categoría"
      name="categoria"
      value={value}
      options={options}
      onChange={onChange}
    />
  );
}
