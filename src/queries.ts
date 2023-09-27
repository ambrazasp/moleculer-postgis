import { AllTypes, Geometry as GeometryObject, getGeometries } from 'geojsonjs';
import { isNumber } from 'lodash';

type Geometry = GeometryObject & {
  crs?: {
    type?: string;
    properties: { [key: string]: any };
  };
};

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

export function geometriesAsTextQuery(
  geometry: Geometry | Geometry[],
  srid?: number
) {
  if (Array.isArray(geometry) && geometry.length === 1) {
    geometry = geometry[0];
  }

  let result = `'${JSON.stringify(geometry)}'`;
  const multi = Array.isArray(geometry);
  if (multi) {
    result = `JSON_ARRAY_ELEMENTS(${result})`;
  }

  const applyTransform = !multi
    ? !!(geometry as Geometry).crs
    : (geometry as Geometry[]).every((g) => !!g.crs);

  result = `ST_GeomFromGeoJSON(${result})`;

  if (applyTransform && srid) {
    result = transform(result, srid);
  }

  if (multi) {
    result = `ST_Collect(ARRAY(SELECT ${result}))`;
  }

  return `ST_AsText(${result})`;
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
