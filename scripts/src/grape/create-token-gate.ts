/**
 * Create Token Gate CLI tool
 * 
 * Command-line utility for setting up token-gated access for a DAO using Grape Protocol
 */

import { program } from 'commander';
import { PublicKey } from '@solana/web3.js';
import { grapeService } from './grape-service';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Setup command-line interface
program
  .name('create-token-gate')
  .description('Create a token-gated community using Grape Protocol')
  .requiredOption('-n, --name <string>', 'Name of the community')
  .requiredOption('-m, --mint <address>', 'Token mint address for gating')
  .requiredOption('-a, --amount <number>', 'Minimum token amount required', parseFloat)
  .option('-d, --description <string>', 'Description of the community', 'Investment DAO on Solana')
  .option('-o, --output <filepath>', 'Output file for token gate details', './token-gate-details.json')
  .parse(process.argv);

const options = program.opts();

// Validate mint address
try {
  new PublicKey(options.mint);
} catch (e) {
  console.error(`Error: Invalid mint address: ${options.mint}`);
  process.exit(1);
}

// Validate token amount
if (isNaN(options.amount) || options.amount <= 0) {
  console.error('Error: Token amount must be a positive number');
  process.exit(1);
}

async function main() {
  try {
    console.log(`Creating token-gated community "${options.name}" requiring ${options.amount} tokens...`);
    
    // Create the community with token gate
    const communityId = await grapeService.createCommunity(
      options.name,
      options.description,
      options.mint,
      options.amount
    );
    
    console.log(`Token-gated community created successfully!`);
    console.log(`Community ID: ${communityId}`);
    
    // Create an invite link
    const inviteLink = await grapeService.createInviteLink(communityId);
    console.log(`Invite Link: ${inviteLink}`);
    
    // Save details to output file
    const outputPath = path.resolve(options.output);
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const tokenGateDetails = {
      communityId,
      name: options.name,
      description: options.description,
      tokenMint: options.mint,
      requiredAmount: options.amount,
      inviteLink,
      createdAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      outputPath,
      JSON.stringify(tokenGateDetails, null, 2)
    );
    
    console.log(`Token gate details saved to ${outputPath}`);
    
    // Example command to check access
    console.log(`\nTo check wallet access, use the Grape API:`);
    console.log(`GET /access/${communityId}/YOUR_WALLET_ADDRESS\n`);
    
    return communityId;
  } catch (error) {
    console.error(`Error creating token gate: ${error.message}`);
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