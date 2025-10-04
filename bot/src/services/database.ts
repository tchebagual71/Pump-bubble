import { Pool } from 'pg';
import logger from '../utils/logger';

// Initialize PostgreSQL connection pool
export const db = new Pool({
  connectionString: process.env.POSTGRES_CONNECTION_STRING,
});

// Test database connection on startup
export async function testConnection() {
  try {
    const client = await db.connect();
    logger.info('Database connection established');
    client.release();
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
    return false;
  }
}

// User repository functions
export const userRepository = {
  async findByWalletAddress(walletAddress: string) {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE wallet_address = $1',
        [walletAddress]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error finding user by wallet address:', error);
      throw error;
    }
  },

  async createOrUpdateUser(walletAddress: string, telegramId?: number) {
    try {
      const result = await db.query(
        `
        INSERT INTO users (wallet_address, telegram_id, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (wallet_address) 
        DO UPDATE SET 
          telegram_id = COALESCE($2, users.telegram_id),
          updated_at = NOW()
        RETURNING *
        `,
        [walletAddress, telegramId]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating or updating user:', error);
      throw error;
    }
  },

  async getUserShares(walletAddress: string) {
    try {
      const result = await db.query(
        `
        SELECT SUM(amount) as total_shares
        FROM user_shares
        WHERE wallet_address = $1
        `,
        [walletAddress]
      );
      return parseFloat(result.rows[0]?.total_shares || '0');
    } catch (error) {
      logger.error('Error getting user shares:', error);
      throw error;
    }
  }
};

// Deposit repository functions
export const depositRepository = {
  async createDeposit(walletAddress: string, amount: number, txId: string) {
    try {
      const result = await db.query(
        `
        INSERT INTO deposits (wallet_address, amount, tx_id, status, created_at)
        VALUES ($1, $2, $3, 'confirmed', NOW())
        RETURNING *
        `,
        [walletAddress, amount, txId]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating deposit:', error);
      throw error;
    }
  },

  async getUserDeposits(walletAddress: string) {
    try {
      const result = await db.query(
        `
        SELECT * FROM deposits
        WHERE wallet_address = $1
        ORDER BY created_at DESC
        `,
        [walletAddress]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error getting user deposits:', error);
      throw error;
    }
  }
};

// Proposal repository functions
export const proposalRepository = {
  async getActiveProposals() {
    try {
      const result = await db.query(
        `
        SELECT * FROM proposals
        WHERE state = 'active'
        ORDER BY created_at DESC
        `
      );
      return result.rows;
    } catch (error) {
      logger.error('Error getting active proposals:', error);
      throw error;
    }
  },

  async getProposal(proposalId: string) {
    try {
      const result = await db.query(
        'SELECT * FROM proposals WHERE id = $1',
        [proposalId]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting proposal:', error);
      throw error;
    }
  },

  async createTradeProposal(
    title: string,
    description: string,
    proposerWalletAddress: string,
    fromToken: string,
    toToken: string,
    amount: number
  ) {
    try {
      const result = await db.query(
        `
        INSERT INTO proposals (
          title, 
          description, 
          proposer_wallet_address,
          instruction_type,
          instruction_data,
          state,
          yes_votes,
          no_votes,
          created_at,
          end_time
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW() + INTERVAL '3 days'
        )
        RETURNING id
        `,
        [
          title,
          description,
          proposerWalletAddress,
          'trade',
          JSON.stringify({ fromToken, toToken, amount }),
          'active',
          0,
          0
        ]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating trade proposal:', error);
      throw error;
    }
  }
};