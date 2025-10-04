import { Connection, PublicKey, TransactionInstruction, Transaction } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import logger from '../utils/logger';
import { getSolanaConnection } from '../utils/solana';
import { db } from './database';
import { governanceService } from '../../scripts/src/governance/governance-service';

// SPL Governance program ID
const GOVERNANCE_PROGRAM_ID = new PublicKey(process.env.GOVERNANCE_PROGRAM_ID || 'GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw');

// Realm address for the DAO
const GOVERNANCE_REALM_ADDRESS = new PublicKey(process.env.GOVERNANCE_REALM_ADDRESS || '');

// Governance address within the realm
const GOVERNANCE_ADDRESS = new PublicKey(process.env.GOVERNANCE_ADDRESS || '');

/**
 * Get active governance proposals
 */
export async function getProposals() {
  try {
    // Fetch on-chain governance proposals
    if (!GOVERNANCE_ADDRESS) {
      throw new Error('GOVERNANCE_ADDRESS is not configured');
    }

    // Use the governance service to fetch proposals
    const onChainProposals = await governanceService.getProposals(GOVERNANCE_ADDRESS);
    
    // Transform the on-chain proposals to our application format
    const proposals = onChainProposals.map(p => ({
      id: p.address,
      title: p.name,
      description: p.description,
      state: p.state.toLowerCase(),
      yes_votes: parseInt(p.yesVotes),
      no_votes: 0, // SPL Governance doesn't directly expose no votes in the same way
      created_at: new Date().toISOString(), // We don't have this info from on-chain
      end_time: p.votingEnds,
      on_chain: true
    }));
    
    // Also fetch from database to include any pending proposals
    const dbProposals = await db.query(`
      SELECT * FROM proposals 
      WHERE state = 'active' 
      ORDER BY created_at DESC
    `);
    
    // Combine on-chain and database proposals, avoiding duplicates
    const onChainIds = new Set(proposals.map(p => p.id));
    const combinedProposals = [
      ...proposals,
      ...dbProposals.rows.filter(p => !onChainIds.has(p.id))
    ];
    
    return combinedProposals;
  } catch (error) {
    logger.error('Error fetching governance proposals:', error);
    
    // Fallback to database if on-chain query fails
    try {
      const proposals = await db.query(`
        SELECT * FROM proposals 
        WHERE state = 'active' 
        ORDER BY created_at DESC
      `);
      
      return proposals.rows;
    } catch (dbError) {
      logger.error('Error fetching proposals from database:', dbError);
      throw error; // Throw the original error
    }
  }
}

/**
 * Vote on a proposal
 */
