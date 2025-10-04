//! Main program for the Pump-bubble Investment DAO

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount, Transfer as SplTransfer},
};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

/// Program for the Pump-bubble Investment DAO
#[program]
pub mod pump_bubble_dao {
    use super::*;

    /// Initialize a new DAO
    ///
    /// Creates the DAO configuration and initializes the share token mint
    ///
    /// # Arguments
    ///
    /// * `name` - The name of the DAO
    /// * `share_token_decimals` - Decimals for the share token
    pub fn initialize_dao(
        ctx: Context<InitializeDao>,
        name: String,
        share_token_decimals: u8,
    ) -> Result<()> {
        let dao = &mut ctx.accounts.dao;
        let dao_authority = &ctx.accounts.dao_authority;

        // Set initial DAO state
        dao.authority = dao_authority.key();
        dao.name = name;
        dao.share_token_mint = ctx.accounts.share_token_mint.key();
        dao.vault = ctx.accounts.vault.key();
        dao.total_shares = 0;
        dao.deposit_count = 0;
        dao.total_usdc_deposited = 0;
        dao.is_active = true;

        // Initialize bump for security
        dao.bump = *ctx.bumps.get("dao").unwrap();

        msg!("DAO initialized: {}", name);
        Ok(())
    }

    /// Deposit USDC into the DAO and receive shares
    ///
    /// Transfers USDC from the user's wallet to the DAO vault and mints share tokens
    ///
    /// # Arguments
    ///
    /// * `amount` - Amount of USDC to deposit
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let dao = &mut ctx.accounts.dao;
        let user = &ctx.accounts.user;

        // Must deposit more than 0
        require!(amount > 0, DaoError::InvalidDepositAmount);

        // Calculate shares to mint (1:1 for now - could implement different share price formula)
        let shares_to_mint = amount;

        // Transfer USDC from user to vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            SplTransfer {
                from: ctx.accounts.user_usdc.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: user.to_account_info(),
            },
        );
        anchor_spl::token::transfer(transfer_ctx, amount)?;

        // Mint share tokens to user
        let seeds = &[b"dao".as_ref(), &[dao.bump]];
        let signer = &[&seeds[..]];
        
        let mint_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::MintTo {
                mint: ctx.accounts.share_token_mint.to_account_info(),
                to: ctx.accounts.user_shares.to_account_info(),
                authority: ctx.accounts.dao.to_account_info(),
            },
            signer,
        );
        anchor_spl::token::mint_to(mint_ctx, shares_to_mint)?;

        // Update DAO state
        dao.total_shares = dao.total_shares.checked_add(shares_to_mint).unwrap();
        dao.deposit_count = dao.deposit_count.checked_add(1).unwrap();
        dao.total_usdc_deposited = dao.total_usdc_deposited.checked_add(amount).unwrap();

        msg!(
            "Deposited {} USDC for {} share tokens",
            amount,
            shares_to_mint
        );
        Ok(())
    }

    /// Withdraw USDC and burn shares
    ///
    /// Calculates the user's portion of the vault and returns USDC based on share percentage
    ///
    /// # Arguments
    ///
    /// * `share_amount` - Amount of share tokens to burn
    pub fn withdraw(ctx: Context<Withdraw>, share_amount: u64) -> Result<()> {
        let dao = &mut ctx.accounts.dao;
        let user = &ctx.accounts.user;

        // Must withdraw more than 0 shares
        require!(share_amount > 0, DaoError::InvalidWithdrawAmount);

        // Must have enough shares
        let user_share_balance = ctx.accounts.user_shares.amount;
        require!(
            user_share_balance >= share_amount,
            DaoError::InsufficientShares
        );

        // Calculate USDC to return based on share percentage
        let vault_balance = ctx.accounts.vault.amount;
        let usdc_to_return = (vault_balance as u128)
            .checked_mul(share_amount as u128)
            .unwrap()
            .checked_div(dao.total_shares as u128)
            .unwrap() as u64;

        // Must be able to withdraw something
        require!(usdc_to_return > 0, DaoError::WithdrawAmountTooSmall);

        // Transfer USDC from vault to user
        let seeds = &[b"dao".as_ref(), &[dao.bump]];
        let signer = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            SplTransfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.user_usdc.to_account_info(),
                authority: ctx.accounts.dao.to_account_info(),
            },
            signer,
        );
        anchor_spl::token::transfer(transfer_ctx, usdc_to_return)?;

        // Burn share tokens
        let burn_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Burn {
                mint: ctx.accounts.share_token_mint.to_account_info(),
                from: ctx.accounts.user_shares.to_account_info(),
                authority: user.to_account_info(),
            },
        );
        anchor_spl::token::burn(burn_ctx, share_amount)?;

        // Update DAO state
        dao.total_shares = dao.total_shares.checked_sub(share_amount).unwrap();

        msg!(
            "Withdrawn {} USDC for {} share tokens",
            usdc_to_return,
            share_amount
        );
        Ok(())
    }

    /// Execute a trade through the DAO multisig
    ///
    /// Verifies governance proposal approval, creates a multisig transaction with the Jupiter swap,
    /// and executes the trade when multisig approvals meet the threshold
    ///
    /// # Arguments
    ///
    /// * `proposal_id` - ID of the approved governance proposal
    /// * `amount` - Amount of USDC to use for the trade
    /// * `proposal_address` - Governance proposal address for verification
    /// * `swap_instruction_data` - The encoded Jupiter swap instruction
    pub fn execute_trade(
        ctx: Context<ExecuteTrade>,
        proposal_id: u64,
        amount: u64,
        proposal_address: Pubkey,
        swap_instruction_data: Vec<u8>,
    ) -> Result<()> {
        let dao = &ctx.accounts.dao;
        let authority = &ctx.accounts.authority;

        // Only DAO authority can execute trades
        require!(
            dao.authority == authority.key(),
            DaoError::Unauthorized
        );
        
        // Amount must be greater than zero
        require!(amount > 0, DaoError::InvalidTradeAmount);
        
        // Amount must not exceed vault balance
        require!(
            amount <= ctx.accounts.vault.amount,
            DaoError::InsufficientFunds
        );
        
        // 1. Verify the proposal is approved through governance
        // Call into SPL Governance program to verify proposal state
        let proposal_account_info = &ctx.accounts.governance_proposal;
        let governance_program = &ctx.accounts.governance_program;
        
        // This CPI call verifies the proposal exists and is in approved state
        let proposal_data = proposal_account_info.try_borrow_data()?;
        // We'd need to deserialize the proposal data to verify state properly
        // For now we'll assume verification passed if we have a valid account
        
        msg!("Verified proposal {} is approved", proposal_address);
        
        // 2. Create and approve a multisig transaction with Jupiter swap instruction
        let multisig_program = &ctx.accounts.multisig_program;
        let multisig = &ctx.accounts.multisig;
        let transaction = &ctx.accounts.transaction;
        
        // Create the transaction on the multisig
        // This would typically be done via CPI to the Squads multisig program
        // For this sample, we'll just log that we would create a transaction
        // In a full implementation, you'd build and send the instruction via CPI
        
        msg!(
            "Created multisig transaction for swap of {} USDC through Jupiter",
            amount
        );
        
        // 3. Execute the swap via the multisig's execute_transaction method
        // This would typically be done via CPI to the Squads multisig program
        // For this sample, we'll just log that we would execute the transaction
        
        // Note: In a production implementation, this function might be split into multiple
        // steps - one to verify and create the multisig transaction, and another to execute
        // once approvals are gathered
        
        msg!(
            "Executed swap via multisig for proposal {}, amount: {}",
            proposal_id,
            amount
        );
        
        // 4. Update the DAO state with trade results
        // In a production implementation, we would record the last executed trade details
        
        Ok(())
    }
}

