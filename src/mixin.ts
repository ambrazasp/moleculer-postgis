import { Context } from 'moleculer';
import * as GeoJSON from 'geojsonjs';
import { GenericObject, parseToJsonIfNeeded } from './utils';
import {
  areaQuery,
  asGeoJsonQuery,
  intersectsQuery,
  geometriesAsTextQuery,
} from './queries';
import { merge } from 'lodash';

export function PostgisMixin(opts?: { srid: number }) {
  opts = merge(opts || {}, { srid: 3346 });
  function _getPropertiesFromFeatureCollection(
    geom: GeoJSON.FeatureCollection,
    property?: string
  ) {
    if (!geom) return;
    const properties: GenericObject<any>[] = GeoJSON.getFeatures(geom)
      .map((feature) => feature.properties)
      .filter((p) => !!p);

    if (property) {
      return properties.map((p) => p[property]).filter((p) => !!p);
    }

    return properties;
  }

  async function _applyGeomFilterFunction(
    ctx: Context<{ query: { [key: string]: any } }>
  ) {
    ctx.params.query = parseToJsonIfNeeded(ctx.params.query);

    if (!ctx.params?.query) {
      return ctx;
    }

    for (const key of Object.keys(ctx.params.query)) {
      if (this.settings?.fields?.[key]?._geomFilterFn) {
        const field = this.settings.fields[key];
        if (typeof field._geomFilterFn === 'function') {
          ctx.params.query[key] = await field._geomFilterFn({
            value: ctx.params.query[key],
            field: field,
            query: ctx.params.query,
          });
        }
      }
    }

    return ctx;
  }

  async function _getFeatureCollectionFromGeom(
    ctx: Context<{
      id: number | number[];
      field?: string;
      properties?: string[] | GenericObject<string>;
    }>
  ): Promise<GeoJSON.FeatureCollection> {
    const adapter = await this.getAdapter(ctx);
    const table = adapter.getTable();

    const { id, field } = ctx.params;
    let { properties } = ctx.params;
    const multi = Array.isArray(id);
    const query = table.select(
      'id',
      table.client.raw(
        asGeoJsonQuery(field, 'geom', opts.srid, {
          digits: 0,
          options: 0,
        })
      )
    );

    if (Array.isArray(properties)) {
      properties = properties.reduce(
        (acc: any, p: string) => ({ ...acc, [p]: p }),
        {} as any
      ) as GenericObject<string>;
    }

    if (properties) {
      Object.keys(properties).forEach((key) => {
        table.select(`${(properties as GenericObject<string>)[key]} as ${key}`);
      });
    }

    query[multi ? 'whereIn' : 'where']('id', id);

    const res: any[] = await query;

    const result = res.reduce((acc: { [key: string]: any }, item) => {
      let itemProperties: any = null;
      if (properties && Object.keys(properties).length) {
        itemProperties = Object.keys(properties).reduce(
          (acc: any, key) => ({
            ...acc,
            [key]: item[key],
          }),
          {}
        );
      }

      acc[`${item.id}`] = GeoJSON.parse({
        ...item.geom,
        properties: itemProperties,
      });
      return acc;
    }, {});

    if (!multi) return result[`${id}`];
    return result;
  }

  async function _getGeometryArea(
    ctx: Context<{
      id: number | number[];
      field?: string;
      asField?: string;
    }>
  ) {
    const adapter = await this.getAdapter(ctx);
    const table = adapter.getTable();

    const { id, field, asField } = ctx.params;
    const multi = Array.isArray(id);

    const query = table.select(
      'id',
      table.client.raw(areaQuery(field, asField || 'area', opts.srid))
    );

    query[multi ? 'whereIn' : 'where']('id', id);

    const res: any[] = await query;

    const result = res.reduce((acc: { [key: string]: any }, item) => {
      acc[`${item.id}`] = Number(Number(item.area).toFixed(2));
      return acc;
    }, {});

    if (!multi) return result[`${id}`];
    return result;
  }

  async function parseGeom(ctx: Context, geom: GeoJSON.FeatureCollection) {
    if (!geom) return;

    const result = GeoJSON.validate(geom);
    if (!result.valid) return;

    const adapter = await this.getAdapter(ctx);
    const geometries = GeoJSON.getGeometries(geom);

    const data = await adapter.client
      .select(
        adapter.client.raw(`${geometriesAsTextQuery(geometries)} as geom`)
      )
      .first();

    return { geom: data?.geom };
  }

  async function setGeomFn({ ctx, value }: any) {
    const result = await this.parseGeom(ctx, value);

    if (!result?.geom) return;
    return result.geom;
  }

  function populateFn(field: GenericObject<any>, key: string) {
    return {
      keyField: 'id',
      action: `${this.name}._getFeatureCollectionFromGeom`,
      params: {
        properties: field.geom?.properties,
        field: field.columnName || key,
      },
    };
  }

  function populateAreaFn(field: GenericObject<any>, key: string) {
    return {
      keyField: 'id',
      action: `${this.name}._getGeometryArea`,
      params: {
        field: field.geom.field || key,
        asField: key,
      },
    };
  }

  function geomFilterFn({ value, field }: any) {
    const query = intersectsQuery(
      field.columnName || field.name,
      parseToJsonIfNeeded(value) as any,
      opts.srid
    );
    if (!query) return;
    return {
      $raw: query,
    };
  }

  function validateFn({ entity, root, field }: any) {
    // since value is changed (in set method) use root instead
    const value = root[field.name];
    if (entity?.geom && !value) return true;

    if (!field?.geom?.multi) {
      const features: GeoJSON.Feature[] = GeoJSON.getFeatures(value);
      if (features?.length > 1) {
        return 'Feature collection accepts only one feature';
      }
    }

    if (field?.geom?.types?.length) {
      const result = GeoJSON.validateGeometryTypes(field.geom.types, value);
      if (!result.valid)
        return `Invalid geometry types. Availble - ${field.geom.types.join(
          ','
        )}`;
    }

    const result = GeoJSON.validate(value);

    if (!result.valid) {
      return result.error;
    }

    return true;
  }

  function applyGeomToField(field: GenericObject<any>, key: string) {
    const type = field?.geom?.type || 'geom';

    if (type === 'geom') {
      field.populate = populateFn.call(this, field, key);
      field.set = setGeomFn;
      field.geomFilterFn = geomFilterFn;
      field.validate = validateFn;
    } else if (type === 'area') {
      field.populate = populateAreaFn.call(this, field, key);
    } else {
      throw new Error(`"${type}" is not supported`);
    }
  }

  const schema = {
    hooks: {
      before: {
        list: '_applyGeomFilterFunction',
        find: '_applyGeomFilterFunction',
      },
    },

    methods: {
      _getPropertiesFromFeatureCollection,
      _applyGeomFilterFunction,
      parseGeom,
    },
    actions: {
      _getFeatureCollectionFromGeom,
      _getGeometryArea,
    },
    started() {
      const keys = Object.keys(this.settings.fields).filter(
        (key) => this.settings.fields[key]?.geom
      );

      if (!keys?.length) return;

      keys.forEach((key) => {
        const field = this.settings.fields[key];

        if (typeof field.geom !== 'object') {
          field.geom = {
            type: 'geom',
            multi: false,
          };
        }

        applyGeomToField.call(this, field, key);
      });
    },
  };
  return schema;
}
