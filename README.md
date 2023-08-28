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
import PostgisMixin from 'moleculer-postgis';

module.exports = {
  mixins: [
    PostgisMixin: {
      srid: 3346
    }
  ],

  settings: {
    fields: {
      // example with geom and validating types
      geom: {
        type: 'any',
        geom: {
          types: ['Point', 'LineString']
        }
      },
      area: {
        type: 'number',
        virtual: true,
        geom: {
          type: 'area',
        }
      }
    }
  }
};
```

## Contributing

Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a
pull request. For more information, see the [contribution guidelines](./CONTRIBUTING.md).

## License

This project is licensed under the [MIT License](./LICENSE).
