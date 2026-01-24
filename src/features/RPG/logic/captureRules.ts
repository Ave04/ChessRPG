import type { Square } from "chess.js";
import type { GameState } from "../../chess/logic/types";
import { hasStatus } from "./rpgHelpers";

export function isCaptureBlockedByShield(state: GameState, to: Square): boolean {
    return hasStatus(state, to, "SHIELDED");
}

export function removeShield(state: GameState, square: Square): GameState {
    const key = square as string;
    const list = state.statuses[key] ?? [];
    const filtered = list.filter((s) => s.type !== "SHIELDED");

    const nextStatuses = { ...state.statuses};
    if (filtered.length) nextStatuses[key] = filtered;
    else delete nextStatuses[key];

    return { ...state, statuses: nextStatuses};
}