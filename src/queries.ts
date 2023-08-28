import { AllTypes, Geometry, getGeometries } from 'geojsonjs';
import { isNumber } from 'lodash';

const defaultField = '"geom"';
function transform(field: string, srid?: number) {
  if (!srid) return field;
  return `ST_Transform(${field || defaultField}, ${srid})`;
}

export function areaQuery(field: string, as?: string, srid?: number) {
  field = transform(field, srid);
  const value = `ROUND(ST_Area(${field}))`;
  return `${value} as ${as || 'area'}`;
}

export function distanceQuery(
  field1: string,
  field2: string,
  as?: string,
  srid?: number
) {
  field1 = transform(field1, srid);
  field2 = transform(field2, srid);
  return `ROUND(ST_Distance(${field1}, ${field2})) as ${as || 'distance'}`;
}

export function asGeoJsonQuery(
  field: string,
  as?: string,
  srid?: number,
  opts?: {
    digits: number;
    options: number;
  }
) {
  const transformedField = transform(field, srid);
  let query = `${transformedField}`;
  if (isNumber(opts?.digits) && isNumber(opts?.options)) {
    query = `${query}, ${opts.digits}, ${opts.options}`;
  }
  return `ST_AsGeoJSON(${query})::json as ${as || field}`;
}

export function geometriesAsTextQuery(geometry: Geometry | Geometry[]) {
  if (Array.isArray(geometry) && geometry.length === 1) {
    geometry = geometry[0];
  }

  if (!Array.isArray(geometry)) {
    return `ST_AsText(ST_GeomFromGeoJSON('${JSON.stringify(geometry)}'))`;
  }

  return `ST_AsText(ST_Collect(ARRAY(
    SELECT ST_GeomFromGeoJSON(JSON_ARRAY_ELEMENTS('${JSON.stringify(
      geometry
    )}'))
  )))`;
}

export function geomFromText(text: string, srid?: number) {
  if (!srid) return `ST_GeomFromText(${text})`;
  return `ST_GeomFromText(${text}, ${srid})`;
}

export function intersectsQuery(field: string, geom: AllTypes, srid?: number) {
  const geometries = getGeometries(geom);

  if (!geometries.length) return;
  field = transform(field, srid);

  const query = geometriesAsTextQuery(geometries);

  const field2 = geomFromText(query, srid);
  return `ST_intersects(${field || defaultField}, ${field2 || defaultField})`;
}
