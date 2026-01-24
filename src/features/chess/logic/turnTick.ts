import type { GameState, Side } from "./types";

export function regenManaForSide(state: GameState, sideToAct: Side): GameState {
    const current = state.mana[sideToAct];
    const max = state.maxMana[sideToAct];
    const next = Math.min(max, current + 1);

    if (next === current) return state;

    return {
        ...state,
        mana: {...state.mana, [sideToAct]: next},
    }
}