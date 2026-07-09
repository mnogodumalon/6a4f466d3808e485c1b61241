import type { HygieneKontrolle } from './app';

export type EnrichedHygieneKontrolle = HygieneKontrolle & {
  kontrollpunktName: string;
};
