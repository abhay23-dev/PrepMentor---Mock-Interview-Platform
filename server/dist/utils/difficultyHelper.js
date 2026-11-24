"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNextDifficulty = void 0;
const index_js_1 = require("../types/index.js");
const DIFFICULTY_ORDER = [
    index_js_1.Difficulty.EASY,
    index_js_1.Difficulty.MEDIUM,
    index_js_1.Difficulty.HARD,
];
// Score 8+ on the current difficulty bumps it up one level.
// Score 4 or below drops it down one level.
// Anything in between (5-7) keeps the same difficulty.
const getNextDifficulty = (current, score) => {
    const currentIndex = DIFFICULTY_ORDER.indexOf(current);
    if (score >= 8 && currentIndex < DIFFICULTY_ORDER.length - 1) {
        return DIFFICULTY_ORDER[currentIndex + 1];
    }
    if (score <= 4 && currentIndex > 0) {
        return DIFFICULTY_ORDER[currentIndex - 1];
    }
    return current;
};
exports.getNextDifficulty = getNextDifficulty;
//# sourceMappingURL=difficultyHelper.js.map