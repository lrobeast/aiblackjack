import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Card, CardSuit, CardValue, TableState, UserProfile, PlayerSeat, ChatMessage } from "./src/types";

const app = express();
const PORT = 3000;

// Enable CORS middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Enable JSON parser
app.use(express.json());

// In-memory data store
const users = new Map<string, UserProfile & { pin: string }>();
const tables = new Map<string, TableState>();

// Utility: Generate unique ID
function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

// Initialize tables
const initialTables = [
  { id: "table-1", name: "🎰 Le Petit Casino", minBet: 10, maxBet: 200 },
  { id: "table-2", name: "👑 La Table Royale", minBet: 50, maxBet: 1000 },
  { id: "table-3", name: "💎 Le VIP Club", minBet: 200, maxBet: 5000 },
];

for (const t of initialTables) {
  const seats: PlayerSeat[] = [];
  for (let i = 0; i < 5; i++) {
    seats.push({
      seatIndex: i,
      userId: null,
      username: null,
      bet: 0,
      hand: [],
      status: "waiting",
      payout: 0,
      message: "",
    });
  }

  tables.set(t.id, {
    id: t.id,
    name: t.name,
    minBet: t.minBet,
    maxBet: t.maxBet,
    status: "waiting",
    seats,
    dealerHand: [],
    activeSeatIndex: null,
    countdown: 0,
    chatMessages: [
      {
        id: "welcome",
        userId: "system",
        username: "Croupier",
        text: `Bienvenue à la table ${t.name}! Installez-vous sur l'un des sièges pour jouer.`,
        timestamp: Date.now(),
      }
    ],
    gameLogs: [`Table ${t.name} initialisée.`],
  });
}

// In-memory shoe (multiple decks) for each table
const shoes = new Map<string, Card[]>();

function createShoe(): Card[] {
  const suits: CardSuit[] = ["H", "D", "C", "S"];
  const values: CardValue[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const shoe: Card[] = [];

  // Standard 6 decks
  for (let d = 0; d < 6; d++) {
    for (const suit of suits) {
      for (const value of values) {
        shoe.push({ suit, value });
      }
    }
  }

  // Shuffle shoe
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }

  return shoe;
}

function drawCard(tableId: string): Card {
  let shoe = shoes.get(tableId);
  if (!shoe || shoe.length < 30) {
    shoe = createShoe();
    shoes.set(tableId, shoe);
  }
  return shoe.pop()!;
}

