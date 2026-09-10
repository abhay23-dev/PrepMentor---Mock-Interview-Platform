import { Difficulty } from "../types/index.js";

const DIFFICULTY_ORDER: Difficulty[] = [
  Difficulty.EASY,
  Difficulty.MEDIUM,
  Difficulty.HARD,
];

// Score 8+ on the current difficulty bumps it up one level.
// Score 4 or below drops it down one level.
// Anything in between (5-7) keeps the same difficulty.
export const getNextDifficulty = (
  current: Difficulty,
  score: number,
): Difficulty => {
  const currentIndex = DIFFICULTY_ORDER.indexOf(current);

  if (score >= 8 && currentIndex < DIFFICULTY_ORDER.length - 1) {
    return DIFFICULTY_ORDER[currentIndex + 1];
  }

  if (score <= 4 && currentIndex > 0) {
    return DIFFICULTY_ORDER[currentIndex - 1];
  }

  return current;
};
