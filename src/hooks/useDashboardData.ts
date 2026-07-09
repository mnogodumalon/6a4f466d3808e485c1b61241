import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Kontrollpunkte, HygieneKontrolle } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

/** Dashboard data + the OPTIMISTIC-WRITE API.
 *
 *  The per-entity setters (`set<Entity>`) are exported for exactly one job:
 *  optimistic updates on drag writes (onEventDrop / onEventResize /
 *  onCardMove). Call the setter FIRST — the bar/card lands instantly — then
 *  fire the PATCH in the background and call `fetchAll()` ONLY in the catch.
 *  Never await the PATCH before updating state (the UI freezes for the full
 *  round-trip on every drag) and never refetch after a successful write.
 *  There is no other mechanism (no `__optimistic`, no `mutate`).
 */
export function useDashboardData() {
  const [kontrollpunkte, setKontrollpunkte] = useState<Kontrollpunkte[]>([]);
  const [hygieneKontrolle, setHygieneKontrolle] = useState<HygieneKontrolle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [kontrollpunkteData, hygieneKontrolleData] = await Promise.all([
        LivingAppsService.getKontrollpunkte(),
        LivingAppsService.getHygieneKontrolle(),
      ]);
      setKontrollpunkte(kontrollpunkteData);
      setHygieneKontrolle(hygieneKontrolleData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [kontrollpunkteData, hygieneKontrolleData] = await Promise.all([
          LivingAppsService.getKontrollpunkte(),
          LivingAppsService.getHygieneKontrolle(),
        ]);
        setKontrollpunkte(kontrollpunkteData);
        setHygieneKontrolle(hygieneKontrolleData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const kontrollpunkteMap = useMemo(() => {
    const m = new Map<string, Kontrollpunkte>();
    kontrollpunkte.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kontrollpunkte]);

  return { kontrollpunkte, setKontrollpunkte, hygieneKontrolle, setHygieneKontrolle, loading, error, fetchAll, kontrollpunkteMap };
}