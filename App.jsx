import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  COLORS, COLOR_NAMES, TRACK, YARDS, SAFE, newGame, addPlayer,
  rollDie, moveToken, legalTokenIndices, getTrackCell
} from "./ludo.js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function makeRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
function normalizeCode(code) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

export default function App() {
  const [name, setName] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [game, setGame] = useState(null);
  const [myPlayerId, setMyPlayerId] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const myPlayer = game?.players.find(p => p.id === myPlayerId);
  const isMyTurn = !!(myPlayer && game?.turn === myPlayer.color && game?.status === "playing" && !game?.winner);
  const legal = useMemo(() => isMyTurn ? legalTokenIndices(game) : [], [game, isMyTurn]);

  useEffect(() => {
    if (!supabase || !roomCode) return;
    const channel = supabase.channel(`ludo-${roomCode}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "ludo_games", filter: `room_code=eq.${roomCode}`
      }, payload => {
        if (payload.new?.state) setGame(payload.new.state);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomCode]);

  async function saveState(nextGame) {
    setGame(nextGame);
    if (!supabase) {
      setNotice("Supabase is not configured yet. Follow the setup steps in README.md.");
      return;
    }
    const { error } = await supabase.from("ludo_games").upsert({
      room_code: nextGame.roomCode, state: nextGame, updated_at: new Date().toISOString()
    });
    if (error) setNotice(`Could not sync with Supabase: ${error.message}`);
    else setNotice("");
  }

  async function createRoom() {
    if (!supabase) { setNotice("First connect Supabase using the setup steps in README.md."); return; }
    setBusy(true);
    try {
      const code = makeRoomCode();
      const first = newGame(code, name.trim() || "Player 1");
      setRoomCode(code);
      setMyPlayerId(first.players[0].id);
      setRoomInput(code);
      setGame(first);
      const { error } = await supabase.from("ludo_games").insert({
        room_code: code, state: first, updated_at: new Date().toISOString()
      });
      if (error) throw error;
      setNotice("Room created. Share the room code with your friends.");
    } catch (e) {
      setRoomCode("");
      setGame(null);
      setNotice(`Couldn't create room: ${e.message}`);
    } finally { setBusy(false); }
  }

  async function joinRoom() {
    if (!supabase) { setNotice("First connect Supabase using the setup steps in README.md."); return; }
    const code = normalizeCode(roomInput);
    if (!code) { setNotice("Enter a room code first."); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.from("ludo_games").select("state").eq("room_code", code).maybeSingle();
      if (error) throw error;
      if (!data?.state) throw new Error("Room not found. Check the code and try again.");
      if (data.state.players.length >= 4) throw new Error("This room already has four players.");
      const updated = addPlayer(data.state, name.trim() || `Player ${data.state.players.length + 1}`);
      setRoomCode(code);
      setMyPlayerId(updated.players[updated.players.length - 1].id);
      setGame(updated);
      await saveState(updated);
      setNotice("Joined! Wait for the board to synchronize.");
    } catch (e) {
      setNotice(`Couldn't join room: ${e.message}`);
    } finally { setBusy(false); }
  }

  async function doRoll() {
    if (!isMyTurn || game.die !== null) return;
    await saveState(rollDie(game));
  }
  async function doMove(index) {
    if (!isMyTurn || !legal.includes(index)) return;
    await saveState(moveToken(game, index));
  }
  async function resetGame() {
    if (!myPlayer || !supabase) return;
    const fresh = {
      ...game, tokens: Object.fromEntries(COLORS.map(c => [c, [-1,-1,-1,-1]])),
      turn: game.players[0].color, die: null, status: game.players.length >= 2 ? "playing" : "waiting",
      winner: null, consecutiveSixes: 0, lastMessage: "New game started.", version: game.version + 1
    };
    await saveState(fresh);
  }

  if (!roomCode || !game) {
    return <main className="page">
      <header className="brand"><div className="brand-mark">L</div><div><h1>Ludo Club</h1><p>Roll. Race. Reunite.</p></div></header>
      <section className="lobby">
        <div className="lobby-art" aria-hidden="true">
          <div className="mini-board">
            <div className="mini-home red-bg">●</div><div className="mini-home green-bg">●</div>
            <div className="mini-home blue-bg">●</div><div className="mini-home yellow-bg">●</div>
            <div className="mini-center">★</div>
          </div>
        </div>
        <div className="lobby-copy">
          <span className="eyebrow">CLASSIC BOARD GAME · ONLINE</span>
          <h2>Bring everyone<br/><em>to the board.</em></h2>
          <p>Create a private room and invite 1–3 friends to play Ludo together, wherever they are.</p>
          <label htmlFor="playerName">Your player name</label>
          <input id="playerName" maxLength="18" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex" />
          <button className="primary full" onClick={createRoom} disabled={busy}>{busy ? "Creating…" : "＋ Create a room"}</button>
          <div className="or"><span/>or join a friend<span/></div>
          <div className="join-row"><input aria-label="Room code" value={roomInput} maxLength="8" onChange={e => setRoomInput(e.target.value.toUpperCase())} placeholder="ROOM CODE"/><button className="secondary" onClick={joinRoom} disabled={busy}>Join</button></div>
          {!supabase && <p className="setup-warning">Supabase setup needed: add your project URL and public key to the <code>.env</code> file. See README.md.</p>}
          {notice && <p className="notice">{notice}</p>}
        </div>
      </section>
      <section className="how"><div><b>01</b><strong>Create a room</strong><span>Get a shareable code.</span></div><div><b>02</b><strong>Invite your crew</strong><span>2 to 4 players total.</span></div><div><b>03</b><strong>Race home</strong><span>Four tokens. One winner.</span></div></section>
      <footer>Made for game night <span>✦</span> Classic Ludo rules</footer>
    </main>;
  }

  return <main className="game-page">
    <header className="game-header">
      <div className="brand small-brand"><div className="brand-mark">L</div><div><h1>Ludo Club</h1><p>FRIENDS · ANYWHERE</p></div></div>
      <div className="room-pill"><span className="live-dot"/> ROOM <b>{roomCode}</b><button title="Copy room code" onClick={() => { navigator.clipboard?.writeText(roomCode); setNotice("Room code copied."); }}>Copy</button></div>
      <button className="text-button" onClick={() => { setRoomCode(""); setGame(null); setMyPlayerId(""); }}>Leave room ↗</button>
    </header>
    <div className="game-layout">
      <section className="board-wrap">
        <div className="board" role="grid" aria-label="Ludo board">
          {Array.from({length:225}, (_, idx) => {
            const r = Math.floor(idx/15), c = idx%15;
            let klass = "cell";
            let symbol = "";
            const homeArea = (r<6&&c<6) ? "red" : (r<6&&c>8) ? "green" : (r>8&&c<6) ? "blue" : (r>8&&c>8) ? "yellow" : null;
            if (homeArea) klass += ` home-area ${homeArea}-home`;
            const trackIndex = TRACK.findIndex(([tr,tc]) => tr===r && tc===c);
            if (trackIndex >= 0) klass += " track-cell";
            if ((r===7&&c>=1&&c<=6)) klass += " red-lane";
            if ((c===7&&r>=1&&r<=6)) klass += " green-lane";
            if ((r===7&&c>=8&&c<=13)) klass += " yellow-lane";
            if ((c===7&&r>=8&&r<=13)) klass += " blue-lane";
            const homeCoords = {red:[[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],green:[[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],yellow:[[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],blue:[[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]};
            Object.entries(homeCoords).forEach(([color, cells]) => { if (cells.some(([rr,cc])=>rr===r&&cc===c)) klass += ` ${color}-lane`; });
            const starTrack = trackIndex >= 0 && SAFE.has(trackIndex);
            if (starTrack) symbol = "★";
            if (r===7&&c===7) { klass += " center-cell"; symbol = "★"; }
            let tokensHere = [];
            if (game) COLORS.forEach(color => (game.tokens[color]||[]).forEach((p, ti) => {
              const cell = getTrackCell(color,p);
              if (cell && cell[0]===r && cell[1]===c) tokensHere.push({color,ti});
            }));
            return <div key={idx} role="gridcell" className={klass} style={{gridRow:r+1,gridColumn:c+1}}>
              {symbol && <span className="cell-symbol">{symbol}</span>}
              {tokensHere.map(t => <button key={`${t.color}-${t.ti}`} title={`${COLOR_NAMES[t.color]} token ${t.ti+1}`} className={`token ${t.color} ${game.turn===t.color && legal.includes(t.ti) && isMyTurn ? "selectable":""}`} onClick={() => t.color===game.turn && isMyTurn && doMove(t.ti)}>{t.ti+1}</button>)}
            </div>;
          })}
          {COLORS.map(color => <div key={color} className={`yard ${color}-yard`} style={{gridArea: color==="red"?"2 / 2 / 6 / 6":color==="green"?"2 / 11 / 6 / 15":color==="blue"?"11 / 2 / 15 / 6":"11 / 11 / 15 / 15"}}>
            {(game.tokens[color]||[-1,-1,-1,-1]).map((p,i) => p===-1 ? <button key={i} className={`yard-token ${color} ${game.turn===color && legal.includes(i) && isMyTurn ? "selectable":""}`} title={`${COLOR_NAMES[color]} token ${i+1}`} onClick={() => color===game.turn && isMyTurn && doMove(i)}>{p===-1 ? "●" : ""}</button> : <span key={i} className="yard-empty">·</span>)}
          </div>)}
        </div>
        <div className="board-legend"><span>★ Safe square</span><span>Get a 6 to leave your yard</span></div>
      </section>
      <aside className="side-panel">
        <div className="turn-card"><span className="eyebrow">CURRENT TURN</span><div className="turn-title"><span className={`color-dot ${game.turn}`}/><h2>{COLOR_NAMES[game.turn]}</h2></div><p>{game.winner ? `${COLOR_NAMES[game.winner]} wins!` : isMyTurn ? (game.die===null ? "It's your turn. Roll the dice." : `You rolled ${game.die}. Choose a token.`) : `${game.players.find(p=>p.color===game.turn)?.name || COLOR_NAMES[game.turn]} is playing.`}</p>
          <button className="die-button" onClick={doRoll} disabled={!isMyTurn || game.die!==null || game.status!=="playing"} aria-label="Roll dice">{game.die ?? "⚄"}<small>{game.die===null?"ROLL DICE":"ROLLED"}</small></button>
          {game.die!==null && isMyTurn && <p className="hint">{legal.length ? "Tap one of your highlighted tokens." : "No legal token to move."}</p>}
        </div>
        <div className="players-card"><div className="section-heading"><h3>Players</h3><span>{game.players.length}/4</span></div>
          {COLORS.map(color => {const p=game.players.find(pl=>pl.color===color);return <div className={`player-row ${game.turn===color?"active":""}`} key={color}><span className={`color-dot ${color}`}/><div className="player-info"><strong>{p?.name || "Waiting for player…"}</strong><small>{p ? (p.id===myPlayerId?"YOU":`${COLOR_NAMES[color]} player`) : "Open seat"}</small></div><span className="token-count">{(game.tokens[color]||[]).filter(x=>x===58).length}/4 <small>HOME</small></span></div>;})}
        </div>
        <div className="message-card"><span className="eyebrow">GAME LOG</span><p>{game.lastMessage}</p>{notice&&<p className="notice">{notice}</p>}</div>
        {game.winner && <button className="primary full" onClick={resetGame}>Play again</button>}
        <button className="secondary full" onClick={() => { navigator.clipboard?.writeText(`${location.origin}\nRoom code: ${roomCode}`); setNotice("Invite details copied."); }}>Copy invite details</button>
        <p className="rules-note">Rules: six to start · exact roll to finish · safe squares · captures grant an extra turn.</p>
      </aside>
    </div>
  </main>;
}
