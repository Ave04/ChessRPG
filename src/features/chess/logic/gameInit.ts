import type { GameState } from "./types";

export function createInitialGameState(): GameState {
    return {
        turnNumber: 1,
        mana: {w: 2, b: 2},
        maxMana: {w: 2, b: 3},
        log: ["Game start."],
    };
}