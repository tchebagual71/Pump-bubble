/**
 * Execute Transaction in Squads Multisig
 * 
 * This script executes a fully approved transaction in a multisig.
 */

import { PublicKey } from '@solana/web3.js';
import { squadsService } from './squads-service';
import * as yargs from 'yargs';
import * as dotenv from 'dotenv';
import * as winston from 'winston';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Load environment variables
dotenv.config();

// Parse command line arguments
const argv = yargs
  .option('multisig', {
    alias: 'm',
    description: 'Multisig address',
    type: 'string',
    demandOption: true
  })
  .option('transaction', {
    alias: 't',
    description: 'Transaction address',
    type: 'string',
    demandOption: true
  })
  .help()
  .alias('help', 'h')
  .parseSync();

async function main() {
  try {
    logger.info('Executing transaction in Squads multisig...');
    
    // Validate addresses
    const multisigAddress = argv.multisig;
    const transactionAddress = argv.transaction;
    
    try {
      new PublicKey(multisigAddress);
      new PublicKey(transactionAddress);
    } catch (error) {
      throw new Error('Invalid address format');
    }
    
    // Execute the transaction
    logger.info(`Executing transaction ${transactionAddress} in multisig ${multisigAddress}...`);
    
    const signature = await squadsService.executeTransaction(
      multisigAddress,
      transactionAddress
    );
    
    logger.info(`Transaction executed successfully!`);
    logger.info(`Signature: ${signature}`);
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

main();