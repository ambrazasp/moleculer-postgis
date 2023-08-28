import * as GeoJSON from 'geojsonjs';
import { PostgisMixin } from './mixin';
export * from './queries';

export const GeometryType = GeoJSON.GeometryType;
export default PostgisMixin;
