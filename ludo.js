export const COLORS = ["red", "green", "yellow", "blue"];
export const COLOR_NAMES = { red: "Red", green: "Green", yellow: "Yellow", blue: "Blue" };
export const START = { red: 0, green: 13, yellow: 26, blue: 39 };
export const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// 52-space shared loop, then a six-space private home lane.
// progress: -1 = yard, 0..51 = shared track, 52..57 = home lane, 58 = finished.
export const TRACK = [
  [6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],
  [1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],
  [8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],
  [13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]
];
// Visual coordinate mapping is the traditional 15x15 cross; the loop above is ordered clockwise.
export const HOME_LANES = {
  red: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  green: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  yellow: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  blue: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]
};
export const YARDS = {
  red: [[1,1],[1,4],[4,1],[4,4]],
  green: [[1,10],[1,13],[4,10],[4,13]],
  yellow: [[10,10],[10,13],[13,10],[13,13]],
  blue: [[10,1],[10,4],[13,1],[13,4]]
};
export function newGame(roomCode, playerName) {
  return {
    roomCode,
    players: [{ id: makeId(), name: playerName || "Player 1", color: "red" }],
    tokens: Object.fromEntries(COLORS.map(c => [c, [-1,-1,-1,-1]])),
    turn: "red", die: null, status: "waiting", winner: null,
    consecutiveSixes: 0, lastMessage: "Waiting for another player to join.",
    version: 1
  };
}
export function makeId() {
  return Math.random().toString(36).slice(2, 10);
}
export function legalTokenIndices(game, color = game.turn, die = game.die) {
  if (!die || game.status !== "playing" || game.winner) return [];
  const arr = game.tokens[color] || [];
  return arr.map((p, i) => ({p, i})).filter(({p}) => {
    if (p === 58) return false;
    if (p === -1) return die === 6;
    return p + die <= 58;
  }).map(({i}) => i);
}
export function rollDie(game) {
  if (game.status !== "playing" || game.winner || game.die !== null) return game;
  const roll = Math.floor(Math.random() * 6) + 1;
  const consecutiveSixes = roll === 6 ? game.consecutiveSixes + 1 : 0;
  if (consecutiveSixes >= 3) {
    return { ...game, die: null, consecutiveSixes: 0, turn: nextColor(game.turn, game.players), lastMessage: `${COLOR_NAMES[game.turn]} rolled three sixes and loses the turn.` };
  }
  const next = { ...game, die: roll, consecutiveSixes, lastMessage: `${COLOR_NAMES[game.turn]} rolled a ${roll}.` };
  if (legalTokenIndices(next).length === 0) {
    if (roll === 6) return { ...next, die: null, lastMessage: `${COLOR_NAMES[game.turn]} rolled a 6 but has no legal move. Roll again.` };
    return { ...next, die: null, consecutiveSixes: 0, turn: nextColor(game.turn, game.players), lastMessage: `No legal move. ${COLOR_NAMES[nextColor(game.turn, game.players)]}'s turn.` };
  }
  return next;
}
export function moveToken(game, tokenIndex) {
  const legal = legalTokenIndices(game);
  if (!legal.includes(tokenIndex)) return game;
  const color = game.turn;
  const before = game.tokens[color][tokenIndex];
  const after = before === -1 ? 0 : before + game.die;
  const tokens = { ...game.tokens, [color]: [...game.tokens[color]] };
  tokens[color][tokenIndex] = after;
  let captured = false;
  if (after >= 0 && after <= 51) {
    const absolute = (START[color] + after) % 52;
    if (!SAFE.has(absolute)) {
      for (const other of COLORS.filter(c => c !== color)) {
        tokens[other] = [...tokens[other]];
        tokens[other].forEach((p, i) => {
          if (p >= 0 && p <= 51 && (START[other] + p) % 52 === absolute) {
            tokens[other][i] = -1;
            captured = true;
          }
        });
      }
    }
  }
  const won = tokens[color].every(p => p === 58);
  const extraTurn = game.die === 6 || captured;
  const message = won ? `${COLOR_NAMES[color]} wins the game!` :
    captured ? `${COLOR_NAMES[color]} captured a token and gets another turn.` :
    game.die === 6 ? `${COLOR_NAMES[color]} rolled a 6 and gets another turn.` :
    `${COLOR_NAMES[nextColor(color, game.players)]}'s turn.`;
  return {
    ...game, tokens, die: null, winner: won ? color : null,
    status: won ? "finished" : "playing",
    turn: won || extraTurn ? color : nextColor(color, game.players),
    consecutiveSixes: game.die === 6 ? game.consecutiveSixes : 0,
    lastMessage: message, version: (game.version || 0) + 1
  };
}
export function nextColor(color, players) {
  const active = COLORS.filter(c => players.some(p => p.color === c));
  if (!active.length) return color;
  const i = active.indexOf(color);
  return active[(i + 1) % active.length];
}
export function addPlayer(game, name) {
  if (game.players.length >= 4) throw new Error("This room already has four players.");
  if (game.players.some(p => p.name.toLowerCase() === name.toLowerCase())) name = `${name} ${game.players.length + 1}`;
  const used = new Set(game.players.map(p => p.color));
  const color = COLORS.find(c => !used.has(c));
  return {
    ...game,
    players: [...game.players, { id: makeId(), name: name || `Player ${game.players.length + 1}`, color }],
    status: game.players.length + 1 >= 2 ? "playing" : "waiting",
    lastMessage: `${name || "A player"} joined as ${COLOR_NAMES[color]}.`,
    version: (game.version || 0) + 1
  };
}
export function getTrackCell(color, progress) {
  if (progress < 0 || progress === 58) return null;
  if (progress >= 52) return HOME_LANES[color][progress - 52];
  const idx = (START[color] + progress) % 52;
  return TRACK[idx];
}
