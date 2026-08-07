import type { Pack } from "../types";
import { picnicGeneral } from "./picnic-general";
import { torontoCanada } from "./toronto-canada";
import { jakartaIndonesia } from "./jakarta-indonesia";
import { computerScience } from "./computer-science";

// To add a pack: create a file exporting a Pack (invariants in content/types.ts),
// then register it here. Order = display order on the host create screen.
// Removing a pack strands any live room whose rooms.pack_id references it.
export const packs: Pack[] = [picnicGeneral, torontoCanada, jakartaIndonesia, computerScience];

export function getPack(id: string): Pack | undefined {
  return packs.find((p) => p.id === id);
}
