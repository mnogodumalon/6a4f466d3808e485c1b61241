import type { HygieneKontrolle, Kontrollpunkte } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface HygieneKontrolleViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: HygieneKontrolle | null;
  onEdit: (record: HygieneKontrolle) => void;
  kontrollpunkteList: Kontrollpunkte[];
}

export function HygieneKontrolleViewDialog({ open, onClose, record, onEdit, kontrollpunkteList }: HygieneKontrolleViewDialogProps) {
  function getKontrollpunkteDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return kontrollpunkteList.find(r => r.record_id === id)?.fields.name ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hygiene-Kontrolle anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datum der Kontrolle</Label>
            <p className="text-sm">{formatDate(record.fields.datum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kontrollpunkt</Label>
            <p className="text-sm">{getKontrollpunkteDisplayName(record.fields.kontrollpunkt)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Messwert / Ergebnis</Label>
            <p className="text-sm">{record.fields.messwert ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ergebnis in Ordnung</Label>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              record.fields.in_ordnung ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {record.fields.in_ordnung ? 'Ja' : 'Nein'}
            </span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname (Kontrolleur/in)</Label>
            <p className="text-sm">{record.fields.kontrolleur_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname (Kontrolleur/in)</Label>
            <p className="text-sm">{record.fields.kontrolleur_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bemerkung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.bemerkung ?? '—'}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.HYGIENE_KONTROLLE} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}