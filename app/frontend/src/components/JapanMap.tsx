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
  // 英語⇔日本語対応のための地名変換辞書
  const nameMap: Record<string, string> = {
    Tokyo: '東京',
    東京: 'Tokyo',
    Osaka: '大阪',
    大阪: 'Osaka',
    Nagoya: '名古屋',
    名古屋: 'Nagoya',
    Yokohama: '横浜',
    横浜: 'Yokohama',
    Kyoto: '京都',
    京都: 'Kyoto',
    Kobe: '神戸',
    神戸: 'Kobe',
    Fukuoka: '福岡',
    福岡: 'Fukuoka',
    Sapporo: '札幌',
    札幌: 'Sapporo',
    Okinawa: '沖縄',
    沖縄: 'Okinawa',
    TokyoPort: '東京港',
    東京港: 'TokyoPort',
    OsakaPort: '大阪港',
    大阪港: 'OsakaPort',
    NagoyaPort: '名古屋港',
    名古屋港: 'NagoyaPort',
    YokohamaPort: '横浜港',
    横浜港: 'YokohamaPort',
    KobePort: '神戸港',
    神戸港: 'KobePort',
    HakataPort: '博多港',
    博多港: 'HakataPort',
  };
  function findLocationByName(name: string) {
    return (
      MAP_LOCATIONS.find((l) => l.name === name) ||
      MAP_LOCATIONS.find((l) => l.name === nameMap[name])
    );
  }
  const routeLatLngs =
    recommendedLegs && recommendedLegs.length > 0
      ? (recommendedLegs
          .map((leg) => {
            // from座標
            const from = findLocationByName(leg.from);
            return from ? [from.lat, from.lon] : null;
          })
          .filter(Boolean) as [number, number][])
      : [];
  // 最後のto座標も追加
  if (recommendedLegs && recommendedLegs.length > 0) {
    const lastTo = findLocationByName(recommendedLegs[recommendedLegs.length - 1].to);
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
