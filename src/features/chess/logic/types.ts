export type Side = "w" | "b";
export type SquareId = string;

export type Status =
    | {type: "ROOTED"; expiresOnTurn: number}
    | {type: "SHIELDED"; expiresOnTurn: number}

export type CooldownMap = Record<string, number>;

export type GameState = {
    turnNumber: number;

    mana: Record<Side, number>;
    maxMana: Record<Side, number>;

    statuses: Record<SquareId, Status[]>;

    cooldowns: Record<string, CooldownMap>;
    
    log: string[];
}