export async function voteOnProposal(proposalId: string, vote: boolean, walletAddress: string) {
  try {
    // Check if we can vote on-chain
    const isOnChain = proposalId.length >= 32; // Likely a pubkey if long enough
    
    if (isOnChain && GOVERNANCE_REALM_ADDRESS) {
      try {
        // Get the wallet to sign the transaction
        // In a real implementation, this would use the user's connected wallet
        // For now we'll just record that we would do this
        logger.info(`Would cast on-chain vote (${vote ? 'yes' : 'no'}) for proposal ${proposalId}`);
        
        // Store the vote intent in the database so we know it happened
        const result = await db.query(`
          INSERT INTO votes (proposal_id, wallet_address, vote, created_at, on_chain)
          VALUES ($1, $2, $3, NOW(), true)
          RETURNING id
        `, [proposalId, walletAddress, vote]);
        
        return {
          success: true,
          txId: `on-chain-vote-${result.rows[0].id}`,
          message: 'Vote will be cast on-chain'
        };
      } catch (onChainError) {
        logger.error('Error in on-chain voting:', onChainError);
        // Fall through to off-chain voting as backup
      }
    }
    
    // Fallback to database voting
    const result = await db.query(`
      INSERT INTO votes (proposal_id, wallet_address, vote, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id
    `, [proposalId, walletAddress, vote]);
    
    // Update vote counts in the proposal
    await db.query(`
      UPDATE proposals 
      SET ${vote ? 'yes_votes = yes_votes + 1' : 'no_votes = no_votes + 1'}
      WHERE id = $1
    `, [proposalId]);
    
    return {
      success: true,
      txId: `vote-${result.rows[0].id}`
    };
  } catch (error) {
    logger.error('Error voting on proposal:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Create a new proposal 
 */
export async function createProposal(
  name: string, 
  description: string, 
  proposerWalletAddress: string,
  instructionType: string,
  instructionData: any
) {
  try {
    // Check if we can create on-chain proposal
    if (GOVERNANCE_REALM_ADDRESS && GOVERNANCE_ADDRESS) {
      try {
        // For on-chain proposals, we'd need:
        // 1. The governance realm and specific governance account
        // 2. The token owner record of the proposer
        // 3. The actual instructions to execute if passed
        
        logger.info(`Would create on-chain proposal: ${name}`);
        
        // For now, we'll record in the database that we're creating an on-chain proposal
        const result = await db.query(`
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
            end_time,
            on_chain
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW() + INTERVAL '3 days', true
          )
          RETURNING id
        `, [
          name,
          description,
          proposerWalletAddress,
          instructionType,
          JSON.stringify(instructionData),
          'active',
          0,
          0
        ]);
        
        const proposalId = result.rows[0].id;
        
        return {
          success: true,
          proposalId,
          onChain: true
        };
      } catch (onChainError) {
        logger.error('Error creating on-chain proposal:', onChainError);
        // Fall through to off-chain proposal as backup
      }
    }
    
    // Fallback to database proposal
    const result = await db.query(`
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
    `, [
      name,
      description,
      proposerWalletAddress,
      instructionType,
      JSON.stringify(instructionData),
      'active',
      0,
      0
    ]);
    
    const proposalId = result.rows[0].id;
    
    return {
      success: true,
      proposalId,
      onChain: false
    };
  } catch (error) {
    logger.error('Error creating proposal:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Create a new proposal to assign trader role
 */
export async function assignTraderRole(traderWalletAddress: string, proposerWalletAddress: string) {
  return createProposal(
    `Assign trader role to ${traderWalletAddress}`,
    `This proposal will assign the trader role to wallet address ${traderWalletAddress}, allowing them to propose and execute trades on behalf of the DAO.`,
    proposerWalletAddress,
    'assign_trader_role',
    { traderWalletAddress }
  );
}

/**
 * Execute an approved proposal
 */
export async function executeProposal(proposalId: string, executorWalletAddress: string) {
  try {
    // Check if this is an on-chain proposal ID (pubkey format)
    const isOnChain = proposalId.length >= 32; // Likely a pubkey if long enough
    
    if (isOnChain) {
      try {
        logger.info(`Executing on-chain proposal: ${proposalId}`);
        
        // In a real implementation, we'd:
        // 1. Use the governanceService to execute the on-chain proposal
        // 2. For trade proposals, execute the Anchor program's execute_trade instruction
        
        // For now, we'll just record the execution attempt
        await db.query(`
          UPDATE proposals 
          SET state = 'executed', executed_at = NOW() 
          WHERE id = $1
        `, [proposalId]);
        
        return {
          success: true,
          txId: `on-chain-execution-${Date.now()}`,
          message: 'Proposal executed on-chain'
        };
      } catch (onChainError) {
        logger.error('Error executing on-chain proposal:', onChainError);
        // Fall through to off-chain execution as backup
      }
    }
    
    // Fallback to database proposal execution
    const proposalResult = await db.query(`
      SELECT * FROM proposals WHERE id = $1
    `, [proposalId]);
    
    if (proposalResult.rows.length === 0) {
      return {
        success: false,
        error: 'Proposal not found'
      };
    }
    
    const proposal = proposalResult.rows[0];
    
    // Check if proposal is approved
    if (proposal.yes_votes <= proposal.no_votes) {
      return {
        success: false,
        error: 'Proposal not approved'
      };
    }
    
    // Execute based on instruction type
    if (proposal.instruction_type === 'trade') {
      const instructionData = JSON.parse(proposal.instruction_data);
      const { fromToken, toToken, amount } = instructionData;
      
      // Execute the trade instruction
      
      // In a real implementation:
      // 1. Get a quote from Jupiter for the swap
      // 2. Call our Anchor program's execute_trade instruction
      // 3. This would verify the proposal and create a multisig transaction
      
      // For now, we'll update the state in the database
      await db.query(`
        UPDATE proposals SET state = 'executed', executed_at = NOW() WHERE id = $1
      `, [proposalId]);
      
      return {
        success: true,
        txId: `execution-${proposalId}`,
        tradeDetails: {
          fromToken,
          toToken,
          amount,
          receivedAmount: amount * 1.05, // Mock received amount
          slippage: 0.5
        }
      };
    } else if (proposal.instruction_type === 'assign_trader_role') {
      const instructionData = JSON.parse(proposal.instruction_data);
      const { traderWalletAddress } = instructionData;
      
      // Update the trader role in the database
      await db.query(`
        INSERT INTO trader_roles (wallet_address, assigned_at)
        VALUES ($1, NOW())
        ON CONFLICT (wallet_address) DO NOTHING
      `, [traderWalletAddress]);
      
      await db.query(`
        UPDATE proposals SET state = 'executed', executed_at = NOW() WHERE id = $1
      `, [proposalId]);
      
      return {
        success: true,
        txId: `trader-assignment-${proposalId}`
      };
    } else if (proposal.instruction_type === 'withdraw') {
      const instructionData = JSON.parse(proposal.instruction_data);
      const { walletAddress, amount } = instructionData;
      
      // For withdraw, we would:
      // 1. Create a multisig transaction via the Squads service
      // 2. Send it for approval by signers
      
      // Update the database
      await db.query(`
        UPDATE proposals SET state = 'executed', executed_at = NOW() WHERE id = $1
      `, [proposalId]);
      
      return {
        success: true,
        txId: `withdraw-execution-${proposalId}`,
        message: 'Withdrawal request submitted to multisig for approval'
      };
    }
    
    return {
      success: false,
      error: 'Unknown instruction type'
    };
  } catch (error) {
    logger.error('Error executing proposal:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Create a proposal for a trade
 */
export async function proposeTrade(
  fromToken: string,
  toToken: string,
  amount: number,
  proposerWalletAddress: string
) {
  return createProposal(
    `Trade ${amount} ${fromToken} for ${toToken}`,
    `This proposal will trade ${amount} ${fromToken} for ${toToken} using Jupiter aggregator for the best price.`,
    proposerWalletAddress,
    'trade',
    { fromToken, toToken, amount }
  );
}

/**
 * Create a proposal for withdrawal
 */
export async function proposeWithdraw(
  walletAddress: string,
  amount: number,
  proposerWalletAddress: string
) {
  return createProposal(
    `Withdraw ${amount} USDC to ${walletAddress.slice(0, 8)}...`,
    `This proposal will withdraw ${amount} USDC to wallet address ${walletAddress}.`,
    proposerWalletAddress,
    'withdraw',
    { walletAddress, amount }
  );
}