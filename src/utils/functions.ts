export type GenericObject<T> = { [key: string]: T };

export function parseToJsonIfNeeded(
  query: GenericObject<any> | string
): GenericObject<any> {
  if (!query) return;

  if (typeof query === 'string') {
    try {
      query = JSON.parse(query);
    } catch (err) {}
  }

  return query as GenericObject<any>;
}
