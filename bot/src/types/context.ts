import { Context } from 'grammy';

export interface BotContext extends Context {
  session: {
    walletAddress?: string;
    isAuthenticated: boolean;
    proposalInProgress?: {
      title?: string;
      description?: string;
      tradeTarget?: string;
      amount?: number;
    };
  };
}