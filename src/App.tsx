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

import {
  ABILITY_CHARGE,
  ABILITY_BULWARK,
  adjacentSquares,
  canAfford,
  getCooldownAvailableTurn,
  hasStatusById,
  removeExpiredStatuses,
  setCooldown,
  spendMana,
  addStatusById,
} from "./features/RPG/logic/rpgHelpers";

import {
  applyMoveToRegistry,
  type MoveInfo,
} from "./features/chess/logic/pieceIds";

type Mode = "NORMAL" | "CHARGE_MOVE" | "CHARGE_PICK_TARGET";

export default function App() {
  const chess = useMemo(() => createGame(), []);
  const [fen, setFen] = useState(getFen(chess));

  const [selected, setSelected] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Set<Square>>(new Set());
  const [captureTargets, setCaptureTargets] = useState<Set<Square>>(new Set());
  const [lastMove, setLastMove] = useState<string | null>(null);

  // IMPORTANT: initial game state needs the chess instance to seed piece IDs
  const [game, setGame] = useState(() => createInitialGameState(chess));

  // Charge casting state
  const [mode, setMode] = useState<Mode>("NORMAL");
  const [chargeFrom, setChargeFrom] = useState<Square | null>(null);
  const [chargePieceId, setChargePieceId] = useState<string | null>(null);
  const [chargeLanding, setChargeLanding] = useState<Square | null>(null);
  const [chargeEnemyTargets, setChargeEnemyTargets] = useState<Set<Square>>(
    new Set(),
  );

  const turn = getTurn(chess);
  const inCheck = isInCheck(chess);
  const gameOver = isGameOver(chess);

  // ---------- PieceId helpers (persistent identity) ----------
  function getIdAt(square: Square): string | null {
    return (game.registry.squareToId as any)[square] ?? null;
  }

  function isRooted(square: Square): boolean {
    const id = getIdAt(square);
    return id ? hasStatusById(game, id, "ROOTED") : false;
  }

  function isShieldedSquare(square: Square): boolean {
    const id = getIdAt(square);
    return id ? hasStatusById(game, id, "SHIELDED") : false;
  }

  function consumeShieldAt(square: Square) {
    const id = getIdAt(square);
    if (!id) return;

    setGame((prev) => {
      const list = prev.statusesById[id] ?? [];
      const filtered = list.filter((s) => s.type !== "SHIELDED");

      const nextStatuses = { ...prev.statusesById };
      if (filtered.length) nextStatuses[id] = filtered;
      else delete nextStatuses[id];

      return { ...prev, statusesById: nextStatuses };
    });
  }

  function getStatusSquares(type: "ROOTED" | "SHIELDED"): Set<Square> {
    const out = new Set<Square>();
    for (const [sq, id] of Object.entries(game.registry.squareToId)) {
      const list = game.statusesById[id] ?? [];
      if (list.some((s) => s.type === type)) out.add(sq as Square);
    }
    return out;
  }

  const rootedSquares = getStatusSquares("ROOTED");
  const shieldedSquares = getStatusSquares("SHIELDED");

  // ---------- selection / UI helpers ----------
  function clearSelection() {
    setSelected(null);
    setLegalTargets(new Set());
    setCaptureTargets(new Set());
  }

  function clearCharge() {
    setMode("NORMAL");
    setChargeFrom(null);
    setChargePieceId(null);
    setChargeLanding(null);
    setChargeEnemyTargets(new Set());
  }

  function isOwnPiece(square: Square): boolean {
    const p = chess.get(square);
    return Boolean(p && p.color === turn);
  }

  function isKnight(square: Square): boolean {
    const p = chess.get(square);
    return Boolean(p && p.color === turn && p.type === "n");
  }

  function isRook(square: Square): boolean {
    const p = chess.get(square);
    return Boolean(p && p.color === turn && p.type === "r");
  }

  function showMovesFor(square: Square) {
    // UX: rooted piece can be selected, but shows no moves
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

  // ---------- Turn helpers ----------
  function pruneDeadIds(next: typeof game) {
    // if a piece got captured, its ID disappears from registry.idToPiece
    const live = new Set(Object.keys(next.registry.idToPiece));

    const statusesById: typeof next.statusesById = {};
    for (const [id, list] of Object.entries(next.statusesById)) {
      if (live.has(id)) statusesById[id] = list;
    }

    const cooldowns: typeof next.cooldowns = {};
    for (const [id, cd] of Object.entries(next.cooldowns)) {
      if (live.has(id)) cooldowns[id] = cd;
    }

    return { ...next, statusesById, cooldowns };
  }

  function endTurnPostMove(san: string, move: MoveInfo) {
    setFen(getFen(chess));
    setLastMove(san);

    setGame((prev) => {
      let next = { ...prev, turnNumber: prev.turnNumber + 1 };

      // expire statuses at the start of the new turnNumber
      next = removeExpiredStatuses(next);

      // update registry (moves IDs, handles capture/castle/promo/en-passant)
      next = { ...next, registry: applyMoveToRegistry(next.registry, move) };

      // clean up statuses/cooldowns for captured IDs
      next = pruneDeadIds(next);

      const nextTurn = getTurn(chess);
      next = regenManaForSide(next, nextTurn);

      return {
        ...next,
        log: [san, ...next.log].slice(0, 10),
      };
    });
  }

  // This one flips side-to-move WITHOUT changing the board:
  // we toggle the "side to move" field in FEN and reload it.
  function endTurnNoMove(label: string) {
    // Flip chess.js turn by toggling FEN side-to-move
    const currentFen = getFen(chess);
    const parts = currentFen.split(" ");
    if (parts.length >= 2) {
      parts[1] = parts[1] === "w" ? "b" : "w";
      const toggledFen = parts.join(" ");
      chess.load(toggledFen);
    }

    setFen(getFen(chess));
    setLastMove(label);

    const nextTurn = getTurn(chess);

    setGame((prev) => {
      let next = { ...prev, turnNumber: prev.turnNumber + 1 };
      next = removeExpiredStatuses(next);
      next = regenManaForSide(next, nextTurn);

      return {
        ...next,
        log: [label, ...next.log].slice(0, 10),
      };
    });
  }

  // ---------- Abilities ----------
  function onCastCharge() {
    if (!selected || !isKnight(selected)) return;

    const id = getIdAt(selected);
    if (!id) return;

    const availableOn = getCooldownAvailableTurn(game, id, ABILITY_CHARGE);

    if (game.turnNumber < availableOn) return;
    if (!canAfford(game, turn, 1)) return;
    if (isRooted(selected)) return;

    setMode("CHARGE_MOVE");
    setChargeFrom(selected);
    setChargePieceId(id);

    showMovesFor(selected);
  }

  function onCastBulwark() {
    if (!selected || !isRook(selected)) return;

    const id = getIdAt(selected);
    if (!id) return;

    const availableOn = getCooldownAvailableTurn(game, id, ABILITY_BULWARK);

    if (game.turnNumber < availableOn) return;
    if (!canAfford(game, turn, 1)) return;
    if (isRooted(selected)) return;

    setGame((prev) => {
      let next = spendMana(prev, turn, 1);
      next = setCooldown(next, id, ABILITY_BULWARK, next.turnNumber + 3);

      // shield lasts until your next turn (simple MVP)
      const shieldUntil = next.turnNumber + 1;
      next = addStatusById(next, id, {
        type: "SHIELDED",
        expiresOnTurn: shieldUntil,
      });

      return {
        ...next,
        log: ["Bulwark (Shielded rook)", ...next.log].slice(0, 10),
      };
    });
  }

  // ---------- Click handler ----------
  function onSquareClick(sq: Square) {
    if (gameOver.over) return;

    // === CHARGE: pick adjacent enemy to root after landing
    if (mode === "CHARGE_PICK_TARGET") {
      if (!chargeLanding) return;

      // must click an enemy adjacent target
      if (chargeEnemyTargets.has(sq)) {
        const targetId = getIdAt(sq);
        if (!targetId) return;

        setGame((prev) => {
          const rootedUntil = prev.turnNumber + 2; // target loses next move
          const next = addStatusById(prev, targetId, {
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

      // click elsewhere cancels target pick
      clearSelection();
      clearCharge();
      return;
    }

    // === CHARGE: move step
    if (mode === "CHARGE_MOVE") {
      if (!chargeFrom || !chargePieceId) return;

      // must click one of the highlighted legal targets
      if (selected && legalTargets.has(sq)) {
        const result = tryMove(chess, selected, sq);

        if (result.ok) {
          // spend mana + set cooldown on the PIECE ID (not square)
          setGame((prev) => {
            let next = spendMana(prev, turn, 1);
            next = setCooldown(
              next,
              chargePieceId,
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

          // finish turn + registry update
          endTurnPostMove(result.san ?? "Move", result.move as MoveInfo);

          // if there are adjacent enemies, allow picking one to root
          if (enemySquares.size > 0) {
            setMode("CHARGE_PICK_TARGET");
            setChargeLanding(sq);
            setChargeEnemyTargets(enemySquares);

            setLegalTargets(new Set());
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
      // rooted piece can't move
      if (isRooted(selected)) {
        clearSelection();
        return;
      }

      // capture blocked by shield (consume shield + spend turn)
      const isCaptureAttempt = captureTargets.has(sq);
      if (isCaptureAttempt && isShieldedSquare(sq)) {
        consumeShieldAt(sq);
        endTurnNoMove(`Shield blocked capture on ${sq}`);
        clearSelection();
        return;
      }

      const result = tryMove(chess, selected, sq);
      if (result.ok) {
        endTurnPostMove(result.san ?? "Move", result.move as MoveInfo);
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

  // ---------- HUD ability ----------
  const ability =
    selected && isKnight(selected)
      ? (() => {
          const id = getIdAt(selected);
          if (!id) return null;

          const availableOn = getCooldownAvailableTurn(
            game,
            id,
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
            const id = getIdAt(selected);
            if (!id) return null;

            const availableOn = getCooldownAvailableTurn(
              game,
              id,
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
