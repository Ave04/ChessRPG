import { useMemo, useState } from "react";
import type { Square } from "chess.js";
import "./App.css";
import { ABILITY_BULWARK } from "./features/RPG/logic/rpgHelpers";
import {
  isCaptureBlockedByShield,
  removeShield,
} from "./features/RPG/logic/captureRules";

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

import {
  ABILITY_CHARGE,
  adjacentSquares,
  canAfford,
  getCooldownAvailableTurn,
  hasStatus,
  moveStatuses,
  removeExpiredStatuses,
  setCooldown,
  spendMana,
  addStatus,
} from "./features/RPG/logic/rpgHelpers";

type Mode = "NORMAL" | "CHARGE_MOVE" | "CHARGE_PICK_TARGET";

export default function App() {
  const chess = useMemo(() => createGame(), []);
  const [fen, setFen] = useState(getFen(chess));

  const [selected, setSelected] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Set<Square>>(new Set());
  const [captureTargets, setCaptureTargets] = useState<Set<Square>>(new Set());
  const [lastMove, setLastMove] = useState<string | null>(null);

  const [game, setGame] = useState(createInitialGameState());

  // Charge casting state
  const [mode, setMode] = useState<Mode>("NORMAL");
  const [chargeFrom, setChargeFrom] = useState<Square | null>(null);
  const [chargePieceKey, setChargePieceKey] = useState<string | null>(null);
  const [chargeLanding, setChargeLanding] = useState<Square | null>(null);
  const [chargeEnemyTargets, setChargeEnemyTargets] = useState<Set<Square>>(
    new Set(),
  );

  const turn = getTurn(chess);
  const inCheck = isInCheck(chess);
  const gameOver = isGameOver(chess);

  const rootedSquares = getStatusSquares("ROOTED");
  const shieldedSquares = getStatusSquares("SHIELDED");

  function getStatusSquares(type: "ROOTED" | "SHIELDED"): Set<Square> {
    const out = new Set<Square>();
    for (const [sq, list] of Object.entries(game.statuses)) {
      if (list.some((s) => s.type === type)) out.add(sq as Square);
    }
    return out;
  }

  function isRook(square: Square): boolean {
    const p = chess.get(square);
    return Boolean(p && p.color === turn && p.type === "r");
  }

  function onCastBulwark() {
    if (!selected || !isRook(selected)) return;

    const pieceKey = `rook@${selected}`;
    const availableOn = getCooldownAvailableTurn(
      game,
      pieceKey,
      ABILITY_BULWARK,
    );

    if (game.turnNumber < availableOn) return;
    if (!canAfford(game, turn, 1)) return;
    if (isRooted(selected)) return; // optional: rooted rook can’t cast

    setGame((prev) => {
      let next = spendMana(prev, turn, 1);
      next = setCooldown(next, pieceKey, ABILITY_BULWARK, next.turnNumber + 3);

      // Shield lasts until next turn number (simple MVP)
      const shieldUntil = next.turnNumber + 1;
      next = addStatus(next, selected, {
        type: "SHIELDED",
        expiresOnTurn: shieldUntil,
      });

      return {
        ...next,
        log: ["Bulwark (Shielded rook)", ...next.log].slice(0, 10),
      };
    });
  }

  function clearSelection() {
    setSelected(null);
    setLegalTargets(new Set());
    setCaptureTargets(new Set());
  }

  function clearCharge() {
    setMode("NORMAL");
    setChargeFrom(null);
    setChargePieceKey(null);
    setChargeLanding(null);
    setChargeEnemyTargets(new Set());
  }

  // function pieceAt(square: Square): string | null {
  //   const p = chess.get(square);
  //   if (!p) return null;
  //   // p.type is lowercase: p,n,b,r,q,k
  //   // p.color is 'w' or 'b'
  //   return `${p.color}${p.type.toUpperCase()}`; // wN, bP, etc
  // }

  function isOwnPiece(square: Square): boolean {
    const p = chess.get(square);
    return Boolean(p && p.color === turn);
  }

  function isKnight(square: Square): boolean {
    const p = chess.get(square);
    return Boolean(p && p.color === turn && p.type === "n");
  }

  function isRooted(square: Square): boolean {
    return hasStatus(game, square, "ROOTED");
  }

  function showMovesFor(square: Square) {
    if (isRooted(square)) {
      setSelected(square);
      setLegalTargets(new Set());
      setCaptureTargets(new Set());
      return;
    }

    const moves = getLegalMovesFrom(chess, square);
    const targets = new Set<Square>();
    const captures = new Set<Square>();

    moves.forEach((m) => {
      targets.add(m.to);
      if (m.isCapture) captures.add(m.to);
    });

    setSelected(square);
    setLegalTargets(targets);
    setCaptureTargets(captures);
  }

  function onCastCharge() {
    if (!selected || !isKnight(selected)) return;

    // pieceKey: for MVP, use the square it currently sits on at cast time
    const pieceKey = `knight@${selected}`;
    const availableOn = getCooldownAvailableTurn(
      game,
      pieceKey,
      ABILITY_CHARGE,
    );

    if (game.turnNumber < availableOn) return;
    if (!canAfford(game, turn, 1)) return;
    if (isRooted(selected)) return;

    setMode("CHARGE_MOVE");
    setChargeFrom(selected);
    setChargePieceKey(pieceKey);
    // highlight normal knight moves (we will reuse legalTargets)
    showMovesFor(selected);
  }

  function endTurnPostMove(san: string, movedFrom: Square, movedTo: Square) {
    setFen(getFen(chess));
    setLastMove(san);

    // move statuses with the piece that moved
    setGame((prev) => {
      let next = { ...prev, turnNumber: prev.turnNumber + 1 };
      next = removeExpiredStatuses(next);

      // move statuses from->to (if any)
      next = moveStatuses(next, movedFrom, movedTo);

      const nextTurn = getTurn(chess);
      next = regenManaForSide(next, nextTurn);

      return {
        ...next,
        log: [san, ...next.log].slice(0, 10),
      };
    });
  }

  function onSquareClick(sq: Square) {
    if (gameOver.over) return;

    // --- If rooted, you can't move that piece (NORMAL mode)
    if (mode === "NORMAL" && selected && selected === sq && isRooted(sq)) {
      // selecting rooted piece is allowed, but it will show moves; we will block execution on move attempt too
    }

    // === CHARGE: pick adjacent enemy to root after landing
    if (mode === "CHARGE_PICK_TARGET") {
      if (!chargeLanding) return;

      // must click an enemy adjacent target
      if (chargeEnemyTargets.has(sq)) {
        setGame((prev) => {
          const rootedUntil = prev.turnNumber + 2; // expires after opponent completes a turn (simple MVP)
          const next = addStatus(prev, sq, {
            type: "ROOTED",
            expiresOnTurn: rootedUntil,
          });
          return {
            ...next,
            log: [`Rooted ${sq}`, ...next.log].slice(0, 10),
          };
        });
        clearSelection();
        clearCharge();
        return;
      }

      // clicking elsewhere cancels target pick (but keeps move result)
      clearSelection();
      clearCharge();
      return;
    }

    // === CHARGE: move step
    if (mode === "CHARGE_MOVE") {
      if (!chargeFrom || !chargePieceKey) return;

      // must click one of the highlighted legal targets
      if (selected && legalTargets.has(sq)) {
        const result = tryMove(chess, selected, sq);
        if (result.ok) {
          // spend mana + set cooldown
          setGame((prev) => {
            let next = spendMana(prev, turn, 1);
            // cooldown means usable again on turnNumber + 2
            next = setCooldown(
              next,
              chargePieceKey,
              ABILITY_CHARGE,
              next.turnNumber + 2,
            );
            return {
              ...next,
              log: [`Charge (${result.san})`, ...next.log].slice(0, 10),
            };
          });

          // after moving, check adjacent enemy pieces to allow rooting
          const adj = adjacentSquares(sq);
          const enemySquares = new Set<Square>();
          adj.forEach((a) => {
            const p = chess.get(a);
            if (p && p.color !== turn) enemySquares.add(a);
          });

          // finish the move turn logic (updates fen, ticks turn, regen, etc.)
          endTurnPostMove(result.san ?? "Move", chargeFrom, sq);

          // if there are adjacent enemies, allow picking one to root
          if (enemySquares.size > 0) {
            setMode("CHARGE_PICK_TARGET");
            setChargeLanding(sq);
            setChargeEnemyTargets(enemySquares);
            // highlight those squares as "capture targets" (ring) for visibility
            setLegalTargets(new Set()); // clear normal move dots
            setCaptureTargets(enemySquares);
            setSelected(null);
            return;
          }

          clearSelection();
          clearCharge();
        }
        return;
      }

      // clicking elsewhere cancels cast mode
      clearSelection();
      clearCharge();
      return;
    }

    // === NORMAL: attempt a normal move
    if (selected && legalTargets.has(sq)) {
      // block move if rooted
      if (isRooted(selected)) {
        clearSelection();
        return;
      }

      // if this is a capture attempt and target is shielded, block capture + remove shield
      const isCaptureAttempt = captureTargets.has(sq);
      if (isCaptureAttempt && isCaptureBlockedByShield(game, sq)) {
        setGame((prev) => {
          const next = removeShield(prev, sq);
          return {
            ...next,
            log: [`Shield blocked capture on ${sq}`, ...next.log].slice(0, 10),
          };
        });
        clearSelection();
        return;
      }

      const from = selected;
      const result = tryMove(chess, selected, sq);
      if (result.ok) {
        endTurnPostMove(result.san ?? "Move", from, sq);
      }
      clearSelection();
      return;
    }

    // === NORMAL: select a square
    if (!isOwnPiece(sq)) {
      clearSelection();
      return;
    }

    showMovesFor(sq);
  }

  // Ability info shown in HUD (only for Knights for now)
  const ability =
    selected && isKnight(selected)
      ? (() => {
          const pieceKey = `knight@${selected}`;
          const availableOn = getCooldownAvailableTurn(
            game,
            pieceKey,
            ABILITY_CHARGE,
          );

          if (isRooted(selected)) {
            return {
              title: "Charge",
              description:
                "Cost 1. Move like a knight, then root an adjacent enemy for 1 turn. CD 2.",
              enabled: false,
              reasonDisabled: "This knight is Rooted.",
              onClick: onCastCharge,
            };
          }

          if (!canAfford(game, turn, 1)) {
            return {
              title: "Charge",
              description:
                "Cost 1. Move like a knight, then root an adjacent enemy for 1 turn. CD 2.",
              enabled: false,
              reasonDisabled: "Not enough mana.",
              onClick: onCastCharge,
            };
          }

          if (game.turnNumber < availableOn) {
            return {
              title: "Charge",
              description:
                "Cost 1. Move like a knight, then root an adjacent enemy for 1 turn. CD 2.",
              enabled: false,
              reasonDisabled: `On cooldown (ready on turn ${availableOn}).`,
              onClick: onCastCharge,
            };
          }

          return {
            title: "Charge",
            description:
              "Cost 1. Move like a knight, then root an adjacent enemy for 1 turn. CD 2.",
            enabled: true,
            onClick: onCastCharge,
          };
        })()
      : selected && isRook(selected)
        ? (() => {
            const pieceKey = `rook@${selected}`;
            const availableOn = getCooldownAvailableTurn(
              game,
              pieceKey,
              ABILITY_BULWARK,
            );

            if (isRooted(selected)) {
              return {
                title: "Bulwark",
                description:
                  "Cost 1. Shield this rook until your next turn. CD 3.",
                enabled: false,
                reasonDisabled: "This rook is Rooted.",
                onClick: onCastBulwark,
              };
            }

            if (!canAfford(game, turn, 1)) {
              return {
                title: "Bulwark",
                description:
                  "Cost 1. Shield this rook until your next turn. CD 3.",
                enabled: false,
                reasonDisabled: "Not enough mana.",
                onClick: onCastBulwark,
              };
            }

            if (game.turnNumber < availableOn) {
              return {
                title: "Bulwark",
                description:
                  "Cost 1. Shield this rook until your next turn. CD 3.",
                enabled: false,
                reasonDisabled: `On cooldown (ready on turn ${availableOn}).`,
                onClick: onCastBulwark,
              };
            }

            return {
              title: "Bulwark",
              description:
                "Cost 1. Shield this rook until your next turn. CD 3.",
              enabled: true,
              onClick: onCastBulwark,
            };
          })()
        : null;

  const modeLabel =
    mode === "CHARGE_MOVE"
      ? "Casting: Charge — pick a knight move"
      : mode === "CHARGE_PICK_TARGET"
        ? "Charge — pick an adjacent enemy to Root"
        : null;

  return (
    <div className="app">
      <div className="shell">
        <Board
          fen={fen}
          selected={selected}
          legalTargets={legalTargets}
          captureTargets={captureTargets}
          onSquareClick={onSquareClick}
          rootedSquares={rootedSquares}
          shieldedSquares={shieldedSquares}
        />
        <HUD
          turn={turn}
          inCheck={inCheck}
          gameOver={gameOver}
          lastMove={lastMove}
          mana={game.mana}
          maxMana={game.maxMana}
          ability={ability}
          modeLabel={modeLabel}
        />
      </div>
    </div>
  );
}
