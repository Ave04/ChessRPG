import type { Square } from "chess.js";

export type PieceCode = string | null; // e.g., "wP", "bK", null

const files = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

export function fenToBoardMap(fen: string): Record<Square, PieceCode> {
  // fen like: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  const piecePlacement = fen.split(" ")[0];
  const ranks = piecePlacement.split("/"); // 8 ranks top -> bottom

  const map = {} as Record<Square, PieceCode>;

  for (let r = 0; r < 8; r++) {
    const rankStr = ranks[r];
    let fileIndex = 0;

    for (const ch of rankStr) {
      if (/\d/.test(ch)) {
        fileIndex += Number(ch);
      } else {
        const isWhite = ch === ch.toUpperCase();
        const pieceLetter = ch.toUpperCase(); // P,N,B,R,Q,K
        const file = files[fileIndex];
        const rank = 8 - r; // r=0 => rank 8
        const sq = `${file}${rank}` as Square;
        map[sq] = `${isWhite ? "w" : "b"}${pieceLetter}`;
        fileIndex++;
      }
    }
  }

  // Fill empty squares explicitly (useful for UI)
  for (let rank = 1; rank <= 8; rank++) {
    for (const file of files) {
      const sq = `${file}${rank}` as Square;
      if (!(sq in map)) map[sq] = null;
    }
  }

  return map;
}

export function isDarkSquare(square: Square): boolean {
  const file = square.charCodeAt(0) - "a".charCodeAt(0) + 1; // a=1..h=8
  const rank = Number(square[1]);
  return (file + rank) % 2 === 0;
}