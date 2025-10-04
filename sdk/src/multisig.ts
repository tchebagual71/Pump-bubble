/**
 * Multisig Module
 * 
 * This module provides functions to interact with the Squads MPL multisig program.
 * It wraps all functionality for creating, approving, and executing transactions.
 */

import {
  Connection,
  PublicKey,
  TransactionInstruction,
  Transaction,
  sendAndConfirmTransaction,
  Keypair
} from '@solana/web3.js';
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

export interface MultisigMember {
  publicKey: PublicKey;
  isAuthority?: boolean;
}

export interface MultisigTransaction {
  address: string;
  multisigAddress: string;
  status: 'active' | 'executed' | 'cancelled';
  approvals: string[];
  instructions: any[];
  createdAt?: Date;
  executedAt?: Date;
}

export class MultisigClient {
  private connection: Connection;
  private wallet: any; // Should be a wallet adapter
  private programId: PublicKey;
  
  /**
   * Create a new MultisigClient instance
   * @param connection - Solana connection
   * @param wallet - Wallet for transactions
   * @param programId - Squads MPL program ID (optional, defaults to mainnet)
   */
  constructor(
    connection: Connection,
    wallet: any,
    programIdOrNetwork: PublicKey | string = 'mainnet'
  ) {
    this.connection = connection;
    this.wallet = wallet;
    
    // Set the program ID based on network or use provided value
    if (typeof programIdOrNetwork === 'string') {
      if (programIdOrNetwork === 'mainnet') {
        this.programId = new PublicKey('SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu');
      } else if (programIdOrNetwork === 'devnet') {
        this.programId = new PublicKey('SMPLKTQhrgo22hFCVq2VGX1KAktTWjeizkhrdB1eauK');
      } else {
        throw new Error(`Unknown network: ${programIdOrNetwork}`);
      }
    } else {
      this.programId = programIdOrNetwork;
    }
  }
  
  /**
   * Create a new multisig
   * @param createKey - Key to derive the multisig address from
   * @param threshold - Number of approvals required
   * @param members - Array of member public keys
   * @param name - Name of the multisig
   * @param description - Description of the multisig
   * @returns Address of the created multisig
   */
  async createMultisig(
    createKey: PublicKey,
    threshold: number,
    members: PublicKey[],
    name: string = 'Pump Bubble DAO',
    description: string = 'Investment DAO Treasury'
  ): Promise<string> {
    // Initialize Squads MPL
    const squadsMpl = SquadsMpl.get();
    
    // Create multisig instruction
    const createMultisigIx = await createCreateMultisigInstruction(
      {
        createKey,
        creator: this.wallet.publicKey,
      },
      {
        threshold,
        members,
        name,
        description,
        timeLock: 0, // No time lock
      },
      this.programId
    );
    
    // Build transaction
    const transaction = new Transaction().add(createMultisigIx);
    
    // Send transaction
    await this.wallet.sendTransaction(transaction, this.connection);
    
    // Return the multisig address
    const [multisigPda] = getMultisigPda(
      createKey,
      this.programId
    );
    
    return multisigPda.toBase58();
  }
  
  /**
   * Get multisig details
   * @param multisigAddress - Address of the multisig
   * @returns Multisig account data
   */
  async getMultisig(multisigAddress: string | PublicKey): Promise<MultisigAccount> {
    const squadsMpl = SquadsMpl.get();
    const multisigPda = typeof multisigAddress === 'string' ? 
      new PublicKey(multisigAddress) : multisigAddress;
      
    return await squadsMpl.account.multisig.fetch(
      multisigPda
    ) as MultisigAccount;
  }
  
