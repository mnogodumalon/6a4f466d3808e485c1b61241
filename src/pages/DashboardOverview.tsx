import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichHygieneKontrolle } from '@/lib/enrich';
import type { EnrichedHygieneKontrolle } from '@/types/enriched';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconClipboardCheck, IconAlertTriangle, IconCirclePlus,
  IconShieldCheck,
} from '@tabler/icons-react';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatCard, StatCardRow } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import {
  TableWidget, TableSkeleton, TableError, TableEmpty,
  type TableColumn, type TableRow, type TableTone,
} from '@/components/widgets/TableWidget';
import {
  ChartWidget, ChartSkeleton, ChartError,
  type ChartRow,
} from '@/components/widgets/ChartWidget';
import {
  RecordOverlay,
  RecordHeader,
  RecordSection,
  RecordField,
  RecordAttachments,
  useRecordOverlayStack,
} from '@/components/widgets/RecordView';
import { KontrollpunkteDialog } from '@/components/dialogs/KontrollpunkteDialog';
import { HygieneKontrolleDialog } from '@/components/dialogs/HygieneKontrolleDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { useClock, gruss, undoToast } from '@/lib/polish';

const APPGROUP_ID = '6a4f466d3808e485c1b61241';
const REPAIR_ENDPOINT = '/claude/build/repair';

type OverlayItem = { type: 'hygiene'; id: string } | { type: 'kontrollpunkt'; id: string };

