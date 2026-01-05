/**
 * 位置情報とロケーションIDの型定義
 */

export interface Location {
  id: string;
  lat: number;
  lng: number;
  name?: string;
  description?: string;
}

/**
 * ロケーションIDの生成
 * 
 * @param lat 緯度
 * @param lng 経度
 * @returns LOC_35.6787_139.7587 形式のID
 */
export function generateLocationId(lat: number, lng: number): string {
  return `LOC_${lat.toFixed(4)}_${lng.toFixed(4)}`;
}

/**
 * ロケーションIDから座標を抽出
 * 
 * @param locationId LOC_35.6787_139.7587
 * @returns { lat: 35.6787, lng: 139.7587 }
 */
export function parseLocationId(locationId: string): { lat: number; lng: number } | null {
  const match = locationId.match(/LOC_([\d.]+)_([\d.]+)/);
  if (!match) return null;
  
  return {
    lat: Number.parseFloat(match[1]),
    lng: Number.parseFloat(match[2]),
  };
}

/**
 * 事前定義された交差点（デモ用）
 */
export const PREDEFINED_LOCATIONS: Record<string, Location> = {
  LOC_001: {
    id: 'LOC_001',
    lat: 35.70,
    lng: 139.725,
    name: '中央交差点',
    description: 'Agent AとAgent Bが出会うコリジョン地点',
  },
  LOC_START_A: {
    id: 'LOC_START_A',
    lat: 35.65,
    lng: 139.60,
    name: 'Agent A スタート地点',
  },
  LOC_START_B: {
    id: 'LOC_START_B',
    lat: 35.75,
    lng: 139.85,
    name: 'Agent B スタート地点',
  },
};


