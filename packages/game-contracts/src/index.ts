import { z } from "zod";

/** Schema for one learning item. */
export const vocabularyItemSchema = z.object({ term: z.string().min(1), translation: z.string().min(1) }).strict();
/** Schema for vocabulary input. */
export const vocabularyInputSchema = z.array(vocabularyItemSchema).min(1);
/** Schema for sentence input. */
export const sentenceInputSchema = z.array(vocabularyItemSchema).min(1);
/** Schema for cartridge completion results. */
export const gameResultsSchema = z.object({
  accuracy: z.number().min(0).max(1), xp: z.number().int().min(0), score: z.number().int().min(0),
  correctAnswers: z.number().int().min(0), totalAttempts: z.number().int().min(0),
}).strict();
/** One canonical learning item. */
export type VocabularyItem = z.infer<typeof vocabularyItemSchema>;
/** Vocabulary-mode input. */
export type VocabularyInput = z.infer<typeof vocabularyInputSchema>;
/** Sentence-mode input. */
export type SentenceInput = z.infer<typeof sentenceInputSchema>;
/** Validated display result emitted by a cartridge. */
export type GameResults = z.infer<typeof gameResultsSchema>;
