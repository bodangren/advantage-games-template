/**
 * Word data for SpellLab Potion Master.
 * Each word includes phonics-based bottle distribution for the alchemy puzzle.
 */

/** Represents a group of letters inside a single potion bottle. */
export interface LetterGroup {
  /** Letters in this group (shuffled at runtime). */
  readonly letters: readonly string[];
  /** Whether this group is a vowel sound (affects bottle color logic). */
  readonly isVowel: boolean;
}

/** Complete data for one vocabulary word. */
export interface WordEntry {
  /** The English word to spell. */
  readonly word: string;
  /** Thai translation displayed as the target meaning. */
  readonly thai: string;
  /** Difficulty tier 1-2. */
  readonly difficulty: 1 | 2;
  /** Phonics-based letter groups — each group becomes one bottle. */
  readonly groups: readonly LetterGroup[];
}

/** Batch 1 — Medium difficulty: blends + digraphs (4-5 letters). */
const BATCH_1: readonly WordEntry[] = [
  {
    word: "ghost",
    thai: "ผี",
    difficulty: 1,
    groups: [
      { letters: ["G", "H"], isVowel: false },
      { letters: ["S"], isVowel: false },
      { letters: ["T"], isVowel: false },
      { letters: ["O"], isVowel: true },
    ],
  },
  {
    word: "dream",
    thai: "ความฝัน",
    difficulty: 1,
    groups: [
      { letters: ["D", "R"], isVowel: false },
      { letters: ["E"], isVowel: true },
      { letters: ["A"], isVowel: true },
      { letters: ["M"], isVowel: false },
    ],
  },
  {
    word: "queen",
    thai: "ราชินี",
    difficulty: 1,
    groups: [
      { letters: ["Q", "U"], isVowel: false },
      { letters: ["E"], isVowel: true },
      { letters: ["E"], isVowel: true },
      { letters: ["N"], isVowel: false },
    ],
  },
  {
    word: "beach",
    thai: "ชายหาด",
    difficulty: 1,
    groups: [
      { letters: ["B", "E"], isVowel: false },
      { letters: ["A"], isVowel: true },
      { letters: ["C"], isVowel: false },
      { letters: ["H"], isVowel: false },
    ],
  },
  {
    word: "bridge",
    thai: "สะพาน",
    difficulty: 1,
    groups: [
      { letters: ["B", "R"], isVowel: false },
      { letters: ["I", "D"], isVowel: false },
      { letters: ["G"], isVowel: false },
      { letters: ["E"], isVowel: true },
    ],
  },
];

/** Batch 2 — Hard difficulty: silent letters + complex patterns (5-6 letters). */
const BATCH_2: readonly WordEntry[] = [
  {
    word: "knight",
    thai: "อัศวิน",
    difficulty: 2,
    groups: [
      { letters: ["K", "N"], isVowel: false },
      { letters: ["I", "G"], isVowel: false },
      { letters: ["H"], isVowel: false },
      { letters: ["T"], isVowel: false },
    ],
  },
  {
    word: "phone",
    thai: "โทรศัพท์",
    difficulty: 2,
    groups: [
      { letters: ["P", "H"], isVowel: false },
      { letters: ["O"], isVowel: true },
      { letters: ["N"], isVowel: false },
      { letters: ["E"], isVowel: true },
    ],
  },
  {
    word: "watch",
    thai: "นาฬิกา",
    difficulty: 2,
    groups: [
      { letters: ["W", "A"], isVowel: false },
      { letters: ["T"], isVowel: false },
      { letters: ["C"], isVowel: false },
      { letters: ["H"], isVowel: false },
    ],
  },
  {
    word: "mouse",
    thai: "หนู",
    difficulty: 2,
    groups: [
      { letters: ["M", "O"], isVowel: false },
      { letters: ["U"], isVowel: true },
      { letters: ["S"], isVowel: false },
      { letters: ["E"], isVowel: true },
    ],
  },
  {
    word: "cheese",
    thai: "ชีส",
    difficulty: 2,
    groups: [
      { letters: ["C", "H"], isVowel: false },
      { letters: ["E", "E"], isVowel: true },
      { letters: ["S"], isVowel: false },
      { letters: ["E"], isVowel: true },
    ],
  },
];

/** All word batches indexed by batch number (0-based). */
const WORD_BATCHES: readonly (readonly WordEntry[])[] = [BATCH_1, BATCH_2];

/**
 * Returns the word entries for a given batch index.
 * Batch 0 = first 5 words, Batch 1 = next 5 words.
 */
export function getWordBatch(batchIndex: number): readonly WordEntry[] {
  return WORD_BATCHES[Math.min(batchIndex, WORD_BATCHES.length - 1)] ?? WORD_BATCHES[0];
}

/**
 * Shuffles an array using Fisher-Yates algorithm with Math.random().
 * Returns a new array (does not mutate original).
 * Truly random — different each game session.
 */
export function shuffleArray<T>(arr: readonly T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/**
 * Shuffles letters inside each bottle group for a word.
 * Uses Math.random() for true randomness.
 * Returns a new WordEntry with shuffled letter arrays.
 */
export function shuffleWordBottles(entry: WordEntry): WordEntry {
  return {
    ...entry,
    groups: entry.groups.map((g) => ({
      ...g,
      letters: shuffleArray(g.letters),
    })),
  };
}
