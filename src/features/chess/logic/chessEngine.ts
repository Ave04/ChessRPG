import { Chess, Move } from "chess.js";
import type { Square } from "chess.js";

export type Side = "w" | "b";

export type LegalMove = {
  from: Square;
  to: Square;
  san: string;
  isCapture: boolean;
};

export type MoveInfo = {
  from: Square;
  to: Square;
  flags: string; // chess.js flags string e.g. "n", "b", "c", "e", "k", "q", "p"
  piece: "p" | "n" | "b" | "r" | "q" | "k"; // moved piece type (before promotion)
  color: Side;
  captured?: "p" | "n" | "b" | "r" | "q" | "k";
  promotion?: "p" | "n" | "b" | "r" | "q" | "k";
};

export function createGame() {
  return new Chess();
}

export function getTurn(chess: Chess): Side {
  return chess.turn() as Side;
}

export function getFen(chess: Chess): string {
  return chess.fen();
}

export function isInCheck(chess: Chess): boolean {
  // depending on chess.js version, it can be inCheck() or isCheck()
  // your earlier code used inCheck(), so keep it
  return chess.inCheck();
}

export function isGameOver(chess: Chess): { over: boolean; reason?: string } {
  if (!chess.isGameOver()) return { over: false };

  if (chess.isCheckmate()) return { over: true, reason: "Checkmate" };
  if (chess.isStalemate()) return { over: true, reason: "Stalemate" };
  if (chess.isDraw()) return { over: true, reason: "Draw" };
  return { over: true, reason: "Game over" };
}

export function getLegalMovesFrom(chess: Chess, from: Square): LegalMove[] {
  const moves = chess.moves({ square: from, verbose: true }) as Move[];

  return moves.map((m) => ({
    from: m.from as Square,
    to: m.to as Square,
    san: m.san,
    isCapture: Boolean(m.captured),
  }));
}

// ✅ now returns MoveInfo so registry can update persistent IDs
export function tryMove(
  chess: Chess,
  from: Square,
  to: Square,
): { ok: boolean; san?: string; move?: MoveInfo } {
  const result = chess.move({ from, to, promotion: "q" }); // auto-queen promotion for now
  if (!result) return { ok: false };

  const move: MoveInfo = {
    from: result.from as Square,
    to: result.to as Square,
    flags: result.flags,
    piece: result.piece as MoveInfo["piece"],
    color: result.color as Side,
    captured: (result.captured as MoveInfo["captured"]) ?? undefined,
    promotion: (result.promotion as MoveInfo["promotion"]) ?? undefined,
  };

  return { ok: true, san: result.san, move };
}