export default function DashboardOverview() {
  const clock = useClock();
  const {
    kontrollpunkte, hygieneKontrolle,
    kontrollpunkteMap,
    loading, error, fetchAll,
    setHygieneKontrolle,
  } = useDashboardData();

  const enrichedKontrollen = enrichHygieneKontrolle(hygieneKontrolle, { kontrollpunkteMap });

  // Overlay stack
  const overlay = useRecordOverlayStack<OverlayItem>();

  // Dialog state
  const [hygieneDialogOpen, setHygieneDialogOpen] = useState(false);
  const [editingHygiene, setEditingHygiene] = useState<EnrichedHygieneKontrolle | null>(null);
  const [kontrollpunktDialogOpen, setKontrollpunktDialogOpen] = useState(false);

  // Filter state (KPI filter)
  const [filterNichtOk, setFilterNichtOk] = useState(false);

  // ── Derived data ──────────────────────────────────────────────────────────
  const today = format(clock, 'yyyy-MM-dd');
  const todayLabel = format(clock, 'EEEE, d. MMMM', { locale: de });

  const nichtOkKontrollen = useMemo(
    () => enrichedKontrollen.filter(k => k.fields.in_ordnung === false),
    [enrichedKontrollen]
  );

  // Today's kontrollen
  const heuteKontrollen = useMemo(
    () => enrichedKontrollen.filter(k => k.fields.datum === today),
    [enrichedKontrollen, today]
  );

  // Filtered rows for the table
  const tableRows = useMemo((): TableRow<EnrichedHygieneKontrolle>[] => {
    const source = filterNichtOk ? nichtOkKontrollen : enrichedKontrollen;
    return [...source]
      .sort((a, b) => (b.fields.datum ?? '').localeCompare(a.fields.datum ?? ''))
      .map(r => ({
        id: `hygiene:${r.record_id}`,
        data: r,
        tone: r.fields.in_ordnung === false ? 'destructive' as TableTone : 'default' as TableTone,
      }));
  }, [enrichedKontrollen, nichtOkKontrollen, filterNichtOk]);

  // Chart rows (always full, never filtered)
  const chartRows = useMemo((): ChartRow<EnrichedHygieneKontrolle>[] =>
    enrichedKontrollen.map(r => ({ id: `hygiene:${r.record_id}`, data: r })),
    [enrichedKontrollen]
  );

  // ── Hero: wenn heute nicht bestandene Kontrollen existieren ───────────────
  const heuteNichtOk = heuteKontrollen.filter(k => k.fields.in_ordnung === false);

  // ── Overlay helpers ───────────────────────────────────────────────────────
  function openHygieneOverlay(id: string) {
    overlay.replace({ type: 'hygiene', id });
  }

  // ── Overlay record lookup ─────────────────────────────────────────────────
  const overlayHygieneRecord = overlay.top?.type === 'hygiene'
    ? enrichedKontrollen.find(r => r.record_id === overlay.top?.id) ?? null
    : null;

  // ALL hooks are above early returns
  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns: TableColumn<EnrichedHygieneKontrolle>[] = [
    {
      key: 'datum',
      label: 'Datum',
      accessor: r => r.data.fields.datum ?? null,
      format: 'date',
      priority: 100,
    },
    {
      key: 'kontrollpunkt',
      label: 'Kontrollpunkt',
      accessor: r => r.data.kontrollpunktName || '—',
      format: 'text',
      priority: 100,
    },
    {
      key: 'kategorie',
      label: 'Kategorie',
      accessor: r => {
        const id = r.data.fields.kontrollpunkt;
        if (!id) return null;
        const match = id.match(/([a-f0-9]{24})$/i);
        if (!match) return null;
        const kp = kontrollpunkteMap.get(match[1]);
        return kp?.fields.kategorie?.label ?? null;
      },
      format: 'pill',
      filterable: true,
    },
    {
      key: 'messwert',
      label: 'Messwert',
      accessor: r => r.data.fields.messwert ?? null,
      format: 'text',
    },
    {
      key: 'in_ordnung',
      label: 'Ergebnis',
      accessor: r => r.data.fields.in_ordnung,
      format: 'bool',
      priority: 100,
      responsive: 'keep' as const,
    },
    {
      key: 'kontrolleur',
      label: 'Kontrolleur/in',
      accessor: r => {
        const v = r.data.fields.kontrolleur_vorname ?? '';
        const n = r.data.fields.kontrolleur_nachname ?? '';
        return `${v} ${n}`.trim() || null;
      },
      format: 'text',
    },
  ];

  // ── Empty state ───────────────────────────────────────────────────────────
  if (enrichedKontrollen.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground mt-1">Beginne mit der ersten Hygiene-Kontrolle.</p>
        </div>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <IconShieldCheck size={48} className="text-muted-foreground" stroke={1.5} />
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Noch keine Prüfprotokolle vorhanden. Erfasse jetzt die erste Hygiene-Kontrolle.
          </p>
          <Button onClick={() => setHygieneDialogOpen(true)}>
            <IconCirclePlus size={16} className="mr-2 shrink-0" />
            Erste Kontrolle erfassen
          </Button>
        </div>
        <HygieneKontrolleDialog
          open={hygieneDialogOpen}
          onClose={() => setHygieneDialogOpen(false)}
          onSubmit={async (fields) => {
            await LivingAppsService.createHygieneKontrolleEntry(fields);
            fetchAll();
          }}
          kontrollpunkteList={kontrollpunkte}
          enablePhotoScan={AI_PHOTO_SCAN['HygieneKontrolle']}
          enablePhotoLocation={AI_PHOTO_LOCATION['HygieneKontrolle']}
        />
        <KontrollpunkteDialog
          open={kontrollpunktDialogOpen}
          onClose={() => setKontrollpunktDialogOpen(false)}
          onSubmit={async (fields) => {
            await LivingAppsService.createKontrollpunkteEntry(fields);
            fetchAll();
          }}
          enablePhotoScan={AI_PHOTO_SCAN['Kontrollpunkte']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Kontrollpunkte']}
        />
      </div>
    );
  }

  // ── Context line ──────────────────────────────────────────────────────────
  const contextLine = (() => {
    if (heuteNichtOk.length > 0) {
      const names = heuteNichtOk.map(k => k.kontrollpunktName).filter(Boolean);
      return `Heute (${todayLabel}) gibt es ${heuteNichtOk.length} nicht bestandene Prüfung${heuteNichtOk.length > 1 ? 'en' : ''}: ${names.slice(0, 2).join(', ')}${names.length > 2 ? ` +${names.length - 2}` : ''}.`;
    }
    if (heuteKontrollen.length > 0) {
      return `Heute (${todayLabel}) wurden ${heuteKontrollen.length} Prüfung${heuteKontrollen.length > 1 ? 'en' : ''} durchgeführt — alles in Ordnung.`;
    }
    return `Heute (${todayLabel}) noch keine Prüfungen erfasst.`;
  })();

  // ── WorkList items: nicht bestandene Kontrollen ────────────────────────────
  const nichtOkItems = nichtOkKontrollen
    .sort((a, b) => (b.fields.datum ?? '').localeCompare(a.fields.datum ?? ''))
    .slice(0, 5)
    .map(k => ({
      id: k.record_id,
      title: k.kontrollpunktName || 'Unbekannter Kontrollpunkt',
      secondLine: (
        <>
          <span className="font-medium text-destructive">Nicht bestanden</span>
          {k.fields.datum ? <span className="text-muted-foreground"> · {formatDate(k.fields.datum)}</span> : null}
          {k.fields.kontrolleur_vorname ? <span className="text-muted-foreground"> · {k.fields.kontrolleur_vorname} {k.fields.kontrolleur_nachname}</span> : null}
        </>
      ),
      action: {
        label: '✓ Als OK markieren',
        onClick: () => {
          const prev = k.fields.in_ordnung;
          setHygieneKontrolle(prev2 =>
            prev2.map(r => r.record_id === k.record_id ? { ...r, fields: { ...r.fields, in_ordnung: true } } : r)
          );
          LivingAppsService.updateHygieneKontrolleEntry(k.record_id, { in_ordnung: true }).catch(() => {
            setHygieneKontrolle(prev2 =>
              prev2.map(r => r.record_id === k.record_id ? { ...r, fields: { ...r.fields, in_ordnung: prev } } : r)
            );
            fetchAll();
          });
          undoToast(`${k.kontrollpunktName} als OK markiert`, () => {
            setHygieneKontrolle(prev2 =>
              prev2.map(r => r.record_id === k.record_id ? { ...r, fields: { ...r.fields, in_ordnung: prev } } : r)
            );
            LivingAppsService.updateHygieneKontrolleEntry(k.record_id, { in_ordnung: prev }).catch(() => fetchAll());
          });
        },
      },
    }));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground mt-1">{contextLine}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setKontrollpunktDialogOpen(true)}>
            <IconCirclePlus size={14} className="mr-1 shrink-0" />
            Kontrollpunkt
          </Button>
          <Button size="sm" onClick={() => { setEditingHygiene(null); setHygieneDialogOpen(true); }}>
            <IconCirclePlus size={14} className="mr-1 shrink-0" />
            Kontrolle erfassen
          </Button>
        </div>
      </div>

      <DashboardGrid
        variant="wide"
        hero={
          heuteNichtOk.length > 0 ? (
            <HeroBanner
              tone="destructive"
              icon={<IconAlertTriangle size={18} />}
              action={{
                label: 'Alle anzeigen',
                onClick: () => setFilterNichtOk(true),
              }}
            >
              <b>{heuteNichtOk.length} Prüfung{heuteNichtOk.length > 1 ? 'en' : ''} heute nicht bestanden</b>
              {' '}— Kontrollpunkte: {heuteNichtOk.map(k => k.kontrollpunktName).filter(Boolean).slice(0, 2).join(', ')}
              {heuteNichtOk.length > 2 ? ` +${heuteNichtOk.length - 2} weitere` : ''}.
            </HeroBanner>
          ) : undefined
        }
        kpis={
          <StatCardRow>
            <StatCard
              title="Gesamt Prüfungen"
              value={enrichedKontrollen.length}
              description="Alle erfassten Protokolle"
              icon={<IconClipboardCheck size={18} className="text-muted-foreground" />}
              tone="default"
            />
            <StatCard
              title="Nicht bestanden"
              value={nichtOkKontrollen.length}
              description={nichtOkKontrollen.length > 0 ? 'Handlungsbedarf' : 'Alles in Ordnung'}
              icon={<IconAlertTriangle size={18} className="text-muted-foreground" />}
              tone={nichtOkKontrollen.length > 0 ? 'destructive' : 'default'}
              onClick={() => setFilterNichtOk(f => !f)}
              active={filterNichtOk}
            />
            <StatCard
              title="Heute erfasst"
              value={heuteKontrollen.length}
              description={heuteKontrollen.length > 0 ? `${todayLabel}` : 'Noch keine Prüfungen heute'}
              icon={<IconShieldCheck size={18} className="text-muted-foreground" />}
              tone={heuteKontrollen.length > 0 ? 'success' : 'default'}
            />
            <StatCard
              title="Kontrollpunkte"
              value={kontrollpunkte.length}
              description="Aktive Prüfstellen"
              icon={<IconClipboardCheck size={18} className="text-muted-foreground" />}
              tone="default"
            />
          </StatCardRow>
        }
        primary={
          <TableWidget
            columns={columns}
            rows={tableRows}
            onRowClick={row => openHygieneOverlay(row.id.split(':')[1] ?? '')}
            locale="de"
            toolbarEnd={
              <Button size="sm" onClick={() => { setEditingHygiene(null); setHygieneDialogOpen(true); }}>
                <IconCirclePlus size={14} className="mr-1 shrink-0" />
                Neue Kontrolle
              </Button>
            }
          />
        }
        aside={
          <>
            <WorkList
              title="Nicht bestanden"
              icon={<IconAlertTriangle size={14} className="text-destructive" />}
              items={nichtOkItems}
              onItemClick={openHygieneOverlay}
              empty={{
                text: 'Alle Prüfungen bestanden — weiter so!',
                action: {
                  label: 'Neue Kontrolle',
                  onClick: () => { setEditingHygiene(null); setHygieneDialogOpen(true); },
                },
              }}
            />
            <ChartWidget
              title="Prüfungen nach Kategorie"
              rows={chartRows}
              dimension={{
                kind: 'category',
                accessor: row => {
                  const id = row.data.fields.kontrollpunkt;
                  if (!id) return null;
                  const match = id.match(/([a-f0-9]{24})$/i);
                  if (!match) return null;
                  const kp = kontrollpunkteMap.get(match[1]);
                  return kp?.fields.kategorie?.label ?? null;
                },
                label: 'Kategorie',
              }}
              locale="de"
            />
          </>
        }
      />

      {/* ── Hygiene-Kontrolle Overlay ── */}
      <RecordOverlay
        open={overlay.open && overlay.top?.type === 'hygiene'}
        onClose={overlay.close}
        onEdit={() => {
          if (overlayHygieneRecord) {
            setEditingHygiene(overlayHygieneRecord);
            setHygieneDialogOpen(true);
          }
        }}
        editLabel="Bearbeiten"
        footer={
          overlayHygieneRecord && overlayHygieneRecord.fields.in_ordnung === false ? (
            <button
              type="button"
              className="w-full inline-flex items-center justify-center gap-2 min-h-10 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-600/90 transition-colors px-4"
              onClick={() => {
                if (!overlayHygieneRecord) return;
                const prev = overlayHygieneRecord.fields.in_ordnung;
                setHygieneKontrolle(prev2 =>
                  prev2.map(r => r.record_id === overlayHygieneRecord.record_id
                    ? { ...r, fields: { ...r.fields, in_ordnung: true } }
                    : r)
                );
                LivingAppsService.updateHygieneKontrolleEntry(overlayHygieneRecord.record_id, { in_ordnung: true }).catch(() => {
                  setHygieneKontrolle(prev2 =>
                    prev2.map(r => r.record_id === overlayHygieneRecord.record_id
                      ? { ...r, fields: { ...r.fields, in_ordnung: prev } }
                      : r)
                  );
                  fetchAll();
                });
                undoToast(`${overlayHygieneRecord.kontrollpunktName} als OK markiert`, () => {
                  setHygieneKontrolle(prev2 =>
                    prev2.map(r => r.record_id === overlayHygieneRecord.record_id
                      ? { ...r, fields: { ...r.fields, in_ordnung: prev } }
                      : r)
                  );
                  LivingAppsService.updateHygieneKontrolleEntry(overlayHygieneRecord.record_id, { in_ordnung: prev }).catch(() => fetchAll());
                });
                overlay.close();
              }}
            >
              <IconCheck size={16} className="shrink-0" />
              Als in Ordnung markieren
            </button>
          ) : undefined
        }
      >
        {overlayHygieneRecord && (
          <>
            <RecordHeader
              title={overlayHygieneRecord.kontrollpunktName || 'Hygiene-Kontrolle'}
              subtitle={formatDate(overlayHygieneRecord.fields.datum)}
              badges={
                overlayHygieneRecord.fields.in_ordnung === false
                  ? <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Nicht bestanden</span>
                  : overlayHygieneRecord.fields.in_ordnung === true
                    ? <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Bestanden</span>
                    : undefined
              }
            />
            <RecordSection title="Prüfergebnis" cols={2}>
              <RecordField label="Datum" value={overlayHygieneRecord.fields.datum} format="date" />
              <RecordField label="Messwert / Ergebnis" value={overlayHygieneRecord.fields.messwert} />
              <RecordField label="In Ordnung" value={overlayHygieneRecord.fields.in_ordnung} format="bool" />
              <RecordField label="Bemerkung" value={overlayHygieneRecord.fields.bemerkung} />
            </RecordSection>
            <RecordSection title="Kontrolleur/in" cols={2}>
              <RecordField label="Vorname" value={overlayHygieneRecord.fields.kontrolleur_vorname} />
              <RecordField label="Nachname" value={overlayHygieneRecord.fields.kontrolleur_nachname} />
            </RecordSection>
            <RecordAttachments appId={APP_IDS.HYGIENE_KONTROLLE} recordId={overlayHygieneRecord.record_id} />
          </>
        )}
      </RecordOverlay>

      {/* ── Dialoge ── */}
      <HygieneKontrolleDialog
        open={hygieneDialogOpen}
        onClose={() => { setHygieneDialogOpen(false); setEditingHygiene(null); }}
        onSubmit={async (fields) => {
          if (editingHygiene) {
            await LivingAppsService.updateHygieneKontrolleEntry(editingHygiene.record_id, fields);
          } else {
            await LivingAppsService.createHygieneKontrolleEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editingHygiene?.fields}
        recordId={editingHygiene?.record_id}
        kontrollpunkteList={kontrollpunkte}
        enablePhotoScan={AI_PHOTO_SCAN['HygieneKontrolle']}
        enablePhotoLocation={AI_PHOTO_LOCATION['HygieneKontrolle']}
      />

      <KontrollpunkteDialog
        open={kontrollpunktDialogOpen}
        onClose={() => setKontrollpunktDialogOpen(false)}
        onSubmit={async (fields) => {
          await LivingAppsService.createKontrollpunkteEntry(fields);
          fetchAll();
        }}
        enablePhotoScan={AI_PHOTO_SCAN['Kontrollpunkte']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kontrollpunkte']}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
