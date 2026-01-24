export type Side = "w" | "b";

export type Status =
    | {type: "ROOTED"; expiresOnTurn: number}
    | {type: "SHIELDED"; expiresOnTurn: number}

export type GameState = {
    turnNumber: number;
    mana: Record<Side, number>;
    maxMana: Record<Side, number>;
    log: string[];
}