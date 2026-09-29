import { useCallback, useEffect, useRef, useState } from "react";

/* ---------- Configuração (edite aqui) ---------- */

// Jogadores que giram nos rolos. Para adicionar mais, basta incluir novos itens na lista.
type Player = {
  name: string;
  number: string;
  description: string;
  reel: string; // imagem que gira nos rolos
  win: string;  // imagem exibida no popup de vitória
};

const PLAYERS: Player[] = [
  {
    name: "Cauê", number: "10", description: "Jogador de rara precisão, raramente precisam dele.",
    reel: "/players/reel/caue.png",   win: "/players/win/caue.jpeg",
  },
  {
    name: "Israel", number: "14", description: "Esse é nosso menino talento:Tá lento na defesa, tá lento no meio, tá lento no ataque",
    reel: "/players/reel/israel.png", win: "/players/win/israel.jpeg",
  },
  {
    name: "Lucca", number: "07", description: "Jogador que busca um ano melhor que ano passado…Só precisa de um gol",
    reel: "/players/reel/lucca.png",  win: "/players/win/lucca.png",
  },
];

// Chance de forçar 3 iguais em cada puxada (0 = puramente aleatório, 1 = sempre ganha)
const WIN_CHANCE = 0.7;

const N = PLAYERS.length;
const REELS = 3;
const SPIN_SPEED = 18; // símbolos por segundo enquanto gira
const FIRST_STOP_MS = 1100;
const STOP_GAP_MS = 650;

/* ---------- Utilitários ---------- */

type Reel = {
  pos: number;
  mode: "idle" | "spin" | "stop";
  from: number;
  to: number;
  t0: number;
  dur: number;
};

