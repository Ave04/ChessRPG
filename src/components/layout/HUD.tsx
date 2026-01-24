
type Props = {
  turn: "w" | "b";
  inCheck: boolean;
  gameOver: { over: boolean; reason?: string };
  lastMove: string | null;

  mana: { w: number; b: number };
  maxMana: { w: number; b: number };

  // ability UI
  ability?: {
    title: string;
    description: string;
    enabled: boolean;
    reasonDisabled?: string;
    onClick: () => void;
  } | null;

  modeLabel?: string | null;
};

function ManaRow({ label, value, max }: { label: string; value: number; max: number }) {
  const gems = Array.from({ length: max }, (_, i) => (i < value ? "◆" : "◇")).join(" ");
  return (
    <div className="hudRow" style={{ justifyContent: "space-between" }}>
      <div className="label">{label}</div>
      <div className="value" style={{ letterSpacing: 1 }}>{gems}</div>
    </div>
  );
}

export function HUD({
  turn,
  inCheck,
  gameOver,
  lastMove,
  mana,
  maxMana,
  ability,
  modeLabel,
}: Props) {
  return (
    <div className="hud">
      <div className="hudRow">
        <div className="badge">
          Turn: <b>{turn === "w" ? "White" : "Black"}</b>
        </div>
        {inCheck && <div className="badge danger">Check!</div>}
        {gameOver.over && <div className="badge danger">{gameOver.reason}</div>}
      </div>

      {modeLabel && (
        <div className="hudRow">
          <div className="badge">{modeLabel}</div>
        </div>
      )}

      <div className="hudRow">
        <div className="label">Last move:</div>
        <div className="value">{lastMove ?? "—"}</div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.12)", margin: "14px 0" }} />

      <ManaRow label="White Mana" value={mana.w} max={maxMana.w} />
      <ManaRow label="Black Mana" value={mana.b} max={maxMana.b} />

      <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.12)", margin: "14px 0" }} />

      <div className="label" style={{ marginBottom: 8 }}>Ability</div>

      {ability ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div className="value" style={{ fontWeight: 700 }}>{ability.title}</div>
          <div className="label" style={{ lineHeight: 1.4 }}>{ability.description}</div>
          <button
            className="abilityBtn"
            onClick={ability.onClick}
            disabled={!ability.enabled}
            type="button"
            title={!ability.enabled ? ability.reasonDisabled : undefined}
          >
            Cast
          </button>
          {!ability.enabled && ability.reasonDisabled && (
            <div className="label">{ability.reasonDisabled}</div>
          )}
        </div>
      ) : (
        <div className="label">Select a piece with an ability.</div>
      )}
    </div>
  );
}