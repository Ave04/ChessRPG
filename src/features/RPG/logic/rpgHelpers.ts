import type { Square } from "chess.js";
import type { GameState, Side, Status } from "../../chess/logic/types";

export const ABILITY_CHARGE = "KNIGHT_CHARGE";
export const ABILITY_BULWARK = "ROOK_BULWARK";

export function opposite(side: Side): Side {
    return side === "w" ? "b" : "w";
}

export function canAfford(state: GameState, side: Side, cost: number): GameState {
    return {
        ...state,
        mana: { ...state.mana, [side]: state.mana[side] - cost },
    };
}

export function spendMana(state: GameState, side: Side, cost: number): GameState {
  return {
    ...state,
    mana: { ...state.mana, [side]: state.mana[side] - cost },
  };
}

export function getCooldownAvailableTurn(state: GameState, pieceKey: string, abilityId: string): number {
  return state.cooldowns[pieceKey]?.[abilityId] ?? 0;
}

export function setCooldown(state: GameState, pieceKey: string, abilityId: string, availableOnTurn: number): GameState {
  const prevPiece = state.cooldowns[pieceKey] ?? {};
  return {
    ...state,
    cooldowns: {
      ...state.cooldowns,
      [pieceKey]: { ...prevPiece, [abilityId]: availableOnTurn },
    },
  };
}

export function addStatus(state: GameState, square: Square, status: Status): GameState {
  const key = square as string;
  const prev = state.statuses[key] ?? [];
  return {
    ...state,
    statuses: {
      ...state.statuses,
      [key]: [...prev, status],
    },
  };
}

export function hasStatus(state: GameState, square: Square, type: Status["type"]): boolean {
  const list = state.statuses[square as string] ?? [];
  return list.some((s) => s.type === type);
}

export function removeExpiredStatuses(state: GameState): GameState {
  const turn = state.turnNumber;
  const next: GameState["statuses"] = {};

  for (const [sq, list] of Object.entries(state.statuses)) {
    const filtered = list.filter((s) => s.expiresOnTurn > turn);
    if (filtered.length) next[sq] = filtered;
  }

  return { ...state, statuses: next };
}

export function moveStatuses(state: GameState, from: Square, to: Square): GameState {
  const fromKey = from as string;
  const toKey = to as string;

  const moving = state.statuses[fromKey];
  if (!moving || moving.length === 0) return state;

  const nextStatuses = { ...state.statuses };
  delete nextStatuses[fromKey];

  const existing = nextStatuses[toKey] ?? [];
  nextStatuses[toKey] = [...existing, ...moving];

  return { ...state, statuses: nextStatuses };
}

export function adjacentSquares(square: Square): Square[] {
  const file = square.charCodeAt(0); // 'a'..'h'
  const rank = Number(square[1]);    // 1..8
  const result: Square[] = [];

  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (df === 0 && dr === 0) continue;
      const nf = file + df;
      const nr = rank + dr;
      if (nf < 97 || nf > 104) continue; // a..h
      if (nr < 1 || nr > 8) continue;
      result.push(`${String.fromCharCode(nf)}${nr}` as Square);
    }
  }
  return result;
}