  /**
   * Create a transaction for a multisig
   * @param multisigAddress - Address of the multisig
   * @param instructions - Instructions to include in the transaction
   * @returns Address of the created transaction
   */
  async createTransaction(
    multisigAddress: string | PublicKey,
    instructions: TransactionInstruction[]
  ): Promise<string> {
    const squadsMpl = SquadsMpl.get();
    const multisigPda = typeof multisigAddress === 'string' ? 
      new PublicKey(multisigAddress) : multisigAddress;
    
    // Get multisig data to determine transaction index
    const multisig = await this.getMultisig(multisigPda);
    const transactionIndex = multisig.transactionIndex;
    
    // Derive transaction PDA
    const [transactionPda] = getTransactionPda(
      multisigPda,
      transactionIndex,
      this.programId
    );
    
    // Convert instructions to squads format
    const squadInstructions = instructions.map(ix => ({
      programId: ix.programId,
      keys: ix.keys,
      data: ix.data
    }));
    
    // Create transaction instruction
    const createTxIx = await createCreateTransactionInstruction(
      {
        multisig: multisigPda,
        transaction: transactionPda,
        creator: this.wallet.publicKey,
      },
      {
        instructions: squadInstructions,
      },
      this.programId
    );
    
    // Build transaction
    const transaction = new Transaction().add(createTxIx);
    
    // Send transaction
    await this.wallet.sendTransaction(transaction, this.connection);
    
    return transactionPda.toBase58();
  }
  
  /**
   * Approve a multisig transaction
   * @param multisigAddress - Address of the multisig
   * @param transactionAddress - Address of the transaction to approve
   * @returns Transaction signature
   */
  async approveTransaction(
    multisigAddress: string | PublicKey,
    transactionAddress: string | PublicKey
  ): Promise<string> {
    const squadsMpl = SquadsMpl.get();
    const multisigPda = typeof multisigAddress === 'string' ? 
      new PublicKey(multisigAddress) : multisigAddress;
    const transactionPda = typeof transactionAddress === 'string' ? 
      new PublicKey(transactionAddress) : transactionAddress;
    
    // Create approve instruction
    const approveIx = await createApproveInstruction(
      {
        multisig: multisigPda,
        transaction: transactionPda,
        member: this.wallet.publicKey,
      },
      this.programId
    );
    
    // Build transaction
    const transaction = new Transaction().add(approveIx);
    
    // Send transaction
    const { signature } = await this.wallet.sendTransaction(transaction, this.connection);
    
    return signature;
  }
  
  /**
   * Execute a multisig transaction
   * @param multisigAddress - Address of the multisig
   * @param transactionAddress - Address of the transaction to execute
   * @returns Transaction signature
   */
  async executeTransaction(
    multisigAddress: string | PublicKey,
    transactionAddress: string | PublicKey
  ): Promise<string> {
    const squadsMpl = SquadsMpl.get();
    const multisigPda = typeof multisigAddress === 'string' ? 
      new PublicKey(multisigAddress) : multisigAddress;
    const transactionPda = typeof transactionAddress === 'string' ? 
      new PublicKey(transactionAddress) : transactionAddress;
    
    // Create execute instruction
    const executeIx = await createExecuteTransactionInstruction(
      {
        multisig: multisigPda,
        transaction: transactionPda,
        member: this.wallet.publicKey,
      },
      this.programId
    );
    
    // Build transaction
    const transaction = new Transaction().add(executeIx);
    
    // Send transaction
    const { signature } = await this.wallet.sendTransaction(transaction, this.connection);
    
    return signature;
  }
  
  /**
   * Get all transactions for a multisig
   * @param multisigAddress - Address of the multisig
   * @returns Array of transactions
   */
  async getTransactions(multisigAddress: string | PublicKey): Promise<any[]> {
    const squadsMpl = SquadsMpl.get();
    const multisigPda = typeof multisigAddress === 'string' ? 
      new PublicKey(multisigAddress) : multisigAddress;
    
    // Get multisig data to determine transaction count
    const multisig = await this.getMultisig(multisigPda);
    const transactionCount = multisig.transactionIndex;
    
    // Fetch all transactions
    const transactions = [];
    for (let i = 0; i < transactionCount; i++) {
      const [transactionPda] = getTransactionPda(
        multisigPda,
        i,
        this.programId
      );
      
      try {
        const transaction = await squadsMpl.account.transaction.fetch(
          transactionPda
        );
        
        transactions.push({
          address: transactionPda.toBase58(),
          multisigAddress: multisigPda.toBase58(),
          index: i,
          ...transaction
        });
      } catch (error) {
        console.warn(`Failed to fetch transaction at index ${i}:`, error);
        // Continue with next transaction
      }
    }
    
    return transactions;
  }
}

export function createMultisigClient(
  connection: Connection,
  wallet: any,
  programIdOrNetwork: PublicKey | string = 'mainnet'
): MultisigClient {
  return new MultisigClient(connection, wallet, programIdOrNetwork);
}