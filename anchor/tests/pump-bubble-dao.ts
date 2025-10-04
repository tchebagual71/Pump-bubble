import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { PumpBubbleDao } from '../target/types/pump_bubble_dao';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import { assert } from 'chai';

describe('pump-bubble-dao', () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PumpBubbleDao as Program<PumpBubbleDao>;
  
  const wallet = provider.wallet;
  const connection = provider.connection;
  
  let usdcMint: anchor.web3.PublicKey;
  let shareTokenMint: anchor.web3.PublicKey;
  let daoAddress: anchor.web3.PublicKey;
  let vaultAddress: anchor.web3.PublicKey;
  let userUsdcAccount: anchor.web3.PublicKey;
  let userSharesAccount: anchor.web3.PublicKey;
  
  const DAO_NAME = "Test DAO";
  const SHARE_DECIMALS = 9;
  const USDC_DECIMALS = 6;
  const TEST_DEPOSIT_AMOUNT = 1000000; // 1 USDC

  before(async () => {
    // Derive DAO PDA address
    [daoAddress] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("dao")],
      program.programId
    );
    
    // Create a USDC mock mint
    usdcMint = await createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      null,
      USDC_DECIMALS
    );
    
    // Create USDC account for the user and mint some USDC
    userUsdcAccount = await createAssociatedTokenAccount(
      connection,
      wallet.payer,
      usdcMint,
      wallet.publicKey
    );
    
    await mintTo(
      connection,
      wallet.payer,
      usdcMint,
      userUsdcAccount,
      wallet.publicKey,
      10000000 // 10 USDC
    );
    
    // Generate share token mint address
    shareTokenMint = anchor.web3.Keypair.generate().publicKey;
    
    // Find vault address
    vaultAddress = await getAssociatedTokenAddress(
      usdcMint,
      daoAddress,
      true
    );
    
    // Find user shares account address
    userSharesAccount = await getAssociatedTokenAddress(
      shareTokenMint,
      wallet.publicKey
    );
  });

  it('Initializes the DAO', async () => {
    await program.methods
      .initializeDao(DAO_NAME, SHARE_DECIMALS)
      .accounts({
        daoAuthority: wallet.publicKey,
        dao: daoAddress,
        shareTokenMint,
        vault: vaultAddress,
        usdcMint,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
      
    // Verify DAO configuration
    const daoAccount = await program.account.daoConfig.fetch(daoAddress);
    assert.equal(daoAccount.name, DAO_NAME);
    assert.equal(daoAccount.authority.toBase58(), wallet.publicKey.toBase58());
    assert.equal(daoAccount.totalShares.toString(), '0');
    assert.isTrue(daoAccount.isActive);
  });

  it('Allows deposits and mints share tokens', async () => {
    await program.methods
      .deposit(new anchor.BN(TEST_DEPOSIT_AMOUNT))
      .accounts({
        user: wallet.publicKey,
        dao: daoAddress,
        shareTokenMint,
        vault: vaultAddress,
        userUsdc: userUsdcAccount,
        userShares: userSharesAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
      
    // Verify updated DAO state
    const daoAccount = await program.account.daoConfig.fetch(daoAddress);
    assert.equal(daoAccount.totalShares.toString(), TEST_DEPOSIT_AMOUNT.toString());
    assert.equal(daoAccount.depositCount.toString(), '1');
    assert.equal(daoAccount.totalUsdcDeposited.toString(), TEST_DEPOSIT_AMOUNT.toString());
    
    // Verify user received shares
    const userSharesInfo = await connection.getTokenAccountBalance(userSharesAccount);
    assert.equal(userSharesInfo.value.amount, TEST_DEPOSIT_AMOUNT.toString());
  });

  it('Allows withdrawals and burns share tokens', async () => {
    const withdrawAmount = TEST_DEPOSIT_AMOUNT / 2; // Withdraw half
    
    await program.methods
      .withdraw(new anchor.BN(withdrawAmount))
      .accounts({
        user: wallet.publicKey,
        dao: daoAddress,
        shareTokenMint,
        vault: vaultAddress,
        userUsdc: userUsdcAccount,
        userShares: userSharesAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
      
    // Verify updated DAO state
    const daoAccount = await program.account.daoConfig.fetch(daoAddress);
    assert.equal(
      daoAccount.totalShares.toString(), 
      (TEST_DEPOSIT_AMOUNT - withdrawAmount).toString()
    );
    
    // Verify user shares were burned
    const userSharesInfo = await connection.getTokenAccountBalance(userSharesAccount);
    assert.equal(
      userSharesInfo.value.amount, 
      (TEST_DEPOSIT_AMOUNT - withdrawAmount).toString()
    );
  });
});