import type { PieceRegistry, PieceId } from "./pieceIds";

export type Side = "w" | "b";

export type Status =
  | { type: "ROOTED"; expiresOnTurn: number }
  | { type: "SHIELDED"; expiresOnTurn: number };

export type CooldownMap = Record<string, number>;

export type GameState = {
  turnNumber: number;

  mana: Record<Side, number>;
  maxMana: Record<Side, number>;

  registry: PieceRegistry;

  statusesById: Record<PieceId, Status[]>;

  cooldowns: Record<string, CooldownMap>;

  log: string[];
};
