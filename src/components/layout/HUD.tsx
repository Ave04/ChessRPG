import React from "react";

type Props = {
  turn: "w" | "b";
  inCheck: boolean;
  gameOver: { over: boolean; reason?: string };
  lastMove: string | null;
};

export function HUD({ turn, inCheck, gameOver, lastMove }: Props) {
  return (
    <div className="hud">
      <div className="hudRow">
        <div className="badge">
          Turn: <b>{turn === "w" ? "White" : "Black"}</b>
        </div>
        {inCheck && <div className="badge danger">Check!</div>}
        {gameOver.over && <div className="badge danger">{gameOver.reason}</div>}
      </div>

      <div className="hudRow">
        <div className="label">Last move:</div>
        <div className="value">{lastMove ?? "—"}</div>
      </div>

      <div className="hint">
        Click a piece to see legal moves. Click a highlighted square to move.
      </div>
    </div>
  );
}