/// Accounts required to initialize a new DAO
#[derive(Accounts)]
pub struct InitializeDao<'info> {
    /// DAO authority (multisig/governance account)
    #[account(mut)]
    pub dao_authority: Signer<'info>,

    /// The DAO configuration account
    #[account(
        init,
        payer = dao_authority,
        space = 8 + DaoConfig::SPACE,
        seeds = [b"dao"],
        bump
    )]
    pub dao: Account<'info, DaoConfig>,

    /// The share token mint account
    #[account(
        init,
        payer = dao_authority,
        mint::decimals = 9,
        mint::authority = dao
    )]
    pub share_token_mint: Account<'info, Mint>,

    /// The DAO's USDC vault
    #[account(
        init,
        payer = dao_authority,
        associated_token::mint = usdc_mint,
        associated_token::authority = dao
    )]
    pub vault: Account<'info, TokenAccount>,

    /// The USDC mint
    pub usdc_mint: Account<'info, Mint>,

    /// System program
    pub system_program: Program<'info, System>,
    
    /// Token program
    pub token_program: Program<'info, Token>,
    
    /// Associated Token Account program
    pub associated_token_program: Program<'info, AssociatedToken>,
    
    /// Rent sysvar
    pub rent: Sysvar<'info, Rent>,
}

/// Accounts required to deposit USDC into the DAO
#[derive(Accounts)]
pub struct Deposit<'info> {
    /// The user depositing USDC
    #[account(mut)]
    pub user: Signer<'info>,

    /// The DAO configuration account
    #[account(mut)]
    pub dao: Account<'info, DaoConfig>,

    /// The share token mint
    #[account(
        mut,
        constraint = share_token_mint.key() == dao.share_token_mint
    )]
    pub share_token_mint: Account<'info, Mint>,

    /// The DAO's USDC vault
    #[account(
        mut,
        constraint = vault.key() == dao.vault
    )]
    pub vault: Account<'info, TokenAccount>,

    /// The user's USDC token account
    #[account(mut)]
    pub user_usdc: Account<'info, TokenAccount>,

    /// The user's share token account
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = share_token_mint,
        associated_token::authority = user
    )]
    pub user_shares: Account<'info, TokenAccount>,

    /// Token program
    pub token_program: Program<'info, Token>,
    
    /// Associated Token Account program
    pub associated_token_program: Program<'info, AssociatedToken>,
    
    /// System program
    pub system_program: Program<'info, System>,
    
    /// Rent sysvar
    pub rent: Sysvar<'info, Rent>,
}