const mod = (a: number) => ((a % N) + N) % N;
const easeOutBack = (t: number) => {
  const c1 = 1.2;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/* ---------- Componente ---------- */

export default function SlotMachine() {
  const reels = useRef<Reel[]>(
    Array.from({ length: REELS }, (_, i) => ({
      pos: i * 5, mode: "idle", from: 0, to: 0, t0: 0, dur: 0,
    }))
  );
  const [pos, setPos] = useState<number[]>(reels.current.map((r) => r.pos));
  const [busy, setBusy] = useState(false);
  const [pulled, setPulled] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);

  const raf = useRef(0);
  const last = useRef(0);
  const round = useRef(false);
  const targets = useRef<number[]>([]);
  const timers = useRef<number[]>([]);

  const tick = useCallback((now: number) => {
    const dt = last.current ? Math.min((now - last.current) / 1000, 0.05) : 0;
    last.current = now;
    let active = false;

    for (const r of reels.current) {
      if (r.mode === "spin") {
        r.pos += SPIN_SPEED * dt;
        active = true;
      } else if (r.mode === "stop") {
        const t = Math.min((now - r.t0) / r.dur, 1);
        r.pos = r.from + (r.to - r.from) * easeOutBack(t);
        if (t >= 1) { r.pos = r.to; r.mode = "idle"; } else active = true;
      }
    }
    setPos(reels.current.map((r) => r.pos));

    if (active) {
      raf.current = requestAnimationFrame(tick);
      return;
    }
    last.current = 0;
    if (round.current) {
      round.current = false;
      const res = reels.current.map((r) => mod(Math.round(r.pos)));
      setBusy(false);
      if (res.every((v) => v === res[0])) setWinner(res[0]);
    }
  }, []);

  const stopReel = (i: number) => {
    const r = reels.current[i];
    const base = Math.ceil(r.pos) + N;
    r.from = r.pos;
    r.to = base + mod(targets.current[i] - base);
    r.t0 = performance.now();
    r.dur = 900;
    r.mode = "stop";
  };

  const pull = () => {
    if (busy) return;
    setBusy(true);
    setWinner(null);
    setPulled(true);
    timers.current.push(window.setTimeout(() => setPulled(false), 350));

    const forceWin = Math.random() < WIN_CHANCE;
    const same = Math.floor(Math.random() * N);
    targets.current = Array.from({ length: REELS }, () =>
      forceWin ? same : Math.floor(Math.random() * N)
    );

    reels.current.forEach((r) => (r.mode = "spin"));
    round.current = true;
    raf.current = requestAnimationFrame(tick);
    for (let i = 0; i < REELS; i++) {
      timers.current.push(
        window.setTimeout(() => stopReel(i), FIRST_STOP_MS + i * STOP_GAP_MS)
      );
    }
  };

  useEffect(() => {
    const t = timers.current;
    return () => {
      cancelAnimationFrame(raf.current);
      t.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    PLAYERS.forEach((p) => {
      new Image().src = p.reel;
      new Image().src = p.win;
    });
  }, []);

  useEffect(() => {
    if (winner === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setWinner(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [winner]);

  const winPlayer = winner !== null ? PLAYERS[winner] : null;

  return (
    <div className="sm-root">
      <style>{CSS}</style>

      <h1 className="sm-title">SELENIQUEL</h1>

      <div className="sm-stage">
      <div className="sm-cabinet">
        <div className="sm-marquee">CAÇA-NÍQUEL</div>

        <div className="sm-screen">
          {pos.map((p, i) => {
            const base = Math.floor(p);
            const cells = [-2, -1, 0, 1, 2, 3].map((d) => base + d);
            return (
              <div className="sm-reel" key={i}>
                {cells.map((k) => (
                  <div
                    className="sm-cell"
                    key={k}
                    style={{ transform: `translateY(${(k - p) * 100}%)` }}
                  >
                    <img className="sm-img" src={PLAYERS[mod(k)].reel} alt="" draggable={false} />
                  </div>
                ))}
              </div>
            );
          })}
          <div className="sm-line" aria-hidden />
          <div className="sm-scan" aria-hidden />
        </div>

        <div className="sm-panel">
          <span className={busy ? "sm-blink" : ""}>
            {busy ? "GIRANDO..." : "PUXE A ALAVANCA"}
          </span>
        </div>
      </div>

      <button
        className="sm-lever"
        onClick={pull}
        disabled={busy}
        aria-label="Puxar a alavanca"
      >
        <span className={`sm-arm ${pulled ? "down" : ""}`}>
          <span className="sm-ball" />
        </span>
        <span className="sm-base" />
      </button>
      </div>

      {winPlayer && (
        <div className="sm-overlay" role="dialog" aria-modal="true" aria-label="Você ganhou">
          <div className="sm-popup">
            <div className="sm-popup-title">JACKPOT!</div>
            <div className="sm-popup-body">
              <dl className="sm-info">
                {([
                  ["Nome", winPlayer.name],
                  ["Número", winPlayer.number],
                ] as const).map(([label, value]) => (
                  <div className="sm-field" key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="sm-popup-photo">
                <img src={winPlayer.win} alt={winPlayer.name} />
              </div>
            </div>
            {winPlayer.description && (
              <div className="sm-desc">{winPlayer.description}</div>
            )}
            <button className="sm-btn" autoFocus onClick={() => setWinner(null)}>
              JOGAR DE NOVO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Estilos ---------- */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
.sm-root{--c:clamp(52px,calc((100vw - 206px)/3),92px);--ink:#08080C;--blue:#1150D8;--navy:#0A2A7A;--sky:#5CC8FF;--gold:#FFD23F;--white:#FFFFFF;
  min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(14px,4vw,28px);box-sizing:border-box;
  padding:max(12px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));
  background:#050B22 repeating-linear-gradient(0deg,transparent 0 3px,rgba(255,255,255,.04) 3px 4px);
  font-family:'Press Start 2P',monospace;color:var(--white);image-rendering:pixelated;touch-action:manipulation;-webkit-user-select:none;user-select:none}
.sm-title{margin:0;font-size:clamp(16px,7.5vw,32px);font-weight:400;line-height:1;text-align:center;color:var(--gold);
  text-shadow:4px 4px 0 var(--ink),-2px -2px 0 var(--ink),2px -2px 0 var(--ink),-2px 2px 0 var(--ink)}
.sm-stage{position:relative}
.sm-cabinet{background:var(--blue);border:6px solid var(--ink);box-shadow:6px 6px 0 var(--ink),inset 0 0 0 4px var(--sky);padding:12px;display:flex;flex-direction:column;gap:12px}
.sm-marquee{background:var(--white);color:var(--blue);text-align:center;padding:12px 6px;font-size:clamp(9px,3.2vw,16px);border:4px solid var(--ink);
  box-shadow:inset 0 -6px 0 rgba(10,42,122,.25);text-shadow:2px 2px 0 var(--sky);animation:sm-glow 1.2s steps(2) infinite}
.sm-screen{position:relative;display:flex;gap:6px;background:var(--ink);padding:6px;border:4px solid #000}
.sm-reel{position:relative;width:var(--c);height:calc(var(--c)*3);overflow:hidden;background:var(--white);border:4px solid #000;
  box-shadow:inset 0 10px 14px rgba(10,42,122,.35),inset 0 -10px 14px rgba(10,42,122,.35)}
.sm-cell{position:absolute;left:0;right:0;top:33.3333%;height:33.3333%;display:flex;align-items:center;justify-content:center;font-size:calc(var(--c)*.6);line-height:1;will-change:transform}
.sm-line{position:absolute;left:0;right:0;top:50%;height:4px;margin-top:-2px;background:var(--gold);box-shadow:0 0 0 2px var(--ink);pointer-events:none}
.sm-scan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.14) 0 2px,transparent 2px 4px)}
.sm-panel{background:var(--ink);border:4px solid #000;padding:10px 6px;text-align:center;font-size:clamp(7px,2.4vw,11px);color:var(--sky)}
.sm-blink{animation:sm-blink .5s steps(2) infinite}
.sm-lever{all:unset;cursor:pointer;position:absolute;z-index:2;left:calc(100% - 10px);top:50%;width:56px;height:240px;margin-top:-120px;display:block;-webkit-tap-highlight-color:transparent}
.sm-lever:disabled{cursor:default}
.sm-lever:focus-visible{outline:4px solid var(--sky);outline-offset:2px}
.sm-base{position:absolute;left:50%;top:50%;width:44px;height:48px;margin:-24px 0 0 -22px;background:var(--navy);border:4px solid var(--ink);box-shadow:inset -6px 0 0 rgba(0,0,0,.35)}
.sm-arm{position:absolute;left:50%;top:50%;width:14px;height:96px;margin-left:-7px;margin-top:-96px;background:var(--white);border:3px solid var(--ink);
  transform-origin:50% 100%;transition:transform .25s steps(5)}
.sm-arm.down{transform:scaleY(-.9);transition-duration:.2s}
.sm-ball{position:absolute;left:50%;top:-30px;width:40px;height:40px;margin-left:-23px;background:var(--gold);border:4px solid var(--ink);border-radius:50%;box-shadow:inset -6px -6px 0 rgba(0,0,0,.25),inset 5px 5px 0 rgba(255,255,255,.55)}
.sm-overlay{position:fixed;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(3,6,20,.85)}
.sm-popup{background:var(--blue);border:6px solid var(--gold);box-shadow:0 0 0 6px var(--ink),8px 8px 0 6px var(--ink);padding:22px 16px;text-align:center;max-width:100%;box-sizing:border-box;
  display:flex;flex-direction:column;align-items:center;gap:16px;animation:sm-pop .4s steps(4)}
.sm-popup-title{font-size:clamp(18px,6vw,28px);color:var(--gold);text-shadow:4px 4px 0 var(--ink);animation:sm-blink .7s steps(2) infinite}
.sm-img{width:88%;height:88%;object-fit:contain;pointer-events:none;-webkit-user-drag:none}
.sm-popup{width:min(100%,440px);max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);overflow:auto}
.sm-popup-body{display:flex;align-items:center;gap:12px;width:100%}
.sm-info{flex:1;min-width:0;margin:0;text-align:left;display:flex;flex-direction:column;gap:10px}
.sm-field dt{color:var(--gold);font-size:12px;margin-bottom:4px;text-shadow:2px 2px 0 var(--ink)}
.sm-field dd{margin:0;color:var(--white);font-size:10px;line-height:1.5;overflow-wrap:anywhere}
.sm-desc{width:100%;box-sizing:border-box;border:2px solid rgba(255,210,63,.75);background:var(--navy);padding:10px;text-align:left;font-size:9px;line-height:1.6;overflow-wrap:anywhere}
.sm-popup-photo{--photo:min(34vw,170px,28vh);--photo:min(34vw,170px,28dvh);box-sizing:content-box;flex:none;overflow:hidden;background:var(--white);border:4px solid var(--ink);padding:8px;width:var(--photo);height:var(--photo);display:flex;align-items:center;justify-content:center}
.sm-popup-photo img{display:block;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain}
.sm-popup-sub{font-size:12px;color:var(--white)}
.sm-btn{font:inherit;font-size:11px;cursor:pointer;background:var(--gold);color:var(--ink);border:4px solid var(--ink);padding:14px 16px;min-height:48px;box-shadow:4px 4px 0 var(--ink)}
.sm-btn:active{transform:translate(4px,4px);box-shadow:none}
.sm-btn:focus-visible{outline:4px solid var(--white);outline-offset:3px}
@keyframes sm-blink{50%{opacity:.25}}
@keyframes sm-glow{50%{filter:brightness(.92)}}
@keyframes sm-pop{from{transform:scale(.4)}to{transform:scale(1)}}
@media (prefers-reduced-motion:reduce){.sm-marquee,.sm-blink,.sm-popup,.sm-popup-title{animation:none}}
`;