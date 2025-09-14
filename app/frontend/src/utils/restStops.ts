export interface RestStopSuggestion {
  name: string;
  reason: string;
  type?: 'cafe' | 'park' | 'view' | 'service' | 'scenic';
}

// Basic mapping for a handful of known locations. This is intentionally small and
// offline — it's a lightweight enhancement for drivers to get quick ideas.
const LOCATION_SUGGESTIONS: Record<string, RestStopSuggestion[]> = {
  Tokyo: [
    { name: 'お台場海浜公園', reason: '海沿いで気分転換に最適。遠回りせずに寄れる', type: 'view' },
    { name: '品川サービスエリア', reason: '運転疲れの休憩に便利な施設多数', type: 'service' },
  ],
  Osaka: [
    { name: '中之島公園', reason: '川沿いでリラックスできる散歩コース', type: 'park' },
    { name: '阪神高速サービスエリア', reason: 'トラック用設備を確認できる', type: 'service' },
  ],
};

export function getRestStopsForLocation(locationName: string, max?: number): RestStopSuggestion[] {
  const list = LOCATION_SUGGESTIONS[locationName];
  if (!list) return [];
  return list.slice(0, max || 2);
}

// Given a leg, provide a short suggestion. Leg is expected to contain at least
// from/to/distanceKm/timeHours properties (matching TransportLeg).
export function getRestStopForLeg(leg: {
  from: string;
  to: string;
  distanceKm: number;
  timeHours: number;
}): RestStopSuggestion | null {
  // Prefer suggestions at the 'to' location if known, else 'from'.
  const toSuggestions = getRestStopsForLocation(leg.to, 1);
  if (toSuggestions.length) return toSuggestions[0];

  const fromSuggestions = getRestStopsForLocation(leg.from, 1);
  if (fromSuggestions.length) return fromSuggestions[0];

  // Fallback: if leg is long, recommend a service area midway
  if (leg.distanceKm >= 100 || leg.timeHours >= 2) {
    return { name: '次のサービスエリア', reason: '長距離運転の休憩におすすめ', type: 'service' };
  }

  // Small detour suggestion for scenic routes on shorter legs
  if (leg.distanceKm >= 30) {
    return { name: '沿道の展望スポット', reason: '短時間の気分転換に良い', type: 'view' };
  }

  return null;
}
