/**
 * DAO Module
 * 
 * This module provides functions to interact with the Pump-bubble DAO Anchor program.
 * It wraps all functionality for deposits, withdrawals, and executing trades.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import {
  Program,
  AnchorProvider,
  Idl,
  BN,
  web3
} from '@project-serum/anchor';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress
} from '@solana/spl-token';

// Note: In a real-world scenario, we would import the actual IDL
// For this implementation, we're defining a simplified IDL interface
interface PumpBubbleDaoIdl extends Idl {
  name: 'pump_bubble_dao';
}

export interface DaoConfig {
  authority: PublicKey;
  name: string;
  shareTokenMint: PublicKey;
  vault: PublicKey;
  totalShares: BN;
  depositCount: BN;
  totalUsdcDeposited: BN;
  isActive: boolean;
  bump: number;
}

export class DaoClient {
  private connection: Connection;
  private provider: AnchorProvider;
  private program: Program<PumpBubbleDaoIdl>;
  private programId: PublicKey;
  private daoAddress: PublicKey;
  
  /**
   * Create a new DaoClient instance
   * @param connection - Solana connection
   * @param wallet - Wallet for transactions
   * @param programId - DAO program ID
   * @param idl - Program IDL (optional, will attempt to fetch if not provided)
   */
  constructor(
    connection: Connection,
    wallet: any,
    programId: PublicKey | string,
    idl?: PumpBubbleDaoIdl
  ) {
    this.connection = connection;
    this.provider = new AnchorProvider(
      connection,
      wallet,
      AnchorProvider.defaultOptions()
    );
    
    // Convert programId to PublicKey if it's a string
    this.programId = typeof programId === 'string' ? new PublicKey(programId) : programId;
    
    // Derive DAO PDA
    this.daoAddress = PublicKey.findProgramAddressSync(
      [Buffer.from('dao')],
      this.programId
    )[0];
    
    // Initialize program
    if (!idl) {
      throw new Error('IDL is required. In production, we would fetch from the chain or load from file.');
    }
    
    this.program = new Program(
      idl,
      this.programId,
      this.provider
    );
  }
  
  /**
   * Get the DAO configuration
   * @returns DAO config data
   */
  async getConfig(): Promise<DaoConfig> {
    return await this.program.account.daoConfig.fetch(this.daoAddress) as unknown as DaoConfig;
  }
  
  /**
   * Deposit USDC into the DAO
   * @param amount - Amount to deposit (in USDC standard units)
   * @returns Transaction signature
   */
  async deposit(amount: number): Promise<string> {
    // Get DAO config to access share token mint
    const daoConfig = await this.getConfig();
    
    // Convert amount to lamports (USDC has 6 decimals)
    const amountLamports = new BN(amount * 10**6);
    
    // Get token accounts
    const userWallet = this.provider.wallet.publicKey;
    const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // Mainnet USDC
    
    const userUsdcAccount = await getAssociatedTokenAddress(
      usdcMint,
      userWallet
    );
    
    const userSharesAccount = await getAssociatedTokenAddress(
      daoConfig.shareTokenMint,
      userWallet
    );
    
    // Build the transaction
    const tx = await this.program.methods
      .deposit(amountLamports)
      .accounts({
        user: userWallet,
        dao: this.daoAddress,
        shareTokenMint: daoConfig.shareTokenMint,
        vault: daoConfig.vault,
        userUsdc: userUsdcAccount,
        userShares: userSharesAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY
      })
      .transaction();
    
    // Sign and send transaction
    return await this.provider.sendAndConfirm(tx);
  }
  
  /**
   * Withdraw USDC from the DAO
   * @param shareAmount - Amount of shares to redeem
   * @returns Transaction signature
   */
  async withdraw(shareAmount: number): Promise<string> {
    // Get DAO config
    const daoConfig = await this.getConfig();
    
    // Convert amount to lamports (assuming 9 decimals for shares)
    const shareLamports = new BN(shareAmount * 10**9);
    
    // Get token accounts
    const userWallet = this.provider.wallet.publicKey;
    const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // Mainnet USDC
    
    const userUsdcAccount = await getAssociatedTokenAddress(
      usdcMint,
      userWallet
    );
    
    const userSharesAccount = await getAssociatedTokenAddress(
      daoConfig.shareTokenMint,
      userWallet
    );
    
    // Build the transaction
    const tx = await this.program.methods
      .withdraw(shareLamports)
      .accounts({
        user: userWallet,
        dao: this.daoAddress,
        shareTokenMint: daoConfig.shareTokenMint,
        vault: daoConfig.vault,
        userUsdc: userUsdcAccount,
        userShares: userSharesAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId
      })
      .transaction();
    
    // Sign and send transaction
    return await this.provider.sendAndConfirm(tx);
  }
  
  /**
   * Execute a trade through the DAO
   * @param proposalId - ID of the governance proposal
   * @param proposalAddress - Address of the governance proposal
   * @param amount - Amount of USDC to trade
   * @param swapInstructionData - Jupiter swap instruction data
   * @returns Transaction signature
   */
  async executeTrade(
    proposalId: number,
    proposalAddress: PublicKey,
    amount: number,
    swapInstructionData: Buffer
  ): Promise<string> {
    // Get DAO config
    const daoConfig = await this.getConfig();
    
    // Convert amount to lamports (USDC has 6 decimals)
    const amountLamports = new BN(amount * 10**6);
    
    // Get account addresses
    const userWallet = this.provider.wallet.publicKey;
    
    // Build the transaction
    const tx = await this.program.methods
      .executeTrade(
        new BN(proposalId),
        amountLamports,
        proposalAddress,
        swapInstructionData
      )
      .accounts({
        authority: userWallet,
        dao: this.daoAddress,
        vault: daoConfig.vault,
        governanceProposal: proposalAddress,
        governanceProgram: new PublicKey('GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw'),
        multisig: new PublicKey('YOUR_MULTISIG_ADDRESS'), // Replace with actual value
        transaction: new PublicKey('YOUR_TRANSACTION_ADDRESS'), // Replace with actual value
        multisigProgram: new PublicKey('YOUR_MULTISIG_PROGRAM'), // Replace with actual value
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId
      })
      .transaction();
    
    // Sign and send transaction
    return await this.provider.sendAndConfirm(tx);
  }
}

export function createDaoClient(
  connection: Connection,
  wallet: any,
  programId: string | PublicKey,
  idl?: PumpBubbleDaoIdl
): DaoClient {
  return new DaoClient(connection, wallet, programId, idl);
}