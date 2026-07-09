// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Kontrollpunkte {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    name?: string;
    kategorie?: LookupValue;
    sollwert?: string;
    beschreibung?: string;
  };
}

export interface HygieneKontrolle {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    datum?: string; // Format: YYYY-MM-DD oder ISO String
    kontrollpunkt?: string; // applookup -> URL zu 'Kontrollpunkte' Record
    messwert?: string;
    in_ordnung?: boolean;
    kontrolleur_vorname?: string;
    kontrolleur_nachname?: string;
    bemerkung?: string;
  };
}

export const APP_IDS = {
  KONTROLLPUNKTE: '6a4f453d1ca6120b9167ffc9',
  HYGIENE_KONTROLLE: '6a4f454050c9609bef0238ae',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'kontrollpunkte': {
    kategorie: [{ key: "medizingeraet", label: "Medizingerät" }, { key: "hygienemittel", label: "Hygienemittel" }, { key: "notfallausstattung", label: "Notfallausstattung" }, { key: "sonstiges", label: "Sonstiges" }, { key: "temperatur", label: "Temperaturkontrolle" }, { key: "sterilisation", label: "Sterilisation" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'kontrollpunkte': {
    'name': 'string/text',
    'kategorie': 'lookup/select',
    'sollwert': 'string/text',
    'beschreibung': 'string/textarea',
  },
  'hygiene_kontrolle': {
    'datum': 'date/date',
    'kontrollpunkt': 'applookup/select',
    'messwert': 'string/text',
    'in_ordnung': 'bool',
    'kontrolleur_vorname': 'string/text',
    'kontrolleur_nachname': 'string/text',
    'bemerkung': 'string/textarea',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateKontrollpunkte = StripLookup<Kontrollpunkte['fields']>;
export type CreateHygieneKontrolle = StripLookup<HygieneKontrolle['fields']>;