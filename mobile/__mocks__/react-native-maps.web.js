/**
 * Web stub for react-native-maps.
 * On web, react-native-maps cannot be bundled (it uses native-only APIs).
 * This file exports no-op components so the web bundler never crashes.
 * The actual map UI on web is handled by the Platform.OS === 'web' branch in map.tsx.
 */
const React = require('react');
const { View } = require('react-native');

const noop = () => null;

const MapView = React.forwardRef((props, _ref) =>
  React.createElement(View, props)
);
MapView.displayName = 'MapView';

const Marker = noop;
const Callout = noop;
const Circle = noop;
const Polygon = noop;
const Polyline = noop;
const Overlay = noop;

const PROVIDER_GOOGLE = 'google';
const PROVIDER_DEFAULT = null;

module.exports = {
  default: MapView,
  MapView,
  Marker,
  Callout,
  Circle,
  Polygon,
  Polyline,
  Overlay,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
};
