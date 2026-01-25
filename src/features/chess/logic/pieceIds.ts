import type { Square } from "chess.js";
import type { Side } from "./types";

export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type PieceId = string;

export type PieceRegistry = {
  squareToId: Record<string, PieceId>;
  idToPiece: Record<PieceId, { side: Side; type: PieceType }>;
  nextId: number;
};

export type MoveInfo = {
  from: Square;
  to: Square;
  flags: string; // chess.js flags string (e.g. "c", "e", "k", "q", "p" etc)
  piece: PieceType; // moved piece type BEFORE promotion
  color: Side;
  captured?: PieceType;
  promotion?: PieceType;
};

function makeId(side: Side, type: PieceType, n: number) {
  return `${side}${type}-${n}`;
}

export function initRegistryFromChess(chess: any): PieceRegistry {
  const squareToId: Record<string, PieceId> = {};
  const idToPiece: Record<PieceId, { side: Side; type: PieceType }> = {};

  let nextId = 1;
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

  for (const r of ranks) {
    for (const f of files) {
      const sq = `${f}${r}` as Square;
      const p = chess.get(sq);
      if (!p) continue;

      const id = makeId(p.color, p.type, nextId++);
      squareToId[sq] = id;
      idToPiece[id] = { side: p.color, type: p.type };
    }
  }

  return { squareToId, idToPiece, nextId };
}

export function applyMoveToRegistry(
  reg: PieceRegistry,
  move: MoveInfo,
): PieceRegistry {
  const squareToId = { ...reg.squareToId };
  const idToPiece = { ...reg.idToPiece };

  const movingId = squareToId[move.from];
  if (!movingId) return reg; // should not happen

  // --- handle captures
  // normal capture: remove ID on 'to'
  if (move.captured && squareToId[move.to]) {
    const capturedId = squareToId[move.to];
    delete squareToId[move.to];
    delete idToPiece[capturedId];
  }

  // en passant capture: captured pawn is not on 'to'
  // chess.js uses flag "e" for en passant
  if (move.flags.includes("e")) {
    const toFile = move.to[0];
    const toRank = Number(move.to[1]);
    const capSq =
      `${toFile}${move.color === "w" ? toRank - 1 : toRank + 1}` as Square;
    const capturedId = squareToId[capSq];
    if (capturedId) {
      delete squareToId[capSq];
      delete idToPiece[capturedId];
    }
  }

  // --- move the piece ID
  delete squareToId[move.from];
  squareToId[move.to] = movingId;

  // --- promotions: keep same ID, update type
  if (move.promotion) {
    idToPiece[movingId] = { ...idToPiece[movingId], type: move.promotion };
  }

  // --- castling: rook also moves
  // chess.js uses flags "k" (king-side) and "q" (queen-side)
  if (move.flags.includes("k")) {
    // king moved e1->g1 or e8->g8, rook h-file -> f-file
    const rank = move.color === "w" ? "1" : "8";
    const rookFrom = `h${rank}` as Square;
    const rookTo = `f${rank}` as Square;
    const rookId = squareToId[rookFrom];
    if (rookId) {
      delete squareToId[rookFrom];
      squareToId[rookTo] = rookId;
    }
  }

  if (move.flags.includes("q")) {
    // king moved e1->c1 or e8->c8, rook a-file -> d-file
    const rank = move.color === "w" ? "1" : "8";
    const rookFrom = `a${rank}` as Square;
    const rookTo = `d${rank}` as Square;
    const rookId = squareToId[rookFrom];
    if (rookId) {
      delete squareToId[rookFrom];
      squareToId[rookTo] = rookId;
    }
  }

  return { ...reg, squareToId, idToPiece };
}
