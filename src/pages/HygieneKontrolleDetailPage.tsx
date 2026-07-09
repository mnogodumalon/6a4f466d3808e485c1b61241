import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { HygieneKontrolle, Kontrollpunkte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { HygieneKontrolleDialog } from '@/components/dialogs/HygieneKontrolleDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/HygieneKontrolle';
import { evalComputed } from '@/config/form-enhancements/types';

export default function HygieneKontrolleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<HygieneKontrolle | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [kontrollpunkteList, setKontrollpunkteList] = useState<Kontrollpunkte[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, kontrollpunkteData] = await Promise.all([
        LivingAppsService.getHygieneKontrolle(),
        LivingAppsService.getKontrollpunkte(),
      ]);
      setKontrollpunkteList(kontrollpunkteData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: HygieneKontrolle['fields']) {
    if (!record) return;
    await LivingAppsService.updateHygieneKontrolleEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteHygieneKontrolleEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/hygiene-kontrolle');
  }

  function getKontrollpunkteDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return kontrollpunkteList.find(r => r.record_id === refId)?.fields.name ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title="Eintrag nicht gefunden"
        action={
          <Button variant="ghost" onClick={() => navigate('/hygiene-kontrolle')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            Zurück
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/hygiene-kontrolle')}
      onEdit={() => setEditing(true)}
      backLabel="Zurück"
      editLabel="Bearbeiten"
    >
      <RecordHeader title={record.fields.messwert ?? 'Hygiene-Kontrolle'} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          kontrollpunkt: kontrollpunkteList,
        };
        const fmtComputed = (k: string, n: number) =>
          /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k)
            ? n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
        const computedFacts = Object.entries(formEnhancements.computed)
          .map(([key, formula]) => {
            const v = evalComputed(formula, record!.fields as Record<string, unknown>, { lookupLists });
            return v != null
              ? { label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), value: fmtComputed(key, v) }
              : null;
          })
          .filter((f): f is { label: string; value: string } => f !== null);
        return computedFacts.length > 0 ? <RecordKeyFacts items={computedFacts} /> : null;
      })()}

      <RecordSection title="Details" cols={2}>
        <RecordField label="Datum der Kontrolle" value={record.fields.datum} format="date" />
        <RecordField label="Kontrollpunkt" value={getKontrollpunkteDisplayName(record.fields.kontrollpunkt)} format="text" />
        <RecordField label="Messwert / Ergebnis" value={record.fields.messwert} format="text" />
        <RecordField label="Ergebnis in Ordnung" value={record.fields.in_ordnung} format="bool" />
        <RecordField label="Vorname (Kontrolleur/in)" value={record.fields.kontrolleur_vorname} format="text" />
        <RecordField label="Nachname (Kontrolleur/in)" value={record.fields.kontrolleur_nachname} format="text" />
        <RecordField label="Bemerkung" value={record.fields.bemerkung} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.HYGIENE_KONTROLLE} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>

      <HygieneKontrolleDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        kontrollpunkteList={kontrollpunkteList}
        enablePhotoScan={AI_PHOTO_SCAN['HygieneKontrolle']}
        enablePhotoLocation={AI_PHOTO_LOCATION['HygieneKontrolle']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Hygiene-Kontrolle löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </RecordView>
  );
}
