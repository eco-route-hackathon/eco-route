import { MapContainer, TileLayer, CircleMarker, Tooltip, Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_LOCATIONS } from './mapLocations';
import styles from '../styles/components/JapanMap.module.css';

const JAPAN_CENTER: [number, number] = [36.2048, 138.2529]; // 日本の中心座標

import type { TransportLeg } from '../types';

interface JapanMapProps {
  recommendedLegs?: TransportLeg[];
}

const JapanMap: React.FC<JapanMapProps> = ({ recommendedLegs }) => {
  // ルート座標列を生成
  const routeLatLngs =
    recommendedLegs && recommendedLegs.length > 0
      ? (recommendedLegs
          .map((leg) => {
            // from座標
            const from = MAP_LOCATIONS.find((l) => l.name === leg.from);
            return from ? [from.lat, from.lon] : null;
          })
          .filter(Boolean) as [number, number][])
      : [];
  // 最後のto座標も追加
  if (recommendedLegs && recommendedLegs.length > 0) {
    const lastTo = MAP_LOCATIONS.find(
      (l) => l.name === recommendedLegs[recommendedLegs.length - 1].to
    );
    if (lastTo) routeLatLngs.push([lastTo.lat, lastTo.lon]);
  }

  return (
    <MapContainer center={JAPAN_CENTER} zoom={5} style={{ height: '400px', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* おすすめルートがあれば線と⭐を描画 */}
      {routeLatLngs.length > 1 && (
        <>
          <Polyline
            positions={routeLatLngs.map(([lat, lon]) => [lat, lon])}
            pathOptions={{ color: 'gold', weight: 6, opacity: 0.9 }}
            className={styles.routeLine}
          />
          {/* スタート・ゴールに⭐マーカー */}
          <Marker
            position={routeLatLngs[0]}
            icon={L.divIcon({
              className: styles.starIcon,
              html: '⭐',
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            })}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              出発地点
            </Tooltip>
          </Marker>
          <Marker
            position={routeLatLngs[routeLatLngs.length - 1]}
            icon={L.divIcon({
              className: styles.starIcon,
              html: '⭐',
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            })}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              到着地点
            </Tooltip>
          </Marker>
        </>
      )}

      {/* CSVに載っている全地点を点で表示（小さく） */}
      {MAP_LOCATIONS.map((loc) => (
        <CircleMarker
          key={loc.name}
          center={[loc.lat, loc.lon]}
          radius={5}
          pathOptions={{
            color: loc.type === 'port' ? '#0074D9' : '#FF4136',
            fillColor: loc.type === 'port' ? '#0074D9' : '#FF4136',
            fillOpacity: 0.8,
          }}
          className={
            loc.type === 'port'
              ? `${styles.marker} ${styles.markerPort} ${styles.markerSmall}`
              : `${styles.marker} ${styles.markerCity} ${styles.markerSmall}`
          }
        >
          <Tooltip direction="top" offset={[0, -10]}>
            {loc.name}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
};

export default JapanMap;
