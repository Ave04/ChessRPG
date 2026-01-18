import { Chess, Move } from "chess.js";
import type { Square } from "chess.js";

export type Side = "w" | "b";

export type LegalMove = {
  from: Square;
  to: Square;
  san: string;
  isCapture: boolean;
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
  // verbose gives us info like capture flag
  const moves = chess.moves({ square: from, verbose: true }) as Move[];
  return moves.map((m) => ({
    from: m.from as Square,
    to: m.to as Square,
    san: m.san,
    isCapture: Boolean(m.captured),
  }));
}

export function tryMove(chess: Chess, from: Square, to: Square): { ok: boolean; san?: string } {
  const result = chess.move({ from, to, promotion: "q" }); // auto-queen for now
  if (!result) return { ok: false };
  return { ok: true, san: result.san };
}