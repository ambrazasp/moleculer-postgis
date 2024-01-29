# Save, validate and parse geometries on your `@moleculer/database` project

[![License](https://img.shields.io/github/license/ambrazasp/moleculer-postgis)](https://github.com/ambrazasp/moleculer-postgis/blob/main/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/ambrazasp/moleculer-postgis)](https://github.com/ambrazasp/moleculer-postgis/issues)
[![GitHub stars](https://img.shields.io/github/stars/ambrazasp/moleculer-postgis)](https://github.com/ambrazasp/moleculer-postgis/stargazers)

## Table of Contents

- [About the Project](#about-the-project)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## About the Project

The `moleculer-postgis` is designed to support Postgis functions for `@moleculer/database` mixin.

## Getting Started

To get started, install `moleculer-postgis` package to your project.

```bash
npm i moleculer-postgis
yarn add moleculer-postgis
```

## Usage

```js
import PostgisMixin, { GeometryType } from 'moleculer-postgis';

module.exports = {
  mixins: [
    PostgisMixin({
      srid: 3346,
    }),
  ],

  settings: {
    fields: {
      // example with geom and validating types
      geom: {
        type: 'any',
        geom: {
          types: [GeometryType.POINT, GeometryType.LINE_STRING],
        },
      },
      area: {
        type: 'number',
        virtual: true,
        geom: {
          type: 'area',
        },
      },
    },
  },
};
```

# Documentation

## Mixin

Using mixin is simple. Import and define it as a function. To the function you can pass `opts` such as global `srid`.

```js
import PostgisMixin from 'moleculer-postgis';
module.exports = {
  mixins: [
    PostgisMixin({
      srid: 3346, // default 3346
      geojson: { // optional - Documentation: https://postgis.net/docs/ST_AsGeoJSON.html
        maxDecimalDigits: 0 // default
        options: 0 // default
      }
    }),
  ],
};
```

## Fields

```js
module.exports = {
  settings: {
    fields: {
      geom: {
        columnName: 'geomfield', // optional
        geom: {
          type: 'geom', // define type - defaults to "geom"
          types: [], // defining types,
          multi: true, // defines handling multi geometries
          validate({ ctx, params, value, field }) {
            // validation function (same as @moleculer/database)
            return true;
          },
        },
      },
    },
    defaultPopulates: ['geom'],
  },
};

module.exports = {
  settings: {
    fields: {
      geom: {
        geom: true,
      },
    },
  },
};
```

**Options:**

| Option     | Default value | Type (available values)     |
| ---------- | ------------- | --------------------------- |
| `type`     | `geom`        | String - `area`, `geom`     |
| `multi`    | `false`       | Boolean                     |
| `types`    | All types     | `Array<string>` or `string` |
| `validate` | -             | `Function` or `string`      |

Types - `Point`, `LineString`, `Polygon`, `MultiLineString`, `MultiPoint`, `MultiPolygon`

## Queries

| Query                   |                                     |
| ----------------------- | ----------------------------------- |
| `areaQuery`             | [More info](#areaquery)             |
| `distanceQuery`         | [More info](#distancequery)         |
| `asGeoJsonQuery`        | [More info](#asgeojsonquery)        |
| `geometriesAsTextQuery` | [More info](#geometriesastextquery) |
| `geomFromText`          | [More info](#geomfromtext)          |
| `intersectsQuery`       | [More info](#intersectsquery)       |

### areaQuery

```js
import { areaQuery } from 'moleculer-postgis';
const field = 'geomfield';
const fieldAs = 'geom';
// optional
const srid = 3346;

// ROUND(ST_Area("geomfield")) as "geom"
// If srid is passed, ST_Transform is applied
areaQuery(geom, fieldAs, srid);
```

### distanceQuery

```js
import { distanceQuery } from 'moleculer-postgis';
const field1 = 'geomfield';
const field2 = 'geomfield2';
const resultAs = 'distance';
// optional
const srid = 3346;

// ROUND(ST_Distance("geomfield", "geomfield2")) as "distance"
// If srid is passed, ST_Transform is applied for each field
distanceQuery(field1, field2, resultAs, srid);
```

### asGeoJsonQuery

```js
import { asGeoJsonQuery } from 'moleculer-postgis';
const field = 'geomfield';
const resultAs = 'geom';
// optional
const srid = 3346;
const opts = {
  digits: 0,
  options: 0,
};

// ST_AsGeoJSON("geomfield")::json as "geom"
// If srid is passed, ST_Transform is applied for each field. Options are not applied if not passed
asGeoJsonQuery(field, resultAs, srid, opts);
```

### geometriesAsTextQuery

```js
import { geometriesAsTextQuery } from 'moleculer-postgis';
const geometry = {
  type: 'Point',
  coordinates: [11, 22],
};

// ST_AsText(...)
// If passed multi geometries - it will use ST_Collect
geometriesAsTextQuery(geometry);

// Using crs with transofrms
const geometry = {
  type: 'Point',
  coordinates: [11, 22],
  crs: { type: 'name', properties: { name: 'EPSG:4326' } },
};
const srid = 3346;
geometriesAsTextQuery(geometry, srid);
```

### geomFromText

```js
import { geomFromText, geometriesAsTextQuery } from 'moleculer-postgis';
const geometry = {
  type: 'Point',
  coordinates: [11, 22],
};
const srid = 3346;
// ST_AsText(...)
const text = geometriesAsTextQuery(geometry);

// ST_GeomFromText(...)
// If srid is passed - ST_Transform is applied
geomFromText(text, srid);
```

### intersectsQuery

```js
import { intersectsQuery } from 'moleculer-postgis';
// any type of geometry can be passed (feature collection, feature, array of feature collections, etc)
const geometry = {
  type: 'Point',
  coordinates: [11, 22],
};
const field = 'geomfield';
const srid = 3346;

// ST_intersects(...)
// If srid is passed - ST_Transform is applied
intersectsQuery(field, geometry, srid);
```

## Contributing

Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a
pull request. For more information, see the [contribution guidelines](./CONTRIBUTING.md).

## License

This project is licensed under the [MIT License](./LICENSE).
