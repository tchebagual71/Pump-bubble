-- Migration: create initial tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table to store user information
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL UNIQUE,
    username VARCHAR(255),
    wallet_address VARCHAR(44) UNIQUE,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_admin BOOLEAN NOT NULL DEFAULT FALSE
);

-- Create daos table to store DAO information
CREATE TABLE daos (
    id SERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    dao_address VARCHAR(44) NOT NULL UNIQUE,
    share_token_mint VARCHAR(44) NOT NULL UNIQUE,
    vault_address VARCHAR(44) NOT NULL UNIQUE,
    multisig_address VARCHAR(44) NOT NULL,
    governance_address VARCHAR(44),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by INT REFERENCES users(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    members_count INT NOT NULL DEFAULT 0
);

-- Create deposits table to track user deposits
CREATE TABLE deposits (
    id SERIAL PRIMARY KEY,
    dao_id INT NOT NULL REFERENCES daos(id),
    user_id INT NOT NULL REFERENCES users(id),
    amount NUMERIC(20, 6) NOT NULL, -- USDC amount with 6 decimals
    shares_minted NUMERIC(20, 9) NOT NULL, -- Share tokens with 9 decimals
    tx_signature VARCHAR(88) NOT NULL UNIQUE,
    deposited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Combined index for efficient querying
    CONSTRAINT idx_deposits_dao_user UNIQUE (dao_id, user_id, tx_signature)
);

-- Create withdrawals table to track user withdrawals
CREATE TABLE withdrawals (
    id SERIAL PRIMARY KEY,
    dao_id INT NOT NULL REFERENCES daos(id),
    user_id INT NOT NULL REFERENCES users(id),
    amount_usdc NUMERIC(20, 6) NOT NULL, -- USDC amount with 6 decimals
    shares_burned NUMERIC(20, 9) NOT NULL, -- Share tokens with 9 decimals
    tx_signature VARCHAR(88) NOT NULL UNIQUE,
    withdrawn_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Combined index for efficient querying
    CONSTRAINT idx_withdrawals_dao_user UNIQUE (dao_id, user_id, tx_signature)
);

-- Create trade_proposals table to track investment proposals
CREATE TABLE trade_proposals (
    id SERIAL PRIMARY KEY,
    dao_id INT NOT NULL REFERENCES daos(id),
    proposer_id INT NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    amount_usdc NUMERIC(20, 6) NOT NULL,
    target_token_mint VARCHAR(44),
    governance_proposal_id VARCHAR(44),
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, executed, cancelled
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    voted_at TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE,
    execution_tx_signature VARCHAR(88),
    
    -- Track voting results
    yes_votes INT NOT NULL DEFAULT 0,
    no_votes INT NOT NULL DEFAULT 0,
    abstain_votes INT NOT NULL DEFAULT 0,
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'cancelled'))
);

-- Create votes table to track user votes
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    proposal_id INT NOT NULL REFERENCES trade_proposals(id),
    user_id INT NOT NULL REFERENCES users(id),
    vote VARCHAR(10) NOT NULL,
    voting_power NUMERIC(20, 9) NOT NULL, -- Based on share tokens
    voted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_user_vote UNIQUE (proposal_id, user_id),
    CONSTRAINT valid_vote CHECK (vote IN ('yes', 'no', 'abstain'))
);

-- Create trades table to track executed trades
CREATE TABLE trades (
    id SERIAL PRIMARY KEY,
    dao_id INT NOT NULL REFERENCES daos(id),
    proposal_id INT NOT NULL REFERENCES trade_proposals(id),
    input_amount NUMERIC(20, 6) NOT NULL, -- USDC amount with 6 decimals
    input_token_mint VARCHAR(44) NOT NULL,
    output_amount NUMERIC(20, 9) NOT NULL,
    output_token_mint VARCHAR(44) NOT NULL,
    executor_id INT NOT NULL REFERENCES users(id),
    jupiter_route JSON, -- Store Jupiter aggregator route data
    tx_signature VARCHAR(88) NOT NULL UNIQUE,
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    slippage NUMERIC(5, 2), -- Percentage slippage
    successful BOOLEAN NOT NULL DEFAULT TRUE
);

-- Create user_balances view to easily track user share tokens
CREATE VIEW user_balances AS
SELECT
    u.id AS user_id,
    u.telegram_id,
    u.username,
    u.wallet_address,
    d.id AS dao_id,
    d.name AS dao_name,
    COALESCE(SUM(dep.shares_minted), 0) - COALESCE(SUM(w.shares_burned), 0) AS share_balance
FROM
    users u
    JOIN daos d ON TRUE
    LEFT JOIN deposits dep ON dep.user_id = u.id AND dep.dao_id = d.id
    LEFT JOIN withdrawals w ON w.user_id = u.id AND w.dao_id = d.id
GROUP BY
    u.id, u.telegram_id, u.username, u.wallet_address, d.id, d.name;

-- Create dao_statistics view to easily track DAO metrics
CREATE VIEW dao_statistics AS
SELECT
    d.id AS dao_id,
    d.name,
    d.chat_id,
    COUNT(DISTINCT u.id) AS active_members,
    COALESCE(SUM(dep.amount), 0) AS total_deposited_usdc,
    COALESCE(SUM(dep.shares_minted), 0) AS total_shares_minted,
    COALESCE(SUM(w.shares_burned), 0) AS total_shares_burned,
    COALESCE(SUM(dep.shares_minted), 0) - COALESCE(SUM(w.shares_burned), 0) AS current_share_supply,
    COUNT(t.id) AS completed_trades
FROM
    daos d
    LEFT JOIN deposits dep ON dep.dao_id = d.id
    LEFT JOIN withdrawals w ON w.dao_id = d.id
    LEFT JOIN users u ON u.id = dep.user_id
    LEFT JOIN trades t ON t.dao_id = d.id AND t.successful = TRUE
GROUP BY
    d.id, d.name, d.chat_id;

-- Create indices for performance
CREATE INDEX idx_deposits_user_id ON deposits(user_id);
CREATE INDEX idx_deposits_dao_id ON deposits(dao_id);
CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_dao_id ON withdrawals(dao_id);
CREATE INDEX idx_trade_proposals_dao_id ON trade_proposals(dao_id);
CREATE INDEX idx_trade_proposals_status ON trade_proposals(status);
CREATE INDEX idx_votes_proposal_id ON votes(proposal_id);
CREATE INDEX idx_trades_dao_id ON trades(dao_id);
CREATE INDEX idx_trades_proposal_id ON trades(proposal_id);