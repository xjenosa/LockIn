// Pack shape invariants (Board rendering and clueId derivation depend on them,
// none are runtime-validated):
// - exactly 6 categories per pack, exactly 5 clues per category
// - clue values are exactly [200, 400, 600, 800, 1000] ascending (lib/game VALUES)
// - pack ids are stored in rooms.pack_id; changing an id strands live rooms

export type Clue = {
  value: number; // 200 | 400 | 600 | 800 | 1000
  clue: string; // shown on the board ("This snake-named language…")
  answer: string; // the spoken response ("Python")
  image?: string; // optional /public path or URL
  // Marks a Wildcard (wager clue, no buzzing). The field keeps its legacy
  // pre-rebrand name: it flows into rooms.active_is_dd and the dd_* columns.
  // Do not rename.
  dailyDouble?: boolean;
};

export type Category = { name: string; clues: Clue[] };

export type Final = { category: string; clue: string; answer: string; image?: string };

export type Pack = {
  id: string;
  name: string;
  description: string;
  categories: Category[];
  final: Final; // the Last Call clue
};
