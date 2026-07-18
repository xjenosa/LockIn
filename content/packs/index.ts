import type { Pack } from "../types";
import { picnicGeneral } from "./picnic-general";
import { torontoCanada } from "./toronto-canada";
import { unEco } from "./un-eco";
import { codingTech } from "./coding-tech";

// To add a pack: create a file exporting a Pack, then add it here.
export const packs: Pack[] = [picnicGeneral, torontoCanada, unEco, codingTech];

export function getPack(id: string): Pack | undefined {
  return packs.find((p) => p.id === id);
}
