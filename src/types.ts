export type CardSuit = 'H' | 'D' | 'C' | 'S'; // Hearts, Diamonds, Clubs, Spades
export type CardValue = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: CardSuit;
  value: CardValue;
  hidden?: boolean;
}

export type PlayerSeatStatus = 'waiting' | 'betting' | 'playing' | 'stood' | 'busted' | 'blackjack' | 'payout';

export interface PlayerSeat {
  seatIndex: number;
  userId: string | null;
  username: string | null;
  bet: number;
  hand: Card[];
  status: PlayerSeatStatus;
  payout: number;
  message: string;
}

export type TableStatus = 'waiting' | 'betting' | 'dealing' | 'player-turns' | 'dealer-turn' | 'round-over';

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
}

export interface TableState {
  id: string;
  name: string;
  minBet: number;
  maxBet: number;
  status: TableStatus;
  seats: PlayerSeat[]; // typically 5 seats
  dealerHand: Card[];
  activeSeatIndex: number | null;
  countdown: number;
  chatMessages: ChatMessage[];
  gameLogs: string[];
}

export interface UserProfile {
  id: string;
  username: string;
  balance: number;
  forceLobby?: boolean;
  forceLogout?: boolean;
}

export interface GameAuthResponse {
  token: string;
  user: UserProfile;
}