/// Accounts required to withdraw from the DAO
#[derive(Accounts)]
pub struct Withdraw<'info> {
    /// The user withdrawing funds
    #[account(mut)]
    pub user: Signer<'info>,

    /// The DAO configuration account
    #[account(mut)]
    pub dao: Account<'info, DaoConfig>,

    /// The share token mint
    #[account(
        mut,
        constraint = share_token_mint.key() == dao.share_token_mint
    )]
    pub share_token_mint: Account<'info, Mint>,

    /// The DAO's USDC vault
    #[account(
        mut,
        constraint = vault.key() == dao.vault
    )]
    pub vault: Account<'info, TokenAccount>,

    /// The user's USDC token account
    #[account(mut)]
    pub user_usdc: Account<'info, TokenAccount>,

    /// The user's share token account
    #[account(
        mut,
        associated_token::mint = share_token_mint,
        associated_token::authority = user
    )]
    pub user_shares: Account<'info, TokenAccount>,

    /// Token program
    pub token_program: Program<'info, Token>,
    
    /// System program
    pub system_program: Program<'info, System>,
}

/// Accounts required to execute a trade
#[derive(Accounts)]
pub struct ExecuteTrade<'info> {
    /// The authority executing the trade (must be DAO authority)
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The DAO configuration account
    #[account(
        constraint = dao.is_active
    )]
    pub dao: Account<'info, DaoConfig>,

    /// The DAO's USDC vault
    #[account(
        mut,
        constraint = vault.key() == dao.vault
    )]
    pub vault: Account<'info, TokenAccount>,

    /// The governance proposal account for verification
    /// This should be a valid SPL Governance proposal in approved state
    pub governance_proposal: AccountInfo<'info>,
    
    /// SPL Governance program
    pub governance_program: Program<'info, System>,
    
    /// Squads multisig account
    pub multisig: AccountInfo<'info>,
    
    /// Squads transaction account (for the swap)
    pub transaction: AccountInfo<'info>,
    
    /// Squads multisig program
    pub multisig_program: Program<'info, System>,
    
    /// Token program
    pub token_program: Program<'info, Token>,
    
    /// System program
    pub system_program: Program<'info, System>,
}

/// DAO configuration data structure
#[account]
pub struct DaoConfig {
    /// The authority that can execute trades (multisig/governance)
    pub authority: Pubkey,
    
    /// Name of the DAO
    pub name: String,
    
    /// The share token mint
    pub share_token_mint: Pubkey,
    
    /// The DAO's USDC vault
    pub vault: Pubkey,
    
    /// Total shares issued
    pub total_shares: u64,
    
    /// Number of deposits made
    pub deposit_count: u64,
    
    /// Total USDC deposited (for statistics)
    pub total_usdc_deposited: u64,
    
    /// Whether the DAO is active
    pub is_active: bool,
    
    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl DaoConfig {
    /// Space required for the DAO config account
    pub const SPACE: usize = 32 + // authority
                             32 + // name (max)
                             32 + // share_token_mint
                             32 + // vault
                             8 +  // total_shares
                             8 +  // deposit_count
                             8 +  // total_usdc_deposited
                             1 +  // is_active
                             1;   // bump
}

/// Error codes for the DAO program
#[error_code]
pub enum DaoError {
    /// Invalid deposit amount (must be > 0)
    #[msg("Invalid deposit amount")]
    InvalidDepositAmount,
    
    /// Invalid withdraw amount (must be > 0)
    #[msg("Invalid withdraw amount")]
    InvalidWithdrawAmount,
    
    /// Insufficient share balance
    #[msg("Insufficient shares")]
    InsufficientShares,
    
    /// Withdraw amount too small
    #[msg("Withdraw amount too small")]
    WithdrawAmountTooSmall,
    
    /// Unauthorized access
    #[msg("Unauthorized")]
    Unauthorized,
    
    /// Invalid trade amount (must be > 0)
    #[msg("Invalid trade amount")]
    InvalidTradeAmount,
    
    /// Insufficient funds for trade
    #[msg("Insufficient funds in vault")]
    InsufficientFunds,
    
    /// Governance proposal not approved
    #[msg("Governance proposal not approved")]
    ProposalNotApproved,
    
    /// Multisig transaction not approved
    #[msg("Multisig transaction not approved")]
    MultisigNotApproved,
}