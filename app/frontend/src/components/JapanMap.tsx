import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const JAPAN_CENTER: [number, number] = [36.2048, 138.2529]; // 日本の中心座標

import type { Feature, LineString } from 'geojson';

// サンプルGeoJSON（東京駅→名古屋駅→大阪駅）
const sampleRoute: Feature<LineString> = {
  type: 'Feature',
  geometry: {
    type: 'LineString',
    coordinates: [
      [139.767125, 35.681236], // 東京駅
      [136.884437, 35.170915], // 名古屋駅
      [135.498302, 34.702485], // 大阪駅
    ],
  },
  properties: {},
};

const JapanMap = () => {
  return (
    <MapContainer center={JAPAN_CENTER} zoom={5} style={{ height: '400px', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* サンプルルートをGeoJSONで描画 */}
      <GeoJSON data={sampleRoute} style={{ color: 'red', weight: 4 }} />
    </MapContainer>
  );
};

export default JapanMap;
