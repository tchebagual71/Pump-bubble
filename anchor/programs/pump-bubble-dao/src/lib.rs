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
    /// This is a placeholder for multisig integration
    /// In a real implementation, this would interact with Jupiter Aggregator
    ///
    /// # Arguments
    ///
    /// * `proposal_id` - ID of the approved governance proposal
    /// * `amount` - Amount of USDC to use for the trade
    pub fn execute_trade(
        ctx: Context<ExecuteTrade>,
        proposal_id: u64,
        amount: u64,
    ) -> Result<()> {
        let dao = &ctx.accounts.dao;
        let authority = &ctx.accounts.authority;

        // Only DAO authority can execute trades
        require!(
            dao.authority == authority.key(),
            DaoError::Unauthorized
        );

        // In a real implementation:
        // 1. Verify proposal was approved through governance
        // 2. Perform the trade through Jupiter Aggregator
        // 3. Update the DAO state with trade results

        msg!("Trade executed for proposal {}, amount: {}", proposal_id, amount);
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
}