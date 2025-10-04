/**
 * Database connection utility
 * 
 * Provides a singleton connection to the PostgreSQL database
 */

import pgPromise from 'pg-promise';
import { IDatabase, IMain } from 'pg-promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define database schema interfaces
export interface IUser {
  id: number;
  telegram_id: string;
  username?: string;
  wallet_address?: string;
  joined_at: Date;
  last_active_at: Date;
  is_admin: boolean;
}

export interface IDao {
  id: number;
  chat_id: string;
  name: string;
  description?: string;
  dao_address: string;
  share_token_mint: string;
  vault_address: string;
  multisig_address: string;
  governance_address?: string;
  created_at: Date;
  created_by?: number;
  is_active: boolean;
  members_count: number;
}

export interface IDeposit {
  id: number;
  dao_id: number;
  user_id: number;
  amount: number;
  shares_minted: number;
  tx_signature: string;
  deposited_at: Date;
}

export interface IWithdrawal {
  id: number;
  dao_id: number;
  user_id: number;
  amount_usdc: number;
  shares_burned: number;
  tx_signature: string;
  withdrawn_at: Date;
}

export interface ITradeProposal {
  id: number;
  dao_id: number;
  proposer_id: number;
  title: string;
  description: string;
  amount_usdc: number;
  target_token_mint?: string;
  governance_proposal_id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'cancelled';
  created_at: Date;
  voted_at?: Date;
  executed_at?: Date;
  execution_tx_signature?: string;
  yes_votes: number;
  no_votes: number;
  abstain_votes: number;
}

export interface IVote {
  id: number;
  proposal_id: number;
  user_id: number;
  vote: 'yes' | 'no' | 'abstain';
  voting_power: number;
  voted_at: Date;
}

export interface ITrade {
  id: number;
  dao_id: number;
  proposal_id: number;
  input_amount: number;
  input_token_mint: string;
  output_amount: number;
  output_token_mint: string;
  executor_id: number;
  jupiter_route?: any;
  tx_signature: string;
  executed_at: Date;
  slippage?: number;
  successful: boolean;
}

export interface IUserBalance {
  user_id: number;
  telegram_id: string;
  username?: string;
  wallet_address?: string;
  dao_id: number;
  dao_name: string;
  share_balance: number;
}

export interface IDaoStatistics {
  dao_id: number;
  name: string;
  chat_id: string;
  active_members: number;
  total_deposited_usdc: number;
  total_shares_minted: number;
  total_shares_burned: number;
  current_share_supply: number;
  completed_trades: number;
}

// Database interface with repositories
interface IExtensions {
  users: UsersRepository;
  daos: DaosRepository;
  deposits: DepositsRepository;
  withdrawals: WithdrawalsRepository;
  tradeProposals: TradeProposalsRepository;
  votes: VotesRepository;
  trades: TradesRepository;
}

// Define repositories
class UsersRepository {
  constructor(private db: IDatabase<IExtensions>) {}

  async findByTelegramId(telegramId: string): Promise<IUser | null> {
    return this.db.oneOrNone('SELECT * FROM users WHERE telegram_id = $1', telegramId);
  }

  async findByWalletAddress(walletAddress: string): Promise<IUser | null> {
    return this.db.oneOrNone('SELECT * FROM users WHERE wallet_address = $1', walletAddress);
  }

  async create(user: Partial<IUser>): Promise<IUser> {
    return this.db.one(
      'INSERT INTO users(telegram_id, username, wallet_address, is_admin) VALUES($1, $2, $3, $4) RETURNING *',
      [user.telegram_id, user.username, user.wallet_address, user.is_admin || false]
    );
  }

  async updateWallet(telegramId: string, walletAddress: string): Promise<IUser> {
    return this.db.one(
      'UPDATE users SET wallet_address = $1, last_active_at = NOW() WHERE telegram_id = $2 RETURNING *',
      [walletAddress, telegramId]
    );
  }

  async updateLastActive(telegramId: string): Promise<void> {
    return this.db.none(
      'UPDATE users SET last_active_at = NOW() WHERE telegram_id = $1',
      [telegramId]
    );
  }
}

class DaosRepository {
  constructor(private db: IDatabase<IExtensions>) {}

  async findByChatId(chatId: string): Promise<IDao | null> {
    return this.db.oneOrNone('SELECT * FROM daos WHERE chat_id = $1', chatId);
  }

  async create(dao: Partial<IDao>): Promise<IDao> {
    return this.db.one(
      'INSERT INTO daos(chat_id, name, description, dao_address, share_token_mint, vault_address, multisig_address, governance_address, created_by) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [
        dao.chat_id,
        dao.name,
        dao.description,
        dao.dao_address,
        dao.share_token_mint,
        dao.vault_address,
        dao.multisig_address,
        dao.governance_address,
        dao.created_by
      ]
    );
  }

  async getStatistics(daoId: number): Promise<IDaoStatistics | null> {
    return this.db.oneOrNone('SELECT * FROM dao_statistics WHERE dao_id = $1', daoId);
  }
}

class DepositsRepository {
  constructor(private db: IDatabase<IExtensions>) {}

  async create(deposit: Partial<IDeposit>): Promise<IDeposit> {
    return this.db.one(
      'INSERT INTO deposits(dao_id, user_id, amount, shares_minted, tx_signature) VALUES($1, $2, $3, $4, $5) RETURNING *',
      [
        deposit.dao_id,
        deposit.user_id,
        deposit.amount,
        deposit.shares_minted,
        deposit.tx_signature
      ]
    );
  }

  async getUserDeposits(userId: number, daoId: number): Promise<IDeposit[]> {
    return this.db.any(
      'SELECT * FROM deposits WHERE user_id = $1 AND dao_id = $2 ORDER BY deposited_at DESC',
      [userId, daoId]
    );
  }
}

