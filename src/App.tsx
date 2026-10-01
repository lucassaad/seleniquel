import { useCallback, useEffect, useRef, useState } from "react";
import { PLAYERS } from "./data/players";
import "./App.css";


/* ---------- Configuração (edite aqui) ---------- */

// Chance de forçar 3 iguais em cada puxada (0 = puramente aleatório, 1 = sempre ganha)
const WIN_CHANCE = 0.7;

// Álbum: chave do localStorage e se o nome fica escondido ("???") enquanto não achou
const STORAGE_KEY = "seleniquel:found";
const HIDE_LOCKED_NAMES = false;

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

const loadFound = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr)
      ? arr.filter((n) => PLAYERS.some((p) => p.name === n))
      : [];
  } catch {
    return [];
  }
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
  const [showPreview, setShowPreview] = useState(false);

  // Álbum
  const [found, setFound] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [albumOpen, setAlbumOpen] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);

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
      if (res.every((v) => v === res[0])) {
        const player = PLAYERS[res[0]];
        // os estados mudam juntos, então não há flash da imagem final
        setShowPreview(!!player.winPreview);
        setWinner(res[0]);
        // adiciona ao álbum (sem duplicar)
        setFound((prev) => (prev.includes(player.name) ? prev : [...prev, player.name]));
      }
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

  // Pré-carrega todas as imagens (inclusive o preview)
  useEffect(() => {
    PLAYERS.forEach((p) => {
      new Image().src = p.reel;
      new Image().src = p.win;
      if (p.winPreview) new Image().src = p.winPreview;
    });
  }, []);

  // Carrega o álbum salvo ao abrir o site
  useEffect(() => {
    setFound(loadFound());
    setHydrated(true);
  }, []);

  // Salva o álbum sempre que mudar (só depois de carregar, para não apagar o que já existe)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
    } catch {
      /* armazenamento bloqueado: o álbum só vale nesta visita */
    }
  }, [found, hydrated]);

  // Escape: fecha primeiro o popup, depois o álbum
  useEffect(() => {
    if (winner === null && viewing === null && !albumOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (winner !== null) setWinner(null);
      else if (viewing !== null) setViewing(null);
      else setAlbumOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [winner, viewing, albumOpen]);

  // Timer do preview: depois do tempo configurado, troca para a imagem final
  useEffect(() => {
    if (winner === null) {
      setShowPreview(false);
      return;
    }
    const p = PLAYERS[winner];
    if (!p.winPreview) return;
    const id = window.setTimeout(() => setShowPreview(false), p.winPreviewMs ?? 500);
    return () => clearTimeout(id);
  }, [winner]);

  // O popup serve para a vitória (winner) e para ver figurinha do álbum (viewing)
  const isWin = winner !== null;
  const shownIdx = winner ?? viewing;
  const winPlayer = shownIdx !== null ? PLAYERS[shownIdx] : null;
  const closePopup = () => (isWin ? setWinner(null) : setViewing(null));

  return (
    <div className="sm-root">
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

      <button className="sm-btn" onClick={() => setAlbumOpen(true)} disabled={busy}>
        ÁLBUM {found.length}/{N}
      </button>

      {albumOpen && (
        <div className="sm-overlay" role="dialog" aria-modal="true" aria-label="Álbum de figurinhas">
          <div className="sm-album">
            <div className="sm-popup-title">ÁLBUM</div>
            <div className="sm-album-count">{found.length}/{N} ENCONTRADOS</div>
            <div className="sm-grid">
              {PLAYERS.map((p, i) => {
                const got = found.includes(p.name);
                return (
                  <button
                    key={p.name}
                    className={`sm-card ${got ? "" : "locked"}`}
                    disabled={!got}
                    onClick={() => setViewing(i)}
                    aria-label={got ? p.name : `${p.name} (ainda não encontrado)`}
                  >
                    <span className="sm-card-photo">
                      <img src={p.reel} alt="" draggable={false} />
                    </span>
                    <span className="sm-card-name">
                      {got || !HIDE_LOCKED_NAMES ? p.name : "???"}
                    </span>
                  </button>
                );
              })}
            </div>
            <button className="sm-btn" autoFocus onClick={() => setAlbumOpen(false)}>
              FECHAR
            </button>
          </div>
        </div>
      )}

      {winPlayer && (
        <div
          className="sm-overlay top"
          role="dialog"
          aria-modal="true"
          aria-label={isWin ? "Você ganhou" : "Figurinha"}
        >
          <div className="sm-popup">
            <div className="sm-popup-title">{isWin ? "JACKPOT!" : "FIGURINHA"}</div>
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
                <img
                  src={isWin && showPreview && winPlayer.winPreview ? winPlayer.winPreview : winPlayer.win}
                  alt={winPlayer.name}
                />
              </div>
            </div>
            {winPlayer.description && (
              <div className="sm-desc">{winPlayer.description}</div>
            )}
            <button className="sm-btn" autoFocus onClick={closePopup}>
              {isWin ? "JOGAR DE NOVO" : "FECHAR"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}