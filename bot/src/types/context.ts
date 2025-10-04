import { Context } from 'grammy';

export interface BotContext extends Context {
  session: {
    walletAddress?: string;
    isAuthenticated: boolean;
    isTrader?: boolean;
    isAdmin?: boolean;
    shares?: number;
    proposalInProgress?: {
      title?: string;
      description?: string;
      tradeTarget?: string;
      amount?: number;
    };
  };
}