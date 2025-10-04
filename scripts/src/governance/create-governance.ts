/**
 * Create Governance Realm CLI tool
 * 
 * Command-line utility for setting up governance for a DAO using SPL Governance
 */

import { program } from 'commander';
import { PublicKey } from '@solana/web3.js';
import { governanceService } from './governance-service';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Setup command-line interface
program
  .name('create-governance')
  .description('Create a governance realm using SPL Governance')
  .requiredOption('-n, --name <string>', 'Name of the governance realm')
  .requiredOption('-c, --community-mint <address>', 'Community token mint address')
  .option('-m, --council-mint <address>', 'Council token mint address')
  .option('-t, --min-tokens <number>', 'Minimum community tokens to create governance', '1')
  .option('-o, --output <filepath>', 'Output file for governance details', './governance-details.json')
  .parse(process.argv);

const options = program.opts();

// Validate mint addresses
try {
  new PublicKey(options.communityMint);
  if (options.councilMint) {
    new PublicKey(options.councilMint);
  }
} catch (e) {
  console.error(`Error: Invalid mint address: ${e.message}`);
  process.exit(1);
}

// Parse min tokens
const minTokens = parseInt(options.minTokens);
if (isNaN(minTokens) || minTokens <= 0) {
  console.error('Error: Minimum tokens must be a positive number');
  process.exit(1);
}

async function main() {
  try {
    console.log(`Creating governance realm "${options.name}"...`);
    
    // Convert addresses to PublicKey
    const communityMint = new PublicKey(options.communityMint);
    const councilMint = options.councilMint ? new PublicKey(options.councilMint) : undefined;
    
    // Create the realm
    const realmAddress = await governanceService.createRealm(
      options.name,
      communityMint,
      councilMint,
      minTokens
    );
    
    console.log(`Governance realm created successfully!`);
    console.log(`Realm Address: ${realmAddress}`);
    
    // Get the realm data from the blockchain
    // Note: In a real implementation, we would fetch this data
    
    // Save details to output file
    const outputPath = path.resolve(options.output);
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const governanceDetails = {
      realmAddress,
      name: options.name,
      communityMint: options.communityMint,
      councilMint: options.councilMint || null,
      minTokensToCreateGovernance: minTokens,
      createdAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      outputPath,
      JSON.stringify(governanceDetails, null, 2)
    );
    
    console.log(`Governance details saved to ${outputPath}`);
    console.log(`\nTo deposit governance tokens, use:`);
    console.log(`ts-node src/governance/deposit-tokens.ts --realm ${realmAddress} --mint ${options.communityMint} --amount <amount>\n`);
    
    return realmAddress;
  } catch (error) {
    console.error(`Error creating governance realm: ${error.message}`);
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