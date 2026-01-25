import type { GameState } from "./types";
import { initRegistryFromChess } from "./pieceIds";

export function createInitialGameState(chess: any): GameState {
  return {
    turnNumber: 1,
    mana: { w: 2, b: 2 },
    maxMana: { w: 3, b: 3 },

    registry: initRegistryFromChess(chess),

    statusesById: {},
    cooldowns: {},

    log: ["Game start."],
  };
}
