import type { PieceCode } from "../logic/boardMap";

const WHITE: Record<string, string> = {
  P: "♙",
  N: "♘",
  B: "♗",
  R: "♖",
  Q: "♕",
  K: "♔",
};

const BLACK: Record<string, string> = {
  P: "♟",
  N: "♞",
  B: "♝",
  R: "♜",
  Q: "♛",
  K: "♚",
};

export function pieceToGlyph(piece: PieceCode): string {
  if (!piece) return "";
  const side = piece[0]; // w/b
  const type = piece[1]; // P/N/B/R/Q/K
  return side === "w" ? WHITE[type] : BLACK[type];
}