class WithdrawalsRepository {
  constructor(private db: IDatabase<IExtensions>) {}

  async create(withdrawal: Partial<IWithdrawal>): Promise<IWithdrawal> {
    return this.db.one(
      'INSERT INTO withdrawals(dao_id, user_id, amount_usdc, shares_burned, tx_signature) VALUES($1, $2, $3, $4, $5) RETURNING *',
      [
        withdrawal.dao_id,
        withdrawal.user_id,
        withdrawal.amount_usdc,
        withdrawal.shares_burned,
        withdrawal.tx_signature
      ]
    );
  }

  async getUserWithdrawals(userId: number, daoId: number): Promise<IWithdrawal[]> {
    return this.db.any(
      'SELECT * FROM withdrawals WHERE user_id = $1 AND dao_id = $2 ORDER BY withdrawn_at DESC',
      [userId, daoId]
    );
  }
}

class TradeProposalsRepository {
  constructor(private db: IDatabase<IExtensions>) {}

  async create(proposal: Partial<ITradeProposal>): Promise<ITradeProposal> {
    return this.db.one(
      'INSERT INTO trade_proposals(dao_id, proposer_id, title, description, amount_usdc, target_token_mint) VALUES($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        proposal.dao_id,
        proposal.proposer_id,
        proposal.title,
        proposal.description,
        proposal.amount_usdc,
        proposal.target_token_mint
      ]
    );
  }

  async getActiveProposals(daoId: number): Promise<ITradeProposal[]> {
    return this.db.any(
      'SELECT * FROM trade_proposals WHERE dao_id = $1 AND status IN (\'pending\', \'approved\') ORDER BY created_at DESC',
      [daoId]
    );
  }

  async updateStatus(proposalId: number, status: ITradeProposal['status']): Promise<ITradeProposal> {
    return this.db.one(
      'UPDATE trade_proposals SET status = $1, voted_at = CASE WHEN $1 IN (\'approved\', \'rejected\') THEN NOW() ELSE voted_at END, executed_at = CASE WHEN $1 = \'executed\' THEN NOW() ELSE executed_at END WHERE id = $2 RETURNING *',
      [status, proposalId]
    );
  }

  async markExecuted(proposalId: number, txSignature: string): Promise<ITradeProposal> {
    return this.db.one(
      'UPDATE trade_proposals SET status = \'executed\', executed_at = NOW(), execution_tx_signature = $1 WHERE id = $2 RETURNING *',
      [txSignature, proposalId]
    );
  }
}

class VotesRepository {
  constructor(private db: IDatabase<IExtensions>) {}

  async create(vote: Partial<IVote>): Promise<IVote> {
    // First register the vote
    const newVote = await this.db.one(
      'INSERT INTO votes(proposal_id, user_id, vote, voting_power) VALUES($1, $2, $3, $4) RETURNING *',
      [vote.proposal_id, vote.user_id, vote.vote, vote.voting_power]
    );

    // Then update the proposal vote counts
    await this.db.none(
      'UPDATE trade_proposals SET yes_votes = yes_votes + CASE WHEN $1 = \'yes\' THEN $2 ELSE 0 END, no_votes = no_votes + CASE WHEN $1 = \'no\' THEN $2 ELSE 0 END, abstain_votes = abstain_votes + CASE WHEN $1 = \'abstain\' THEN $2 ELSE 0 END WHERE id = $3',
      [vote.vote, vote.voting_power, vote.proposal_id]
    );

    return newVote;
  }

  async getUserVote(userId: number, proposalId: number): Promise<IVote | null> {
    return this.db.oneOrNone(
      'SELECT * FROM votes WHERE user_id = $1 AND proposal_id = $2',
      [userId, proposalId]
    );
  }

  async getProposalVotes(proposalId: number): Promise<IVote[]> {
    return this.db.any(
      'SELECT * FROM votes WHERE proposal_id = $1 ORDER BY voted_at DESC',
      [proposalId]
    );
  }
}

class TradesRepository {
  constructor(private db: IDatabase<IExtensions>) {}

  async create(trade: Partial<ITrade>): Promise<ITrade> {
    return this.db.one(
      'INSERT INTO trades(dao_id, proposal_id, input_amount, input_token_mint, output_amount, output_token_mint, executor_id, jupiter_route, tx_signature, slippage, successful) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [
        trade.dao_id,
        trade.proposal_id,
        trade.input_amount,
        trade.input_token_mint,
        trade.output_amount,
        trade.output_token_mint,
        trade.executor_id,
        trade.jupiter_route || null,
        trade.tx_signature,
        trade.slippage || null,
        trade.successful !== undefined ? trade.successful : true
      ]
    );
  }

  async getDaoTrades(daoId: number): Promise<ITrade[]> {
    return this.db.any(
      'SELECT * FROM trades WHERE dao_id = $1 ORDER BY executed_at DESC',
      [daoId]
    );
  }
}

// Initialize pg-promise
const pgp: IMain = pgPromise();

// Get database connection string from environment variables
const dbConfig = {
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/pump_bubble',
  max: 30, // Maximum number of connections
};

// Create database instance with extensions
function createDB(): IDatabase<IExtensions> {
  const db = pgp(dbConfig);

  // Add repositories to db object
  return Object.assign(db, {
    users: new UsersRepository(db),
    daos: new DaosRepository(db),
    deposits: new DepositsRepository(db),
    withdrawals: new WithdrawalsRepository(db),
    tradeProposals: new TradeProposalsRepository(db),
    votes: new VotesRepository(db),
    trades: new TradesRepository(db),
  });
}

// Export singleton instance
export const db: IDatabase<IExtensions> = createDB();