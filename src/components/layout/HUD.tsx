type Props = {
  turn: "w" | "b";
  inCheck: boolean;
  gameOver: { over: boolean; reason?: string };
  lastMove: string | null;

  mana: {w: number; b: number };
  maxMana: {w: number; b: number};
};

function ManaRow({ label, value, max }: {label: string; value: number;  max: number}) {
  const gems = Array.from({ length: max}, (_, i) => (i < value ? "◆" : "◇")).join("");
  return (
    <div className="hudRow" style={{justifyContent: "space-between"}}>
      <div className="label">{label}</div>
      <div className="value" style={{ letterSpacing: 1}}>{gems}</div>
    </div>
  )
}

export function HUD({ turn, inCheck, gameOver, lastMove, mana, maxMana }: Props) {
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

      <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.12)", margin: "14px 0"}}/>

      <ManaRow label="White Mana" value={mana.w} max={maxMana.w} />
      <ManaRow label="Black Mana" value={mana.b} max={maxMana.b} />

      <div className="hint" style={{ marginTop: 14 }}>
        Mana regenerates by 1 at the start of your turn (max 3).
      </div>
    </div>
  );
}