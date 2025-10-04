/**
 * Create Multisig CLI tool
 * 
 * Command-line utility for creating a new Squads multisig for a DAO
 */

import { program } from 'commander';
import { PublicKey } from '@solana/web3.js';
import { squadsService } from './squads-service';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Setup command-line interface
program
  .name('create-multisig')
  .description('Create a new Squads multisig for a DAO')
  .requiredOption('-t, --threshold <number>', 'Number of approvals required', parseInt)
  .requiredOption('-m, --members <addresses...>', 'Member wallet addresses (comma-separated)')
  .option('-o, --output <filepath>', 'Output file for multisig details', './multisig-details.json')
  .parse(process.argv);

const options = program.opts();

// Validate threshold
if (isNaN(options.threshold) || options.threshold <= 0) {
  console.error('Error: Threshold must be a positive number');
  process.exit(1);
}

// Parse and validate member addresses
let members: PublicKey[] = [];
try {
  if (typeof options.members === 'string') {
    options.members = options.members.split(',');
  }
  
  members = options.members.map((addr: string) => {
    try {
      return new PublicKey(addr.trim());
    } catch (e) {
      throw new Error(`Invalid wallet address: ${addr}`);
    }
  });
  
  if (members.length === 0) {
    throw new Error('At least one member address is required');
  }
  
  if (options.threshold > members.length) {
    throw new Error(`Threshold (${options.threshold}) cannot be greater than number of members (${members.length})`);
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}

// Generate a random create key
const createKey = new PublicKey(
  Buffer.from(
    Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
  )
);

async function main() {
  try {
    console.log(`Creating multisig with ${members.length} members and threshold of ${options.threshold}...`);
    
    // Create the multisig
    const multisigAddress = await squadsService.createMultisig(
      options.threshold,
      createKey,
      members
    );
    
    console.log(`Multisig created successfully!`);
    console.log(`Multisig Address: ${multisigAddress}`);
    
    // Fetch multisig details
    const multisig = await squadsService.getMultisig(multisigAddress);
    
    // Save details to output file
    const outputPath = path.resolve(options.output);
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const multisigDetails = {
      address: multisigAddress,
      createKey: createKey.toBase58(),
      threshold: multisig.threshold,
      members: multisig.members.map(m => m.toBase58()),
      name: multisig.name,
      description: multisig.description,
      createdAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      outputPath,
      JSON.stringify(multisigDetails, null, 2)
    );
    
    console.log(`Multisig details saved to ${outputPath}`);
    
    return multisigAddress;
  } catch (error) {
    console.error(`Error creating multisig: ${error.message}`);
    process.exit(1);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });