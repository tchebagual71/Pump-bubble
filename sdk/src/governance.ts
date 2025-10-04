/**
 * Governance Module
 * 
 * This module provides functions to interact with SPL Governance (Realms).
 * It handles creating and managing DAOs, proposals, and voting.
 */

import {
  Connection,
  PublicKey,
  TransactionInstruction,
  Transaction,
  Keypair
} from '@solana/web3.js';
import {
  getRealm,
  getTokenOwnerRecordAddress,
  getVoteRecordAddress,
  getGovernanceProgramVersion,
  withCreateProposal,
  withCastVote,
  VoteType,
  withExecuteTransaction,
  GovernanceConfig,
  MintMaxVoteWeightSource,
  withCreateRealm,
  VoteTipping
} from '@solana/spl-governance';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import BN from 'bn.js';

// SPL Governance Program ID
const SPL_GOVERNANCE_PROGRAM_ID = new PublicKey('GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw');

export interface GovernanceProposal {
  address: string;
  name: string;
  description: string;
  status: string;
  yesVotes: string;
  noVotes: string;
  isExecutable: boolean;
  instructions: any[];
}

export interface ProposalVote {
  proposalAddress: string;
  voterAddress: string;
  vote: 'yes' | 'no';
  weight: string;
}

export class GovernanceClient {
  private connection: Connection;
  private wallet: any; // Should be a wallet adapter
  private programId: PublicKey;
  
  /**
   * Create a new GovernanceClient instance
   * @param connection - Solana connection
   * @param wallet - Wallet for transactions
   * @param programId - SPL Governance program ID (optional)
   */
  constructor(
    connection: Connection,
    wallet: any,
    programId: PublicKey = SPL_GOVERNANCE_PROGRAM_ID
  ) {
    this.connection = connection;
    this.wallet = wallet;
    this.programId = programId;
  }
  
  /**
   * Create a new governance DAO (Realm)
   * @param name - Name of the DAO
   * @param communityMintAddress - Community token mint address
   * @param councilMintAddress - Council token mint address (optional)
   * @param minCommunityTokensToCreateGovernance - Minimum tokens required to create governance
   * @returns Address of the created DAO (Realm)
   */
  async createDao(
    name: string,
    communityMintAddress: PublicKey,
    councilMintAddress: PublicKey | null = null,
    minCommunityTokensToCreateGovernance: number = 100000
  ): Promise<string> {
    // Get the latest program version
    const programVersion = await getGovernanceProgramVersion(
      this.connection,
      this.programId
    );
    
    // Create instruction to create a realm
    const createRealmTx = new Transaction();
    
    await withCreateRealm(
      createRealmTx,
      this.programId,
      programVersion,
      name,
      this.wallet.publicKey,
      communityMintAddress,
      this.wallet.publicKey,
      councilMintAddress,
      new MintMaxVoteWeightSource({ value: new BN(1) }),
      new BN(minCommunityTokensToCreateGovernance),
      {
        useVoterWeightAddin: false,
        useMaxVoterWeightAddin: false,
      },
      {
        communityVoterWeightAddin: undefined,
        maxCommunityVoterWeightAddin: undefined,
      }
    );
    
    // Send transaction
    await this.wallet.sendTransaction(createRealmTx, this.connection);
    
    // Calculate realm address
    const [realmAddress] = await PublicKey.findProgramAddress(
      [Buffer.from('governance', 'utf8'), Buffer.from(name, 'utf8')],
      this.programId
    );
    
    return realmAddress.toBase58();
  }
  
  /**
   * Get a governance DAO (Realm) details
   * @param realmAddress - Address of the DAO (Realm)
   * @returns DAO (Realm) data
   */
  async getDao(realmAddress: string | PublicKey): Promise<any> {
    const realmPubkey = typeof realmAddress === 'string' ?
      new PublicKey(realmAddress) : realmAddress;
    
    return await getRealm(
      this.connection,
      realmPubkey
    );
  }
  
  /**
   * Create a new proposal in a governance DAO
   * @param realmAddress - Address of the DAO (Realm)
   * @param governingTokenMint - Mint of the governance token
   * @param name - Name of the proposal
   * @param description - Description of the proposal
   * @param instructions - Instructions to include in the proposal
   * @returns Address of the created proposal
   */
  async createProposal(
    realmAddress: string | PublicKey,
    governingTokenMint: string | PublicKey,
    name: string,
    description: string,
    instructions: TransactionInstruction[]
  ): Promise<string> {
    const realmPubkey = typeof realmAddress === 'string' ?
      new PublicKey(realmAddress) : realmAddress;
    const mintPubkey = typeof governingTokenMint === 'string' ?
      new PublicKey(governingTokenMint) : governingTokenMint;
    
    // Get the realm data
    const realm = await getRealm(
      this.connection,
      realmPubkey
    );
    
    // Get program version
    const programVersion = await getGovernanceProgramVersion(
      this.connection,
      this.programId
    );
    
    // Get the token owner record address
    const tokenOwnerRecordAddress = await getTokenOwnerRecordAddress(
      this.programId,
      realmPubkey,
      mintPubkey,
      this.wallet.publicKey
    );
    
    // Find the governance PDA for the mint
    const [governancePda] = await PublicKey.findProgramAddress(
      [Buffer.from('governance', 'utf8'), realmPubkey.toBuffer(), mintPubkey.toBuffer()],
      this.programId
    );
    
    // Create a transaction to create the proposal
    const createProposalTx = new Transaction();
    
    // Add instruction to create proposal
    const proposalAddress = await withCreateProposal(
      createProposalTx,
      this.programId,
      programVersion,
      realmPubkey,
      governancePda,
      tokenOwnerRecordAddress,
      name,
      description,
      mintPubkey,
      this.wallet.publicKey,
      governancePda,
      instructions,
      this.wallet.publicKey,
      undefined // vote type: default is single choice
    );
    
    // Send transaction
    await this.wallet.sendTransaction(createProposalTx, this.connection);
    
    return proposalAddress.toBase58();
  }
  
  /**
   * Vote on a proposal
   * @param realmAddress - Address of the DAO (Realm)
   * @param proposalAddress - Address of the proposal
   * @param governingTokenMint - Mint of the governance token
   * @param vote - Vote type (yes or no)
   * @returns Transaction signature
   */
  async castVote(
    realmAddress: string | PublicKey,
    proposalAddress: string | PublicKey,
    governingTokenMint: string | PublicKey,
    vote: 'yes' | 'no'
  ): Promise<string> {
    const realmPubkey = typeof realmAddress === 'string' ?
      new PublicKey(realmAddress) : realmAddress;
    const proposalPubkey = typeof proposalAddress === 'string' ?
      new PublicKey(proposalAddress) : proposalAddress;
    const mintPubkey = typeof governingTokenMint === 'string' ?
      new PublicKey(governingTokenMint) : governingTokenMint;
    
    // Get program version
    const programVersion = await getGovernanceProgramVersion(
      this.connection,
      this.programId
    );
    
    // Get the token owner record address
    const tokenOwnerRecordAddress = await getTokenOwnerRecordAddress(
      this.programId,
      realmPubkey,
      mintPubkey,
      this.wallet.publicKey
    );
    
    // Find the governance PDA for the mint
    const [governancePda] = await PublicKey.findProgramAddress(
      [Buffer.from('governance', 'utf8'), realmPubkey.toBuffer(), mintPubkey.toBuffer()],
      this.programId
    );
    
    // Determine vote type
    const voteType = vote === 'yes' ? VoteType.Yes : VoteType.No;
    
    // Create a transaction to cast vote
    const castVoteTx = new Transaction();
    
    // Add instruction to cast vote
    await withCastVote(
      castVoteTx,
      this.programId,
      programVersion,
      realmPubkey,
      governancePda,
      proposalPubkey,
      proposalPubkey, // proposal holding authority (same as proposal for single choice)
      tokenOwnerRecordAddress,
      this.wallet.publicKey,
      mintPubkey,
      voteType,
      {
        // yes vote weight
        yes: voteType === VoteType.Yes ? new BN(1) : new BN(0),
        // no vote weight
        no: voteType === VoteType.No ? new BN(1) : new BN(0)
      },
      this.wallet.publicKey
    );
    
    // Send transaction
    const { signature } = await this.wallet.sendTransaction(castVoteTx, this.connection);
    
    return signature;
  }
  
  /**
   * Execute a proposal
   * @param proposalAddress - Address of the proposal
   * @param instructionIndex - Index of the instruction to execute
   * @returns Transaction signature
   */
  async executeProposal(
    proposalAddress: string | PublicKey,
    instructionIndex: number = 0
  ): Promise<string> {
    const proposalPubkey = typeof proposalAddress === 'string' ?
      new PublicKey(proposalAddress) : proposalAddress;
    
    // Get program version
    const programVersion = await getGovernanceProgramVersion(
      this.connection,
      this.programId
    );
    
    // Create a transaction to execute the instruction
    const executeTx = new Transaction();
    
    // Add instruction to execute proposal instruction
    await withExecuteTransaction(
      executeTx,
      this.programId,
      programVersion,
      proposalPubkey,
      proposalPubkey, // proposal holding authority (same as proposal for single choice)
      instructionIndex,
      this.wallet.publicKey
    );
    
    // Send transaction
    const { signature } = await this.wallet.sendTransaction(executeTx, this.connection);
    
    return signature;
  }
  
  /**
   * Get all proposals for a governance DAO
   * @param realmAddress - Address of the DAO (Realm)
   * @param governanceProgramId - SPL Governance Program ID
   * @returns Array of proposals
   */
  async getProposals(
    realmAddress: string | PublicKey,
    governanceProgramId: PublicKey = this.programId
  ): Promise<GovernanceProposal[]> {
    const realmPubkey = typeof realmAddress === 'string' ?
      new PublicKey(realmAddress) : realmAddress;
    
    // Get all program accounts of type Proposal
    const proposals = await this.connection.getProgramAccounts(governanceProgramId, {
      filters: [
        { dataSize: 1232 }, // Approximate size of Proposal accounts
        {
          memcmp: {
            offset: 1, // After account type discriminator
            bytes: realmPubkey.toBase58()
          }
        }
      ]
    });
    
    // Parse proposals
    return proposals.map(({ pubkey, account }) => {
      // This is a simplified parser
      // In a real implementation, you would parse the account data properly
      const address = pubkey.toBase58();
      
      return {
        address,
        name: `Proposal ${address.slice(0, 8)}...`,
        description: "Proposal description",
        status: "Active",
        yesVotes: "0",
        noVotes: "0",
        isExecutable: false,
        instructions: []
      };
    });
  }
}

export function createGovernanceClient(
  connection: Connection,
  wallet: any,
  programId: PublicKey = SPL_GOVERNANCE_PROGRAM_ID
): GovernanceClient {
  return new GovernanceClient(connection, wallet, programId);
}