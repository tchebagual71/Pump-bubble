/**
 * Squads MPL Multisig Service
 * 
 * Helper service for interacting with the Squads Multisig Program Library
 */

import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { 
  SquadsMpl, 
  createCreateMultisigInstruction, 
  createCreateTransactionInstruction,
  createExecuteTransactionInstruction,
  createApproveInstruction,
  getMultisigPda,
  getTransactionPda,
  MultisigAccount,
  TransactionAccount
} from '@squadscrypto/squads-mpl';
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
  defaultMeta: { service: 'squads-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

export class SquadsMultisigService {
  private connection: Connection;
  private payer: Keypair;
  
  constructor(
    private rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    private payerKeypairPath = process.env.PAYER_KEYPAIR_PATH || './keypair.json'
  ) {
    this.connection = new Connection(this.rpcUrl, 'confirmed');
    
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
      throw new Error('Failed to initialize Squads service: keypair not found');
    }
  }
  
  /**
   * Create a new Squads multisig
   * @param threshold - Number of approvals required to execute transactions
   * @param createKey - Public key that will create the multisig
   * @param members - Array of public keys that will be members of the multisig
   * @returns The multisig address
   */
  async createMultisig(
    threshold: number,
    createKey: PublicKey,
    members: PublicKey[]
  ): Promise<string> {
    try {
      // Validate input
      if (threshold <= 0 || threshold > members.length) {
        throw new Error(`Invalid threshold: ${threshold}. Must be between 1 and ${members.length}`);
      }
      
      // Create multisig
      const squadsMpl = SquadsMpl.get();
      const createMultisigIx = await createCreateMultisigInstruction(
        {
          createKey,
          creator: this.payer.publicKey,
        },
        {
          threshold,
          members,
          name: 'PumpBubble DAO',
          description: 'Investment DAO Treasury',
          timeLock: 0, // No time lock
        },
        squadsMpl.programId
      );
      
      // Create and send transaction
      const tx = new Transaction().add(createMultisigIx);
      const signature = await sendAndConfirmTransaction(
        this.connection,
        tx,
        [this.payer]
      );
      
      // Get multisig address
      const [multisigPda] = getMultisigPda(
        createKey,
        squadsMpl.programId
      );
      
      logger.info(`Multisig created successfully at ${multisigPda.toBase58()}`);
      logger.info(`Transaction signature: ${signature}`);
      
      return multisigPda.toBase58();
    } catch (error) {
      logger.error('Failed to create multisig:', error);
      throw new Error(`Failed to create multisig: ${error.message}`);
    }
  }
  
  /**
   * Fetch multisig account data
   * @param multisigAddress - Address of the multisig
   * @returns Multisig account data
   */
  async getMultisig(multisigAddress: string): Promise<MultisigAccount> {
    try {
      const squadsMpl = SquadsMpl.get();
      const multisig = await squadsMpl.account.multisig.fetch(
        new PublicKey(multisigAddress)
      ) as MultisigAccount;
      
      return multisig;
    } catch (error) {
      logger.error(`Failed to fetch multisig at ${multisigAddress}:`, error);
      throw new Error(`Failed to fetch multisig: ${error.message}`);
    }
  }
  
  /**
   * Create a new transaction for the multisig to approve and execute
   * @param multisigAddress - Address of the multisig
   * @param instructions - Instructions to include in the transaction
   * @returns The transaction address
   */
  async createTransaction(
    multisigAddress: string,
    instructions: {
      programId: PublicKey;
      keys: Array<{
        pubkey: PublicKey;
        isSigner: boolean;
        isWritable: boolean;
      }>;
      data: Buffer;
    }[]
  ): Promise<string> {
    try {
      const squadsMpl = SquadsMpl.get();
      const multisigPda = new PublicKey(multisigAddress);
      
      // Get multisig data to determine transaction index
      const multisig = await this.getMultisig(multisigAddress);
      const transactionIndex = multisig.transactionIndex;
      
      // Derive transaction PDA
      const [transactionPda] = getTransactionPda(
        multisigPda,
        transactionIndex,
        squadsMpl.programId
      );
      
      // Create transaction instruction
      const createTxIx = await createCreateTransactionInstruction(
        {
          multisig: multisigPda,
          transaction: transactionPda,
          creator: this.payer.publicKey,
        },
        {
          instructions,
        },
        squadsMpl.programId
      );
      
      // Send transaction
      const tx = new Transaction().add(createTxIx);
      const signature = await sendAndConfirmTransaction(
        this.connection,
        tx,
        [this.payer]
      );
      
      logger.info(`Multisig transaction created at ${transactionPda.toBase58()}`);
      logger.info(`Transaction signature: ${signature}`);
      
      return transactionPda.toBase58();
    } catch (error) {
      logger.error('Failed to create multisig transaction:', error);
      throw new Error(`Failed to create multisig transaction: ${error.message}`);
    }
  }
  
  /**
   * Approve a multisig transaction
   * @param multisigAddress - Address of the multisig
   * @param transactionAddress - Address of the transaction to approve
   * @returns Transaction signature
   */
  async approveTransaction(
    multisigAddress: string,
    transactionAddress: string
  ): Promise<string> {
    try {
      const squadsMpl = SquadsMpl.get();
      const multisigPda = new PublicKey(multisigAddress);
      const transactionPda = new PublicKey(transactionAddress);
      
      // Create approve instruction
      const approveIx = await createApproveInstruction(
        {
          multisig: multisigPda,
          transaction: transactionPda,
          member: this.payer.publicKey,
        },
        squadsMpl.programId
      );
      
      // Send transaction
      const tx = new Transaction().add(approveIx);
      const signature = await sendAndConfirmTransaction(
        this.connection,
        tx,
        [this.payer]
      );
      
      logger.info(`Transaction ${transactionAddress} approved`);
      logger.info(`Approval signature: ${signature}`);
      
      return signature;
    } catch (error) {
      logger.error('Failed to approve transaction:', error);
      throw new Error(`Failed to approve transaction: ${error.message}`);
    }
  }
  
  /**
   * Execute an approved multisig transaction
   * @param multisigAddress - Address of the multisig
   * @param transactionAddress - Address of the transaction to execute
   * @returns Transaction signature
   */
  async executeTransaction(
    multisigAddress: string,
    transactionAddress: string
  ): Promise<string> {
    try {
      const squadsMpl = SquadsMpl.get();
      const multisigPda = new PublicKey(multisigAddress);
      const transactionPda = new PublicKey(transactionAddress);
      
      // Get transaction account to determine instruction accounts
      const transaction = await squadsMpl.account.transaction.fetch(
        transactionPda
      ) as TransactionAccount;
      
      // Create execute instruction
      const executeIx = await createExecuteTransactionInstruction(
        {
          multisig: multisigPda,
          transaction: transactionPda,
          member: this.payer.publicKey,
        },
        squadsMpl.programId
      );
      
      // Send transaction
      const tx = new Transaction().add(executeIx);
      const signature = await sendAndConfirmTransaction(
        this.connection,
        tx,
        [this.payer]
      );
      
      logger.info(`Transaction ${transactionAddress} executed`);
      logger.info(`Execution signature: ${signature}`);
      
      return signature;
    } catch (error) {
      logger.error('Failed to execute transaction:', error);
      throw new Error(`Failed to execute transaction: ${error.message}`);
    }
  }
  
  /**
   * Get all transactions for a multisig
   * @param multisigAddress - Address of the multisig
   * @returns Array of transactions
   */
  async getTransactions(multisigAddress: string): Promise<TransactionAccount[]> {
    try {
      const squadsMpl = SquadsMpl.get();
      const multisigPda = new PublicKey(multisigAddress);
      
      // Get multisig data to determine transaction count
      const multisig = await this.getMultisig(multisigAddress);
      const transactionCount = multisig.transactionIndex;
      
      // Fetch all transactions
      const transactions: TransactionAccount[] = [];
      for (let i = 0; i < transactionCount; i++) {
        const [transactionPda] = getTransactionPda(
          multisigPda,
          i,
          squadsMpl.programId
        );
        
        try {
          const transaction = await squadsMpl.account.transaction.fetch(
            transactionPda
          ) as TransactionAccount;
          
          transactions.push(transaction);
        } catch (error) {
          logger.warn(`Failed to fetch transaction at index ${i}:`, error);
          // Continue with next transaction
        }
      }
      
      return transactions;
    } catch (error) {
      logger.error('Failed to get multisig transactions:', error);
      throw new Error(`Failed to get multisig transactions: ${error.message}`);
    }
  }
}

// Export singleton instance
export const squadsService = new SquadsMultisigService();