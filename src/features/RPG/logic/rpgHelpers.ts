import type { Square } from "chess.js";
import type { PieceId } from "../../chess/logic/pieceIds";
import type { GameState, Side, Status } from "../../chess/logic/types";

export const ABILITY_CHARGE = "KNIGHT_CHARGE";
export const ABILITY_BULWARK = "ROOK_BULWARK";

export function opposite(side: Side): Side {
  return side === "w" ? "b" : "w";
}

// ✅ boolean, not GameState
export function canAfford(state: GameState, side: Side, cost: number): boolean {
  return state.mana[side] >= cost;
}

export function spendMana(
  state: GameState,
  side: Side,
  cost: number,
): GameState {
  return {
    ...state,
    mana: { ...state.mana, [side]: state.mana[side] - cost },
  };
}

// --- Cooldowns keyed by PieceId ---
export function getCooldownAvailableTurn(
  state: GameState,
  pieceId: PieceId,
  abilityId: string,
): number {
  return state.cooldowns[pieceId]?.[abilityId] ?? 0;
}

export function setCooldown(
  state: GameState,
  pieceId: PieceId,
  abilityId: string,
  availableOnTurn: number,
): GameState {
  const prevPiece = state.cooldowns[pieceId] ?? {};
  return {
    ...state,
    cooldowns: {
      ...state.cooldowns,
      [pieceId]: { ...prevPiece, [abilityId]: availableOnTurn },
    },
  };
}

// --- Statuses keyed by PieceId ---
export function addStatusById(
  state: GameState,
  id: PieceId,
  status: Status,
): GameState {
  const prev = state.statusesById[id] ?? [];
  return {
    ...state,
    statusesById: {
      ...state.statusesById,
      [id]: [...prev, status],
    },
  };
}

export function hasStatusById(
  state: GameState,
  id: PieceId,
  type: Status["type"],
): boolean {
  const list = state.statusesById[id] ?? [];
  return list.some((s) => s.type === type);
}

export function removeExpiredStatuses(state: GameState): GameState {
  const turn = state.turnNumber;
  const next: GameState["statusesById"] = {};

  for (const [id, list] of Object.entries(state.statusesById)) {
    const filtered = list.filter((s) => s.expiresOnTurn > turn);
    if (filtered.length) next[id as PieceId] = filtered;
  }

  return { ...state, statusesById: next };
}

// --- Board utility ---
export function adjacentSquares(square: Square): Square[] {
  const file = square.charCodeAt(0); // 'a'..'h'
  const rank = Number(square[1]); // 1..8
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
