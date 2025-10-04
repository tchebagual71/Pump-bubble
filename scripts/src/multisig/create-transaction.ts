/**
 * Create Transaction in Squads Multisig
 * 
 * This script creates a new transaction in a multisig that needs approval.
 */

import {
  Connection, 
  Keypair, 
  PublicKey, 
  TransactionInstruction,
  SystemProgram
} from '@solana/web3.js';
import { squadsService } from './squads-service';
import * as yargs from 'yargs';
import * as dotenv from 'dotenv';
import * as winston from 'winston';
import * as fs from 'fs';

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
  .option('instruction', {
    alias: 'i',
    description: 'Instruction JSON file path',
    type: 'string',
    demandOption: true
  })
  .option('config', {
    alias: 'c',
    description: 'Path to config file',
    type: 'string'
  })
  .help()
  .alias('help', 'h')
  .parseSync();

async function main() {
  try {
    logger.info('Creating transaction in Squads multisig...');
    
    // Validate multisig address
    const multisigAddress = argv.multisig;
    try {
      new PublicKey(multisigAddress);
    } catch (error) {
      throw new Error('Invalid multisig address');
    }

    // Load instruction file
    const instructionPath = argv.instruction;
    if (!fs.existsSync(instructionPath)) {
      throw new Error(`Instruction file not found: ${instructionPath}`);
    }
    
    const instructionJson = JSON.parse(fs.readFileSync(instructionPath, 'utf8'));
    
    // Parse instruction(s)
    const instructions: TransactionInstruction[] = [];
    
    // Single instruction format
    if (instructionJson.programId) {
      const programId = new PublicKey(instructionJson.programId);
      
      // Parse accounts
      const keys = instructionJson.accounts.map((account: any) => ({
        pubkey: new PublicKey(account.pubkey),
        isSigner: account.isSigner,
        isWritable: account.isWritable
      }));
      
      // Parse data
      const data = Buffer.from(instructionJson.data, 'base64');
      
      // Create instruction
      instructions.push(new TransactionInstruction({
        programId,
        keys,
        data
      }));
    } 
    // Multiple instructions format
    else if (Array.isArray(instructionJson)) {
      for (const ix of instructionJson) {
        const programId = new PublicKey(ix.programId);
        
        // Parse accounts
        const keys = ix.accounts.map((account: any) => ({
          pubkey: new PublicKey(account.pubkey),
          isSigner: account.isSigner,
          isWritable: account.isWritable
        }));
        
        // Parse data
        const data = Buffer.from(ix.data, 'base64');
        
        // Create instruction
        instructions.push(new TransactionInstruction({
          programId,
          keys,
          data
        }));
      }
    } else {
      throw new Error('Invalid instruction format');
    }
    
    // Create transaction in multisig
    logger.info(`Creating transaction with ${instructions.length} instruction(s)...`);
    
    // Prepare instructions for Squads format
    const squadInstructions = instructions.map(ix => ({
      programId: ix.programId,
      keys: ix.keys,
      data: ix.data
    }));
    
    // Create transaction in multisig
    const transactionAddress = await squadsService.createTransaction(
      multisigAddress,
      squadInstructions
    );
    
    logger.info(`Transaction created successfully: ${transactionAddress}`);
    logger.info('This transaction now requires approvals before it can be executed.');
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

main();