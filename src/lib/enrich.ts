import type { EnrichedHygieneKontrolle } from '@/types/enriched';
import type { HygieneKontrolle, Kontrollpunkte } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface HygieneKontrolleMaps {
  kontrollpunkteMap: Map<string, Kontrollpunkte>;
}

export function enrichHygieneKontrolle(
  hygieneKontrolle: HygieneKontrolle[],
  maps: HygieneKontrolleMaps
): EnrichedHygieneKontrolle[] {
  return hygieneKontrolle.map(r => ({
    ...r,
    kontrollpunktName: resolveDisplay(r.fields.kontrollpunkt, maps.kontrollpunkteMap, 'name'),
  }));
}