// Calculate score for a hand
function calculateHandValue(hand: Card[]): number {
  let total = 0;
  let aces = 0;

  for (const card of hand) {
    if (card.hidden) continue;
    if (card.value === "A") {
      aces += 1;
      total += 11;
    } else if (["K", "Q", "J"].includes(card.value)) {
      total += 10;
    } else {
      total += parseInt(card.value, 10);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return total;
}

// Middlewares
function getUserIdFromReq(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  return null;
}

// Auth endpoints
app.post("/api/auth/login", (req, res) => {
  const { username, pin } = req.body;
  if (!username || !pin) {
    return res.status(400).json({ error: "Nom d'utilisateur et code PIN requis." });
  }

  const cleanedUsername = username.trim().substring(0, 16);
  if (cleanedUsername.length < 3) {
    return res.status(400).json({ error: "Le nom d'utilisateur doit faire au moins 3 caractères." });
  }

  // Search user by username
  let foundUser: (UserProfile & { pin: string }) | null = null;
  for (const u of users.values()) {
    if (u.username.toLowerCase() === cleanedUsername.toLowerCase()) {
      foundUser = u;
      break;
    }
  }

  if (foundUser) {
    if (foundUser.pin !== pin) {
      return res.status(401).json({ error: "Code PIN incorrect pour ce compte." });
    }
    return res.json({
      token: foundUser.id,
      user: { id: foundUser.id, username: foundUser.username, balance: foundUser.balance },
    });
  } else {
    // Register new user
    const id = generateId();
    const newUser = { id, username: cleanedUsername, pin, balance: 1000 };
    users.set(id, newUser);
    return res.json({
      token: id,
      user: { id, username: cleanedUsername, balance: 1000 },
    });
  }
});

app.get("/api/auth/me", (req, res) => {
  const userId = getUserIdFromReq(req);
  if (!userId || !users.has(userId)) {
    return res.status(401).json({ error: "Non authentifié." });
  }
  const u = users.get(userId)!;
  return res.json({ id: u.id, username: u.username, balance: u.balance });
});

app.post("/api/auth/topup", (req, res) => {
  const userId = getUserIdFromReq(req);
  if (!userId || !users.has(userId)) {
    return res.status(401).json({ error: "Non authentifié." });
  }
  const u = users.get(userId)!;
  if (u.balance >= 50) {
    return res.status(400).json({ error: "Vous devez avoir moins de $50 pour recharger." });
  }
  u.balance = 1000;
  users.set(userId, u);
  return res.json({ id: u.id, username: u.username, balance: u.balance });
});

// Table endpoints
app.get("/api/tables", (req, res) => {
  const list = Array.from(tables.values()).map((t) => {
    const activePlayersCount = t.seats.filter((s) => s.userId !== null).length;
    return {
      id: t.id,
      name: t.name,
      minBet: t.minBet,
      maxBet: t.maxBet,
      status: t.status,
      activePlayersCount,
    };
  });
  return res.json(list);
});

app.get("/api/tables/:tableId", (req, res) => {
  const { tableId } = req.params;
  const table = tables.get(tableId);
  if (!table) {
    return res.status(404).json({ error: "Table introuvable." });
  }
  return res.json(table);
});

app.post("/api/tables/:tableId/join", (req, res) => {
  const { tableId } = req.params;
  const { seatIndex } = req.body;
  const userId = getUserIdFromReq(req);

  if (!userId || !users.has(userId)) {
    return res.status(401).json({ error: "Veuillez vous connecter d'abord." });
  }
  const table = tables.get(tableId);
  if (!table) {
    return res.status(404).json({ error: "Table introuvable." });
  }
  if (seatIndex < 0 || seatIndex >= 5) {
    return res.status(400).json({ error: "Siège invalide." });
  }

  // Check if player is already seated elsewhere at this table
  const alreadySeated = table.seats.some((s) => s.userId === userId);
  if (alreadySeated) {
    return res.status(400).json({ error: "Vous êtes déjà installé à un siège sur cette table." });
  }

  const seat = table.seats[seatIndex];
  if (seat.userId !== null) {
    return res.status(400).json({ error: "Ce siège est déjà occupé." });
  }

  const u = users.get(userId)!;
  seat.userId = u.id;
  seat.username = u.username;
  seat.bet = 0;
  seat.hand = [];
  seat.status = table.status === "betting" ? "betting" : "waiting";
  seat.payout = 0;
  seat.message = "Installé";

  table.gameLogs.push(`${u.username} s'est assis au siège ${seatIndex + 1}.`);

  // If table was waiting (empty) and now has a player, start betting phase
  if (table.status === "waiting") {
    table.status = "betting";
    table.countdown = 15;
  }

  return res.json(table);
});

app.post("/api/tables/:tableId/leave", (req, res) => {
  const { tableId } = req.params;
  const userId = getUserIdFromReq(req);

  if (!userId) {
    return res.status(401).json({ error: "Veuillez vous connecter d'abord." });
  }

  const table = tables.get(tableId);
  if (!table) {
    return res.status(404).json({ error: "Table introuvable." });
  }

  const seat = table.seats.find((s) => s.userId === userId);
  if (!seat) {
    return res.status(400).json({ error: "Vous n'êtes pas sur cette table." });
  }

  // Refund bet if in waiting/betting state
  if (table.status === "waiting" || table.status === "betting" || table.status === "round-over") {
    if (seat.bet > 0) {
      const u = users.get(userId)!;
      u.balance += seat.bet;
      users.set(userId, u);
      table.gameLogs.push(`${u.username} a récupéré sa mise de $${seat.bet} en partant.`);
    }
  }

  const name = seat.username;
  seat.userId = null;
  seat.username = null;
  seat.bet = 0;
  seat.hand = [];
  seat.status = "waiting";
  seat.payout = 0;
  seat.message = "";

  table.gameLogs.push(`${name} a quitté la table.`);

  // If table is completely empty, reset it to waiting
  const playersLeft = table.seats.some((s) => s.userId !== null);
  if (!playersLeft) {
    table.status = "waiting";
    table.countdown = 0;
    table.activeSeatIndex = null;
    table.dealerHand = [];
  }

  return res.json(table);
});

app.post("/api/tables/:tableId/bet", (req, res) => {
  const { tableId } = req.params;
  const { amount } = req.body;
  const userId = getUserIdFromReq(req);

  if (!userId) {
    return res.status(401).json({ error: "Veuillez vous connecter d'abord." });
  }

  const table = tables.get(tableId);
  if (!table) {
    return res.status(404).json({ error: "Table introuvable." });
  }

  const seat = table.seats.find((s) => s.userId === userId);
  if (!seat) {
    return res.status(400).json({ error: "Vous n'êtes pas sur cette table." });
  }

  if (table.status !== "betting") {
    return res.status(400).json({ error: "Les mises sont fermées pour ce tour." });
  }

  if (amount < table.minBet || amount > table.maxBet) {
    return res.status(400).json({ error: `La mise doit être entre $${table.minBet} et $${table.maxBet}.` });
  }

  const u = users.get(userId)!;
  const currentBet = seat.bet;
  const additionalNeeded = amount - currentBet;

  if (u.balance < additionalNeeded) {
    return res.status(400).json({ error: "Solde insuffisant pour cette mise." });
  }

  u.balance -= additionalNeeded;
  users.set(userId, u);

  seat.bet = amount;
  seat.status = "playing"; // Ready to play
  seat.message = `Misé $${amount}`;

  table.gameLogs.push(`${u.username} a misé $${amount}.`);

  return res.json({ table, user: { id: u.id, username: u.username, balance: u.balance } });
});

app.post("/api/tables/:tableId/action", (req, res) => {
  const { tableId } = req.params;
  const { action } = req.body; // 'hit' | 'stand' | 'double'
  const userId = getUserIdFromReq(req);

  if (!userId) {
    return res.status(401).json({ error: "Veuillez vous connecter." });
  }

  const table = tables.get(tableId);
  if (!table) {
    return res.status(404).json({ error: "Table introuvable." });
  }

  if (table.status !== "player-turns" || table.activeSeatIndex === null) {
    return res.status(400).json({ error: "Ce n'est pas le moment de jouer." });
  }

  const activeSeat = table.seats[table.activeSeatIndex];
  if (activeSeat.userId !== userId) {
    return res.status(403).json({ error: "Ce n'est pas votre tour de jouer." });
  }

  const u = users.get(userId)!;

  if (action === "hit") {
    const card = drawCard(tableId);
    activeSeat.hand.push(card);
    const score = calculateHandValue(activeSeat.hand);

    table.gameLogs.push(`${activeSeat.username} tire une carte: ${card.value}${card.suit}. Total: ${score}`);

    if (score > 21) {
      activeSeat.status = "busted";
      activeSeat.message = "Bust! (>21)";
      table.gameLogs.push(`${activeSeat.username} a sauté!`);
      advanceTurn(table);
    } else if (score === 21) {
      activeSeat.status = "stood";
      activeSeat.message = "21!";
      advanceTurn(table);
    } else {
      // Still playing, refresh countdown
      table.countdown = 20;
    }
  } else if (action === "stand") {
    activeSeat.status = "stood";
    activeSeat.message = `Reste (${calculateHandValue(activeSeat.hand)})`;
    table.gameLogs.push(`${activeSeat.username} reste.`);
    advanceTurn(table);
  } else if (action === "double") {
    // Double requires another bet of the same amount
    if (u.balance < activeSeat.bet) {
      return res.status(400).json({ error: "Solde insuffisant pour doubler la mise." });
    }

    u.balance -= activeSeat.bet;
    users.set(userId, u);

    activeSeat.bet *= 2;
    const card = drawCard(tableId);
    activeSeat.hand.push(card);
    const score = calculateHandValue(activeSeat.hand);

    table.gameLogs.push(`${activeSeat.username} double sa mise ($${activeSeat.bet}) et tire: ${card.value}${card.suit}. Total: ${score}`);

    if (score > 21) {
      activeSeat.status = "busted";
      activeSeat.message = "Bust! (>21)";
      table.gameLogs.push(`${activeSeat.username} a sauté!`);
    } else {
      activeSeat.status = "stood";
      activeSeat.message = `Reste (${score})`;
    }
    advanceTurn(table);
  }

  return res.json({ table, user: { id: u.id, username: u.username, balance: u.balance } });
});

app.post("/api/tables/:tableId/chat", (req, res) => {
  const { tableId } = req.params;
  const { text } = req.body;
  const userId = getUserIdFromReq(req);

  if (!userId || !text) {
    return res.status(400).json({ error: "Message ou utilisateur manquant." });
  }

  const table = tables.get(tableId);
  if (!table) {
    return res.status(404).json({ error: "Table introuvable." });
  }

  const u = users.get(userId);
  const username = u ? u.username : "Spectateur";

  const msg: ChatMessage = {
    id: generateId(),
    userId: userId,
    username: username,
    text: text.substring(0, 100),
    timestamp: Date.now(),
  };

  table.chatMessages.push(msg);
  if (table.chatMessages.length > 50) {
    table.chatMessages.shift();
  }

  return res.json(table);
});

// Advance to next active seat
function advanceTurn(table: TableState) {
  if (table.activeSeatIndex === null) return;

  let nextIndex = table.activeSeatIndex + 1;
  let found = false;

  while (nextIndex < 5) {
    const seat = table.seats[nextIndex];
    if (seat.userId !== null && seat.bet > 0 && seat.status === "playing") {
      table.activeSeatIndex = nextIndex;
      table.countdown = 20;
      table.gameLogs.push(`C'est au tour de ${seat.username}.`);
      found = true;
      break;
    }
    nextIndex++;
  }

  if (!found) {
    // All players have completed their turns
    table.status = "dealer-turn";
    table.activeSeatIndex = null;
    table.countdown = 0;
    table.gameLogs.push("C'est au tour du croupier.");
  }
}

// Background Game Loop tick runner
setInterval(() => {
  for (const table of tables.values()) {
    try {
      updateTableState(table);
    } catch (e) {
      console.error(`Error updating table ${table.id}:`, e);
    }
  }
}, 1000);

function updateTableState(table: TableState) {
  const hasPlayers = table.seats.some((s) => s.userId !== null);

  if (!hasPlayers) {
    if (table.status !== "waiting") {
      table.status = "waiting";
      table.countdown = 0;
      table.activeSeatIndex = null;
      table.dealerHand = [];
    }
    return;
  }

  if (table.status === "waiting") {
    // If we have seated players, shift to betting phase
    table.status = "betting";
    table.countdown = 15;
    table.gameLogs.push("Le tour commence! Placez vos mises.");
    return;
  }

  if (table.status === "betting") {
    table.countdown = Math.max(0, table.countdown - 1);
    if (table.countdown <= 0) {
      // Transition to dealing
      const activeSeats = table.seats.filter((s) => s.userId !== null && s.bet > 0);
      if (activeSeats.length > 0) {
        table.status = "dealing";
        table.gameLogs.push("Faites vos jeux, rien ne va plus! Distribution des cartes.");

        // Clean hands first
        for (const s of table.seats) {
          s.hand = [];
          if (s.userId !== null && s.bet > 0) {
            s.status = "playing";
            s.message = "En jeu";
          } else if (s.userId !== null) {
            s.status = "waiting";
            s.message = "Spectateur";
          }
        }

        // Deal: 2 cards to players, 2 cards to dealer (one hidden)
        // Card 1
        for (const s of table.seats) {
          if (s.userId !== null && s.bet > 0) {
            s.hand.push(drawCard(table.id));
          }
        }
        table.dealerHand = [drawCard(table.id)];

        // Card 2
        for (const s of table.seats) {
          if (s.userId !== null && s.bet > 0) {
            s.hand.push(drawCard(table.id));
          }
        }
        const dealerSecondCard = drawCard(table.id);
        dealerSecondCard.hidden = true;
        table.dealerHand.push(dealerSecondCard);

        // Check for immediate blackjacks
        for (const s of table.seats) {
          if (s.userId !== null && s.bet > 0) {
            const val = calculateHandValue(s.hand);
            if (val === 21) {
              s.status = "blackjack";
              s.message = "Blackjack!";
              table.gameLogs.push(`${s.username} a un BLACKJACK naturel!`);
            }
          }
        }

        // Set active player to first seated playing player
        let firstSeatIndex = -1;
        for (let i = 0; i < 5; i++) {
          const s = table.seats[i];
          if (s.userId !== null && s.bet > 0 && s.status === "playing") {
            firstSeatIndex = i;
            break;
          }
        }

        if (firstSeatIndex !== -1) {
          table.status = "player-turns";
          table.activeSeatIndex = firstSeatIndex;
          table.countdown = 20;
          table.gameLogs.push(`C'est au tour de ${table.seats[firstSeatIndex].username}.`);
        } else {
          // If everyone has blackjack or busted already
          table.status = "dealer-turn";
          table.activeSeatIndex = null;
          table.countdown = 0;
          table.gameLogs.push("Tous les joueurs ont un Blackjack naturel! Tour du croupier.");
        }
      } else {
        // No bets placed, restart betting timer
        table.countdown = 15;
        table.gameLogs.push("Aucune mise placée. En attente de mises...");
      }
    }
  } else if (table.status === "player-turns") {
    table.countdown = Math.max(0, table.countdown - 1);
    if (table.countdown <= 0) {
      if (table.activeSeatIndex !== null) {
        const activeSeat = table.seats[table.activeSeatIndex];
        activeSeat.status = "stood";
        activeSeat.message = `Reste d'office (${calculateHandValue(activeSeat.hand)})`;
        table.gameLogs.push(`Temps écoulé! ${activeSeat.username} reste automatiquement.`);
        advanceTurn(table);
      }
    }
  } else if (table.status === "dealer-turn") {
    // Reveal hidden cards
    let hasHidden = false;
    for (const card of table.dealerHand) {
      if (card.hidden) {
        card.hidden = false;
        hasHidden = true;
      }
    }

    if (hasHidden) {
      table.gameLogs.push(`Le croupier dévoile sa carte cachée. Total: ${calculateHandValue(table.dealerHand)}`);
      return; // Give players 1 tick to view revealed card
    }

    const dealerValue = calculateHandValue(table.dealerHand);

    // Check if we even need to draw (if all players busted, dealer doesn't need to draw)
    const anySeatedPlayerLeft = table.seats.some(
      (s) => s.userId !== null && s.bet > 0 && s.status !== "busted" && s.status !== "blackjack"
    );
    const anySeatedBlackjack = table.seats.some((s) => s.userId !== null && s.bet > 0 && s.status === "blackjack");

    if (dealerValue < 17 && (anySeatedPlayerLeft || (anySeatedBlackjack && dealerValue < 11))) {
      // Draw 1 card per tick for professional live feel
      const card = drawCard(table.id);
      table.dealerHand.push(card);
      table.gameLogs.push(`Le croupier tire: ${card.value}${card.suit}. Total: ${calculateHandValue(table.dealerHand)}`);
    } else {
      // Dealer finishes play. Calculate Payouts!
      table.gameLogs.push(`Le croupier s'arrête avec un total de ${dealerValue}.`);
      resolveRoundPayouts(table, dealerValue);
    }
  } else if (table.status === "round-over") {
    table.countdown = Math.max(0, table.countdown - 1);
    if (table.countdown <= 0) {
      // Reset table
      table.status = "betting";
      table.countdown = 15;
      table.activeSeatIndex = null;
      table.dealerHand = [];

      for (const s of table.seats) {
        s.hand = [];
        s.bet = 0;
        s.payout = 0;
        s.message = "";
        if (s.userId !== null) {
          s.status = "waiting";
        }
      }
      table.gameLogs = ["Nouveau tour! Placez vos mises."];
    }
  }
}

function resolveRoundPayouts(table: TableState, dealerValue: number) {
  for (const seat of table.seats) {
    if (seat.userId === null || seat.bet <= 0) continue;

    const playerValue = calculateHandValue(seat.hand);
    const user = users.get(seat.userId);

    if (!user) continue;

    if (seat.status === "busted" || playerValue > 21) {
      // Already lost
      seat.payout = -seat.bet;
      seat.message = "Perdu (Bust)";
      seat.status = "payout";
    } else if (seat.status === "blackjack") {
      // Check if dealer also has blackjack
      const dealerHasBJ = dealerValue === 21 && table.dealerHand.length === 2;
      if (dealerHasBJ) {
        // Push
        seat.payout = 0;
        seat.message = "Égalité (BJ)";
        seat.status = "payout";
        user.balance += seat.bet; // return bet
      } else {
        // Player wins 3:2
        const prize = Math.floor(seat.bet * 1.5);
        seat.payout = prize;
        seat.message = `Blackjack! +$${prize}`;
        seat.status = "payout";
        user.balance += seat.bet + prize;
      }
    } else if (dealerValue > 21) {
      // Dealer bust! Player wins 1:1
      const prize = seat.bet;
      seat.payout = prize;
      seat.message = `Croupier saute! +$${prize}`;
      seat.status = "payout";
      user.balance += seat.bet + prize;
    } else if (playerValue > dealerValue) {
      // Player wins 1:1
      const prize = seat.bet;
      seat.payout = prize;
      seat.message = `Gagné! +$${prize}`;
      seat.status = "payout";
      user.balance += seat.bet + prize;
    } else if (playerValue < dealerValue) {
      // Player loses
      seat.payout = -seat.bet;
      seat.message = `Perdu (${playerValue} vs ${dealerValue})`;
      seat.status = "payout";
    } else {
      // Push
      seat.payout = 0;
      seat.message = "Égalité";
      seat.status = "payout";
      user.balance += seat.bet;
    }

    users.set(seat.userId, user);
    table.gameLogs.push(`Résultat ${seat.username}: ${seat.message}`);
  }

  table.status = "round-over";
  table.countdown = 8; // Show results for 8 seconds
}

// Serve static build in production
// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
