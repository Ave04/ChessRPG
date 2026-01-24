import { useMemo, useState } from "react";
import type { Square } from "chess.js";
import "./App.css";

import {
  createGame,
  getFen,
  getLegalMovesFrom,
  getTurn,
  isInCheck,
  isGameOver,
  tryMove,
} from "./features/chess/logic/chessEngine";

import { Board } from "./features/chess/components/Board";
import { HUD } from "./components/layout/HUD";

import { createInitialGameState } from "./features/chess/logic/gameInit";
import { regenManaForSide } from "./features/chess/logic/turnTick";

export default function App() {
  const chess = useMemo(() => createGame(), []);
  const [fen, setFen] = useState(getFen(chess));

  const [selected, setSelected] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Set<Square>>(new Set());
  const [captureTargets, setCaptureTargets] = useState<Set<Square>>(new Set());
  const [lastMove, setLastMove] = useState<string | null>(null);

  const [game, setGame] = useState(createInitialGameState());

  const turn = getTurn(chess);
  const inCheck = isInCheck(chess);
  const gameOver = isGameOver(chess);

  function clearSelection() {
    setSelected(null);
    setLegalTargets(new Set());
    setCaptureTargets(new Set());
  }

  function onSquareClick(sq: Square) {
    if (gameOver.over) return;

    // If we have a selected piece and clicked a legal target -> move
    if (selected && legalTargets.has(sq)) {
      const result = tryMove(chess, selected, sq);
      if (result.ok) {
        setFen(getFen(chess));
        setLastMove(result.san ?? null);

        const nextTurn = getTurn(chess);

        setGame((prev) => {
          const bumped = { ...prev, turnNumber: prev.turnNumber + 1 };
          const regen = regenManaForSide(bumped, nextTurn);
          return {
            ...regen,
            log: [`${result.san ?? "Move"}`, ...regen.log].slice(0,10),
          };
        });
      }
      clearSelection();
      return;
    }

    // Otherwise, select a new square (show moves if any)
    const moves = getLegalMovesFrom(chess, sq);
    if (moves.length === 0) {
      clearSelection();
      return;
    }

    setSelected(sq);

    const targets = new Set<Square>();
    const captures = new Set<Square>();

    moves.forEach((m) => {
      targets.add(m.to);
      if (m.isCapture) captures.add(m.to);
    });

    setLegalTargets(targets);
    setCaptureTargets(captures);
  }

  return (
    <div className="app">
      <div className="shell">
        <Board
          fen={fen}
          selected={selected}
          legalTargets={legalTargets}
          captureTargets={captureTargets}
          onSquareClick={onSquareClick}
        />
        <HUD turn={turn} inCheck={inCheck} gameOver={gameOver} lastMove={lastMove} mana={game.mana} maxMana = {game.maxMana} 
        />
      </div>
    </div>
  );
}