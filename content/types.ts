export type Clue = {
  value: number; // 200 | 400 | 600 | 800 | 1000
  clue: string; // shown on the board ("This snake-named language…")
  answer: string; // the spoken response ("What is Python?")
  image?: string; // optional /public path or URL
  dailyDouble?: boolean; // controlling team wagers; no buzzing
};

export type Category = { name: string; clues: Clue[] }; // exactly 5, ascending value

export type Final = { category: string; clue: string; answer: string; image?: string };

export type Pack = {
  id: string;
  name: string;
  description: string;
  categories: Category[]; // exactly 6
  final: Final;
};
