import React from "react";
import type { Square } from "chess.js";
import { fenToBoardMap, isDarkSquare } from "../logic/boardMap";
import { pieceToGlyph } from "./pieces";

type Props = {
  fen: string;
  selected: Square | null;
  legalTargets: Set<Square>;
  captureTargets: Set<Square>;
  onSquareClick: (sq: Square) => void;
};

const files = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

export function Board({
  fen,
  selected,
  legalTargets,
  captureTargets,
  onSquareClick,
}: Props) {
  const map = fenToBoardMap(fen);

  // Render ranks 8..1
  const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

  return (
    <div className="board">
      {ranks.map((rank) =>
        files.map((file) => {
          const sq = `${file}${rank}` as Square;
          const piece = map[sq];
          const dark = isDarkSquare(sq);
          const isSelected = selected === sq;
          const isTarget = legalTargets.has(sq);
          const isCapture = captureTargets.has(sq);

          return (
            <button
              key={sq}
              className={[
                "square",
                dark ? "dark" : "light",
                isSelected ? "selected" : "",
                isTarget ? "target" : "",
                isCapture ? "capture" : "",
              ].join(" ")}
              onClick={() => onSquareClick(sq)}
              type="button"
              aria-label={sq}
            >
              <span className="piece">{pieceToGlyph(piece)}</span>
              {/* dot overlay for normal target */}
              {isTarget && !isCapture && <span className="dot" />}
              {/* ring overlay for capture */}
              {isCapture && <span className="ring" />}
            </button>
          );
        })
      )}
    </div>
  );
}