import { PublicKey } from '@solana/web3.js';

export class SolanaListener {
  constructor(connection) {
    this.connection = connection;
    this.walletDeltas = new Map(); // wallet -> total tokens
    this.subscriptions = new Map();
    this.isRunning = false;
    this.broadcastCallback = null;
    
    // Mint address to monitor (should be configurable)
    this.mintAddress = new PublicKey(
      process.env.MINT_ADDRESS || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC as default
    );
    
    // Common AMM program IDs to monitor
    this.ammProgramIds = [
      new PublicKey('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'), // Raydium AMM
      new PublicKey('5quBtoiQqxF9Jv6KYKctB59NT3gtJD2WhGAUSLtDWpVQ'), // Raydium V4
      new PublicKey('SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8'), // Swap Program
      new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'), // Whirlpool
    ];
  }

  start(broadcastCallback) {
    if (this.isRunning) {
      console.log('Listener already running');
      return;
    }

    this.broadcastCallback = broadcastCallback;
    this.isRunning = true;

    console.log(`Starting Solana listener for mint: ${this.mintAddress.toString()}`);
    
    // Subscribe to account changes for the mint
    this.subscribeToMintTransfers();
    
    // Subscribe to AMM program logs
    this.subscribeToAMMSwaps();
  }

  stop() {
    if (!this.isRunning) return;

    console.log('Stopping Solana listener...');
    this.isRunning = false;

    // Unsubscribe from all subscriptions
    this.subscriptions.forEach((subscriptionId, key) => {
      try {
        this.connection.removeAccountChangeListener(subscriptionId);
        console.log(`Unsubscribed from ${key}`);
      } catch (error) {
        console.error(`Error unsubscribing from ${key}:`, error);
      }
    });

    this.subscriptions.clear();
  }

  subscribeToMintTransfers() {
    try {
      // Subscribe to mint account changes
      const subscriptionId = this.connection.onAccountChange(
        this.mintAddress,
        (accountInfo, context) => {
          this.handleMintAccountChange(accountInfo, context);
        },
        'confirmed'
      );

      this.subscriptions.set('mint-transfers', subscriptionId);
      console.log('Subscribed to mint transfers');
    } catch (error) {
      console.error('Error subscribing to mint transfers:', error);
    }
  }

  subscribeToAMMSwaps() {
    // Subscribe to logs for AMM programs
    this.ammProgramIds.forEach((programId, index) => {
      try {
        const subscriptionId = this.connection.onLogs(
          programId,
          (logs, context) => {
            this.handleAMMSwapLogs(logs, context, programId);
          },
          'confirmed'
        );

        this.subscriptions.set(`amm-${index}`, subscriptionId);
        console.log(`Subscribed to AMM program: ${programId.toString()}`);
      } catch (error) {
        console.error(`Error subscribing to AMM program ${programId.toString()}:`, error);
      }
    });
  }

  async handleMintAccountChange(accountInfo, context) {
    try {
      // This handles mint account changes
      console.log('Mint account changed:', {
        slot: context.slot,
        lamports: accountInfo.lamports
      });
    } catch (error) {
      console.error('Error handling mint account change:', error);
    }
  }

  async handleAMMSwapLogs(logs, context, programId) {
    try {
      if (!logs.logs || logs.err) return;

      // Parse transaction to extract swap details
      const signature = logs.signature;
      
      // Get transaction details
      const transaction = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      if (!transaction) return;

      await this.parseTransactionForSwaps(transaction, signature);
    } catch (error) {
      console.error('Error handling AMM swap logs:', error);
    }
  }

  async parseTransactionForSwaps(transaction, signature) {
    try {
      if (!transaction.meta || !transaction.transaction) return;

      const { preTokenBalances, postTokenBalances } = transaction.meta;
      const accounts = transaction.transaction.message.accountKeys;

      if (!preTokenBalances || !postTokenBalances) return;

      // Find token balance changes for our mint
      const relevantBalanceChanges = this.findRelevantBalanceChanges(
        preTokenBalances,
        postTokenBalances,
        accounts
      );

      if (relevantBalanceChanges.length > 0) {
        relevantBalanceChanges.forEach(change => {
          this.updateWalletDelta(change.wallet, change.delta);
          
          const data = {
            wallet: change.wallet,
            delta: change.delta,
            total: this.walletDeltas.get(change.wallet) || 0,
            signature: signature,
            timestamp: new Date().toISOString()
          };

          if (this.broadcastCallback) {
            this.broadcastCallback(data);
          }
        });
      }
    } catch (error) {
      console.error('Error parsing transaction for swaps:', error);
    }
  }

  findRelevantBalanceChanges(preBalances, postBalances, accounts) {
    const changes = [];
    const mintStr = this.mintAddress.toString();

    // Create maps for easier lookup
    const preBalanceMap = new Map();
    const postBalanceMap = new Map();

    preBalances.forEach(balance => {
      if (balance.mint === mintStr) {
        preBalanceMap.set(balance.accountIndex, balance.uiTokenAmount.uiAmount || 0);
      }
    });

    postBalances.forEach(balance => {
      if (balance.mint === mintStr) {
        postBalanceMap.set(balance.accountIndex, balance.uiTokenAmount.uiAmount || 0);
      }
    });

    // Calculate deltas
    const accountIndices = new Set([...preBalanceMap.keys(), ...postBalanceMap.keys()]);
    
    accountIndices.forEach(accountIndex => {
      const preBal = preBalanceMap.get(accountIndex) || 0;
      const postBal = postBalanceMap.get(accountIndex) || 0;
      const delta = postBal - preBal;

      if (Math.abs(delta) > 0.000001) { // Only significant changes
        const wallet = accounts[accountIndex]?.toString();
        if (wallet) {
          changes.push({ wallet, delta });
        }
      }
    });

    return changes;
  }

  updateWalletDelta(wallet, delta) {
    const currentTotal = this.walletDeltas.get(wallet) || 0;
    const newTotal = currentTotal + delta;
    this.walletDeltas.set(wallet, newTotal);
  }

  getWalletTotals() {
    return Object.fromEntries(this.walletDeltas);
  }

  getWalletTotal(wallet) {
    return this.walletDeltas.get(wallet) || 0;
  }
}