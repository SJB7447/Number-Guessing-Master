
export interface LeaderboardEntry {
  id?: string;
  player_name: string;
  attempts: number;
  time_seconds: number;
  created_at?: string;
}

export interface GuessRecord {
  value: number;
  result: 'UP' | 'DOWN' | 'CORRECT';
  timestamp: Date;
  commentary?: string;
}

export type GameStatus = 'LOBBY' | 'PLAYING' | 'FINISHED';
