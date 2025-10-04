/**
 * SPL Governance Integration Service
 * 
 * Helper service for creating and managing governance (Realms) for DAOs
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import {
  createInstructionData,
  getGovernance,
  getGovernanceAccount,
  getGovernanceProgramVersion,
  getMintMaxVoteWeight,
  getRealm,
  getTokenOwnerRecord,
  getVoteRecordsByVoter,
  GoverningTokenType,
  MintMaxVoteWeightSource,
  Proposal,
  ProposalState,
  TokenOwnerRecord,
  Vote,
  VoteChoice,
  VoteType,
  withCastVote,
  withCreateGovernance,
  withCreateProposal,
  withCreateRealm,
  withDepositGoverningTokens,
} from '@solana/spl-governance';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as bs58 from 'bs58';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import winston from 'winston';

// Load environment variables
dotenv.config();

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'governance-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

export class GovernanceService {
  private connection: Connection;
  private payer: Keypair;
  private programId: PublicKey;
  
  constructor(
    private rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    private payerKeypairPath = process.env.PAYER_KEYPAIR_PATH || './keypair.json',
    programIdString = process.env.GOVERNANCE_PROGRAM_ID
  ) {
    this.connection = new Connection(this.rpcUrl, 'confirmed');
    
    // Set governance program ID
    if (programIdString) {
      this.programId = new PublicKey(programIdString);
    } else {
      // Default to SPL Governance program on mainnet
      this.programId = new PublicKey('GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw');
    }
    
    try {
      // Load keypair from file or environment
      if (process.env.PAYER_PRIVATE_KEY) {
        const privateKeyBytes = bs58.decode(process.env.PAYER_PRIVATE_KEY);
        this.payer = Keypair.fromSecretKey(privateKeyBytes);
      } else {
        const keypairBuffer = fs.readFileSync(this.payerKeypairPath, 'utf-8');
        const keypairData = JSON.parse(keypairBuffer);
        this.payer = Keypair.fromSecretKey(new Uint8Array(keypairData));
      }
    } catch (error) {
      logger.error('Failed to load keypair:', error);
      throw new Error('Failed to initialize Governance service: keypair not found');
    }
  }
  
  /**
   * Create a new governance realm
   * @param name - Name of the realm
   * @param communityMint - Mint address of the community token
   * @param councilMint - Optional mint address of the council token
   * @param minCommunityTokensToCreateGovernance - Minimum tokens needed to create governance
   * @returns The realm address
   */
  async createRealm(
    name: string,
    communityMint: PublicKey,
    councilMint?: PublicKey,
    minCommunityTokensToCreateGovernance = 1
  ): Promise<string> {
    try {
      const realmAuthority = this.payer.publicKey;
      
      // Derive realm address from name
      const realmAddress = await PublicKey.findProgramAddress(
        [Buffer.from('governance'), Buffer.from(name)],
        this.programId
      );
      
      // Create transaction for realm creation
      const instructions = [];
      
      // Set token type and max vote weight source
      const communityTokenType = GoverningTokenType.Liquid;
      const maxVoteWeightSource = MintMaxVoteWeightSource.FULL_SUPPLY_FRACTION;
      
      // Create instruction for realm creation
      await withCreateRealm(
        instructions,
        this.programId,
        await getGovernanceProgramVersion(this.connection, this.programId),
        realmAuthority,
        communityMint,
        this.payer.publicKey,
        councilMint,
        communityTokenType,
        maxVoteWeightSource,
        minCommunityTokensToCreateGovernance,
        name
      );
      
      // Send transaction
      const transaction = new Transaction().add(...instructions);
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.payer]
      );
      
      logger.info(`Realm created successfully at ${realmAddress[0].toBase58()}`);
      logger.info(`Transaction signature: ${signature}`);
      
      return realmAddress[0].toBase58();
    } catch (error) {
      logger.error('Failed to create realm:', error);
      throw new Error(`Failed to create realm: ${error.message}`);
    }
  }
  
  /**
   * Create a governance for a realm
   * @param realmAddress - Address of the realm
   * @param votingMint - Mint used for voting (community or council)
   * @param votingBaseAddress - Base address for voting
   * @param voteThresholdPercentage - Percentage of votes needed to pass proposals
   * @returns The governance address
   */
  async createGovernance(
    realmAddress: PublicKey,
    votingMint: PublicKey,
    votingBaseAddress: PublicKey,
    voteThresholdPercentage = 60
  ): Promise<string> {
    try {
      // Get realm data
      const realmData = await getRealm(this.connection, realmAddress);
      
      // Get token owner record
      const tokenOwnerRecord = await getTokenOwnerRecord(
        this.connection,
        this.programId,
        votingBaseAddress
      );
      
      // Calculate vote threshold
      const voteThresholdPercentageValue = voteThresholdPercentage * 100; // Convert to basis points (0-10000)
      
      // Create transaction for governance creation
      const instructions = [];
      
      // Create instruction for governance creation
      const governanceAddress = await withCreateGovernance(
        instructions,
        this.programId,
        await getGovernanceProgramVersion(this.connection, this.programId),
        realmAddress,
        votingMint,
        tokenOwnerRecord.pubkey,
        this.payer.publicKey,
        this.payer.publicKey,
        voteThresholdPercentageValue,
        0, // Vote tipping disabled
        0, // Min instruction holdUp time
        0, // Max voting time
        1, // Min council tokens
        "DAO Governance"
      );
      
      // Send transaction
      const transaction = new Transaction().add(...instructions);
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.payer]
      );
      
      logger.info(`Governance created successfully at ${governanceAddress.toBase58()}`);
      logger.info(`Transaction signature: ${signature}`);
      
      return governanceAddress.toBase58();
    } catch (error) {
      logger.error('Failed to create governance:', error);
      throw new Error(`Failed to create governance: ${error.message}`);
    }
  }
  
  /**
   * Deposit governance tokens to enable voting
   * @param realmAddress - Address of the realm
   * @param governingTokenMint - Mint of the governing token
   * @param amount - Amount to deposit
   * @returns Token owner record address
   */
  async depositGoverningTokens(
    realmAddress: PublicKey,
    governingTokenMint: PublicKey,
    amount: number
  ): Promise<string> {
    try {
      // Create transaction for token deposit
      const instructions = [];
      
      // Create ATA for user if it doesn't exist
      const userATA = await Token.getAssociatedTokenAddress(
        TOKEN_PROGRAM_ID,
        governingTokenMint,
        this.payer.publicKey
      );
      
      // Deposit governance tokens
      const tokenOwnerRecordAddress = await withDepositGoverningTokens(
        instructions,
        this.programId,
        await getGovernanceProgramVersion(this.connection, this.programId),
        realmAddress,
        userATA,
        governingTokenMint,
        this.payer.publicKey,
        this.payer.publicKey,
        this.payer.publicKey,
        amount
      );
      
      // Send transaction
      const transaction = new Transaction().add(...instructions);
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.payer]
      );
      
      logger.info(`Tokens deposited successfully. Owner record: ${tokenOwnerRecordAddress.toBase58()}`);
      logger.info(`Transaction signature: ${signature}`);
      
      return tokenOwnerRecordAddress.toBase58();
    } catch (error) {
      logger.error('Failed to deposit governance tokens:', error);
      throw new Error(`Failed to deposit governance tokens: ${error.message}`);
    }
  }
  
  /**
   * Create a new proposal
   * @param realmAddress - Address of the realm
   * @param governanceAddress - Address of the governance
   * @param tokenOwnerRecord - Token owner record address
   * @param name - Name of the proposal
   * @param description - Description of the proposal
   * @param instructions - Instructions to execute if proposal passes
   * @returns Proposal address
   */
  async createProposal(
    realmAddress: PublicKey,
    governanceAddress: PublicKey,
    tokenOwnerRecord: PublicKey,
    name: string,
    description: string,
    instructions: {
      programId: PublicKey;
      accounts: Array<{
        pubkey: PublicKey;
        isSigner: boolean;
        isWritable: boolean;
      }>;
      data: Buffer;
    }[]
  ): Promise<string> {
    try {
      // Create transaction for proposal creation
      const txInstructions = [];
      
      // Create instruction data for proposal
      const instructionData = instructions.map(ix => 
        createInstructionData(ix)
      );
      
      // Create proposal
      const proposalAddress = await withCreateProposal(
        txInstructions,
        this.programId,
        await getGovernanceProgramVersion(this.connection, this.programId),
        realmAddress,
        governanceAddress,
        tokenOwnerRecord,
        name,
        description,
        governanceAddress,
        this.payer.publicKey,
        0, // Governance config index
        VoteType.SINGLE_CHOICE,
        ['Approve'],
        instructionData
      );
      
      // Send transaction
      const transaction = new Transaction().add(...txInstructions);
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.payer]
      );
      
      logger.info(`Proposal created successfully at ${proposalAddress.toBase58()}`);
      logger.info(`Transaction signature: ${signature}`);
      
      return proposalAddress.toBase58();
    } catch (error) {
      logger.error('Failed to create proposal:', error);
      throw new Error(`Failed to create proposal: ${error.message}`);
    }
  }
  
  /**
   * Cast a vote on a proposal
   * @param realmAddress - Address of the realm
   * @param proposalAddress - Address of the proposal
   * @param tokenOwnerRecord - Token owner record address
   * @param vote - Vote choice (Yes/No)
   * @returns Vote record address
   */
  async castVote(
    realmAddress: PublicKey,
    proposalAddress: PublicKey,
    tokenOwnerRecord: PublicKey,
    vote: 'yes' | 'no'
  ): Promise<string> {
    try {
      // Create transaction for voting
      const txInstructions = [];
      
      // Get proposal account
      const proposal = await getGovernanceAccount(
        this.connection,
        proposalAddress,
        Proposal
      );
      
      // Get max vote weight
      const tokenMint = proposal.account.governingTokenMint;
      const maxVoteWeight = await getMintMaxVoteWeight(
        this.connection,
        realmAddress,
        tokenMint
      );
      
      // Create vote record
      const voteChoices = vote === 'yes' 
        ? [new VoteChoice({ rank: 0, weightPercentage: 100 })]
        : [];
      
      // Cast vote
      const voteRecordAddress = await withCastVote(
        txInstructions,
        this.programId,
        await getGovernanceProgramVersion(this.connection, this.programId),
        realmAddress,
        proposal.account.governance,
        proposalAddress,
        proposal.account.tokenOwnerRecord,
        tokenOwnerRecord,
        this.payer.publicKey,
        tokenMint,
        vote === 'yes' ? Vote.APPROVE : Vote.DENY,
        voteChoices,
        maxVoteWeight
      );
      
      // Send transaction
      const transaction = new Transaction().add(...txInstructions);
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.payer]
      );
      
      logger.info(`Vote cast successfully. Vote record: ${voteRecordAddress.toBase58()}`);
      logger.info(`Transaction signature: ${signature}`);
      
      return voteRecordAddress.toBase58();
    } catch (error) {
      logger.error('Failed to cast vote:', error);
      throw new Error(`Failed to cast vote: ${error.message}`);
    }
  }
  
  /**
   * Get proposals for a governance
   * @param governanceAddress - Address of the governance
   * @returns Array of proposals
   */
  async getProposals(governanceAddress: PublicKey): Promise<any[]> {
    try {
      // Get governance account
      const governance = await getGovernance(
        this.connection,
        governanceAddress
      );
      
      // Get all proposals by governance
      const proposals = await this.connection.getProgramAccounts(
        this.programId,
        {
          filters: [
            {
              memcmp: {
                offset: 1, // Governance offset in proposal account data
                bytes: governanceAddress.toBase58(),
              },
            },
          ],
        }
      );
      
      // Parse proposal data
      const parsedProposals = proposals.map(proposal => {
        const proposalData = Proposal.deserialize(proposal.account.data);
        return {
          address: proposal.pubkey.toBase58(),
          name: proposalData.name,
          description: proposalData.descriptionLink,
          state: ProposalState[proposalData.state],
          yesVotes: proposalData.getYesVoteCount().toString(),
          noVotes: proposalData.getNoVoteCount().toString(),
          votingEnds: proposalData.votingAt ? new Date(proposalData.votingAt.toNumber() * 1000).toISOString() : null,
          executionTime: proposalData.executingAt ? new Date(proposalData.executingAt.toNumber() * 1000).toISOString() : null,
        };
      });
      
      return parsedProposals;
    } catch (error) {
      logger.error('Failed to get proposals:', error);
      throw new Error(`Failed to get proposals: ${error.message}`);
    }
  }
  
  /**
   * Get votes for a proposal
   * @param proposalAddress - Address of the proposal
   * @returns Array of votes
   */
  async getVotes(proposalAddress: PublicKey): Promise<any[]> {
    try {
      // Get all vote records for the proposal
      const voteRecords = await this.connection.getProgramAccounts(
        this.programId,
        {
          filters: [
            {
              memcmp: {
                offset: 1, // Proposal offset in vote record account data
                bytes: proposalAddress.toBase58(),
              },
            },
          ],
        }
      );
      
      // Parse vote records
      const parsedVotes = await Promise.all(voteRecords.map(async record => {
        // Get token owner record to identify voter
        const voteData = Vote.deserialize(record.account.data);
        
        // Get owner address from token owner record
        const tokenOwnerRecord = await this.connection.getAccountInfo(voteData.tokenOwnerRecord);
        const ownerAddress = TokenOwnerRecord.deserialize(tokenOwnerRecord.data).governingTokenOwner;
        
        return {
          address: record.pubkey.toBase58(),
          voter: ownerAddress.toBase58(),
          vote: voteData.voteType === VoteType.APPROVE ? 'yes' : 'no',
          weight: voteData.getYesVoteCount().toString(),
          votedAt: voteData.votedAt ? new Date(voteData.votedAt.toNumber() * 1000).toISOString() : null,
        };
      }));
      
      return parsedVotes;
    } catch (error) {
      logger.error('Failed to get votes:', error);
      throw new Error(`Failed to get votes: ${error.message}`);
    }
  }
}

// Export singleton instance
export const governanceService = new GovernanceService();