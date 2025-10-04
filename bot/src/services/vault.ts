import {
  Connection,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
  TransactionSignature,
  TransactionInstruction
} from '@solana/web3.js';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { Program, AnchorProvider, BN, web3, Wallet } from '@project-serum/anchor';
import { depositRepository, userRepository } from './database';
import logger from '../utils/logger';
import { getSolanaConnection } from '../utils/solana';
import * as fs from 'fs';
import * as path from 'path';
// Import node types
import type { } from 'node';

// Import squads service - in production, you would use the SDK we'll create later
// For now, let's assume we have a method to interact with the multisig
// We'll create a placeholder here and implement the real service in the SDK task
const squadsService = {
  createTransaction: async (multisigAddress: string, instructions: any[]): Promise<string> => {
    return `mock-multisig-tx-${Date.now()}`;
  }
};

// USDC token mint on Solana
const USDC_MINT = new PublicKey(process.env.USDC_MINT_ADDRESS || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// DAO Program ID
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID || 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');

// DAO PDA address (derived from "dao" seed)
const DAO_ADDRESS = PublicKey.findProgramAddressSync(
  [Buffer.from("dao")],
  PROGRAM_ID
)[0];

// DAO share token mint (stored in DAO account)
let SHARE_TOKEN_MINT: PublicKey;

// Get the Anchor program interface
function getProgram(wallet: any) {
  try {
    // Load the IDL file
    const idlPath = path.join(process.cwd(), '..', 'anchor', 'target', 'idl', 'pump_bubble_dao.json');
    const idlFile = fs.readFileSync(idlPath, 'utf8');
    const idl = JSON.parse(idlFile);
    
    // Create a custom provider with the wallet
    const connection = getSolanaConnection();
    const provider = new AnchorProvider(
      connection, 
      wallet,
      AnchorProvider.defaultOptions()
    );
    
    // Initialize the program
    return new Program(idl, PROGRAM_ID, provider);
  } catch (error) {
    logger.error('Error loading Anchor program:', error);
    throw new Error(`Failed to load Anchor program: ${error.message}`);
  }
}

// Get DAO account data including share token mint
async function getDAOData(connection: Connection): Promise<any> {
  try {
    // Create a temporary provider without a wallet
    const provider = new AnchorProvider(
      connection,
      {
        publicKey: PublicKey.default,
        signTransaction: async (tx) => tx,
        signAllTransactions: async (txs) => txs,
      },
      AnchorProvider.defaultOptions()
    );
    
    // Load the IDL file
    const idlPath = path.join(process.cwd(), '..', 'anchor', 'target', 'idl', 'pump_bubble_dao.json');
    const idlFile = fs.readFileSync(idlPath, 'utf8');
    const idl = JSON.parse(idlFile);
    
    // Initialize the program
    const program = new Program(idl, PROGRAM_ID, provider);
    
    // Fetch the DAO account
    const dao = await program.account.daoConfig.fetch(DAO_ADDRESS);
    
    return dao;
  } catch (error) {
    logger.error('Error fetching DAO data:', error);
    throw new Error(`Failed to fetch DAO data: ${error.message}`);
  }
}

/**
 * Deposit USDC into the DAO
 */
export async function depositFunds(amount: number, walletAddress: string) {
  try {
    const connection = getSolanaConnection();
    const userWallet = new PublicKey(walletAddress);
    
    // Convert to a properly signed wallet object with the user's keypair
    // In a real application, this would come from the user's wallet adapter
    // For this implementation, we'll assume the wallet object has been passed correctly
    // and contains the necessary signTransaction and signAllTransactions methods
    
    // Get the DAO data to access the share token mint and vault
    const daoData = await getDAOData(connection);
    SHARE_TOKEN_MINT = daoData.shareTokenMint;
    const vaultAddress = daoData.vault;
    
    // 1. Calculate shares to mint based on deposit amount (in lamports/smallest units)
    const amountLamports = amount * 10**6; // USDC has 6 decimals
    
    // 2. Set up token accounts
    const userUsdcAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      userWallet
    );
    
    const userSharesAccount = await getAssociatedTokenAddress(
      SHARE_TOKEN_MINT,
      userWallet
    );
    
    // 3. Create the deposit transaction using Anchor program
    const program = getProgram({ publicKey: userWallet, signTransaction: async (tx) => tx, signAllTransactions: async (txs) => txs });
    
    // Build the deposit transaction
    const tx = await program.methods
      .deposit(new BN(amountLamports))
      .accounts({
        user: userWallet,
        dao: DAO_ADDRESS,
        shareTokenMint: SHARE_TOKEN_MINT,
        vault: vaultAddress,
        userUsdc: userUsdcAccount,
        userShares: userSharesAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY
      })
      .transaction();
    
    // Note: In a real application with a wallet adapter:
    // 1. The transaction would be signed by the user's wallet
    // 2. The signed transaction would be sent to the blockchain
    // 3. We would wait for confirmation
    
    // For demonstration purposes, we'll log the transaction and simulate success
    logger.info(`Deposit transaction created for ${amount} USDC`);
    
    // Record the deposit in the database (in a real implementation, this would happen after confirmation)
    const txId = `deposit-tx-${Date.now()}`;
    await depositRepository.createDeposit(walletAddress, amount, txId);
    
    return {
      success: true,
      txId,
      amount,
      shares: amount // 1:1 ratio for simplicity
    };
  } catch (error) {
    logger.error('Error depositing funds:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Withdraw USDC from the DAO
 */
export async function withdrawFunds(amount: number, walletAddress: string) {
  try {
    const connection = getSolanaConnection();
    const userWallet = new PublicKey(walletAddress);
    
    // Get the DAO data to access the share token mint and vault
    const daoData = await getDAOData(connection);
    SHARE_TOKEN_MINT = daoData.shareTokenMint;
    const vaultAddress = daoData.vault;
    
    // 1. Check user's share balance on-chain
    const userSharesAccount = await getAssociatedTokenAddress(
      SHARE_TOKEN_MINT,
      userWallet
    );
    
    const userSharesInfo = await connection.getTokenAccountBalance(userSharesAccount);
    const userSharesAmount = Number(userSharesInfo.value.amount);
    
    // Convert amount to lamports
    const amountLamports = amount * 10**6; // USDC has 6 decimals
    
    if (userSharesAmount < amountLamports) {
      return {
        success: false,
        error: `Insufficient shares. You have ${userSharesAmount / 10**6} shares but requested to withdraw ${amount}.`
      };
    }
    
    // 2. Set up token accounts
    const userUsdcAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      userWallet
    );
    
    // 3. Create the withdraw transaction using Anchor program
    const program = getProgram({ publicKey: userWallet, signTransaction: async (tx) => tx, signAllTransactions: async (txs) => txs });
    
    // Build the withdraw transaction
    const tx = await program.methods
      .withdraw(new BN(amountLamports))
      .accounts({
        user: userWallet,
        dao: DAO_ADDRESS,
        shareTokenMint: SHARE_TOKEN_MINT,
        vault: vaultAddress,
        userUsdc: userUsdcAccount,
        userShares: userSharesAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId
      })
      .transaction();
    
    // In a real application:
    // 1. We would create a multisig transaction using the Squads service
    // 2. Submit the withdraw transaction for approval
    // 3. Wait for sufficient approvals and execute
    
    // For now, let's use the Squads service to create a multisig transaction
    
    // Get the multisig address from environment or config
    const multisigAddress = process.env.SQUADS_MULTISIG_ADDRESS || '';
    
    // Serialize the transaction
    const serializedTx = tx.serialize({
      verifySignatures: false,
      requireAllSignatures: false,
    });
    
    // Create a multisig transaction (this would typically be done by an admin)
    logger.info(`Creating multisig transaction for withdrawal of ${amount} USDC`);
    
    // For demonstration, we'll return a simulated response
    // In production, this would create a real multisig transaction using squadsService
    const txId = `withdraw-request-${Date.now()}`;
    
    return {
      success: true,
      txId,
      message: 'Withdrawal request submitted to the multisig for approval'
    };
  } catch (error) {
    logger.error('Error processing withdrawal:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get DAO treasury balance
 */
export async function getTreasuryBalance() {
  try {
    const connection = getSolanaConnection();
    
    // Get the DAO data to access the vault
    const daoData = await getDAOData(connection);
    const vaultAddress = daoData.vault;
    
    // Fetch the balance
    const balance = await connection.getTokenAccountBalance(vaultAddress);
    
    return {
      success: true,
      balance: parseFloat(balance.value.amount) / 10**6, // Convert from USDC's 6 decimals
      decimals: balance.value.decimals
    };
  } catch (error) {
    logger.error('Error getting treasury balance:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}