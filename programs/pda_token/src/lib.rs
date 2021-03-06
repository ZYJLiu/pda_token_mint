use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount,};

declare_id!("AA6w4TWeM86CJ1CzMsnxboF9d97xQLbcKXBz2vUtkQS7");


pub const MINT_ADDRESS: &str = "HpK7u61kJEeoCUn8iMay7A8VzxWSovDL35FMvqLA9LsJ";

#[program]
pub mod pda_token {
    use super::*;

    pub fn create_mint(ctx: Context<CreateMint>, name: String) -> Result<()> {

        let (pda, bump) = Pubkey::find_program_address(&[ctx.accounts.merchant.key().as_ref()], ctx.program_id);

        let merchant = &mut ctx.accounts.merchant;
        merchant.name = name;
        merchant.mint = pda;
        merchant.bump = bump;
        Ok(())
    }

    pub fn mint_to(ctx: Context<MintTo>, amount: u64) -> Result<()> {
        let name = ctx.accounts.merchant.key();


        let seeds = &[name.as_ref(), &[ctx.accounts.merchant.bump]];
        let signer = [&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.mint_pda.to_account_info(),
                to: ctx.accounts.user_token.to_account_info(),
                authority: ctx.accounts.mint_pda.to_account_info(),
            },
            &signer,
        );
        token::mint_to(cpi_ctx, amount)?;

        Ok(())
    }

    pub fn burn(ctx: Context<Burn>, amount: u64) -> Result<()> {

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Burn {
                mint: ctx.accounts.mint_pda.to_account_info(),
                from: ctx.accounts.user_token.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::burn(cpi_ctx, amount)?;

        Ok(())
    }
}


#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateMint<'info> {
    #[account(
        init,
        payer = user,
        space = 100 // TODO: calculate space
    )]
    pub merchant: Account<'info, Merchant>,

    #[account(
        init,
        seeds = [merchant.key().as_ref()],
        bump,
        payer = user,
        mint::decimals = 2,
        mint::authority = mint_pda, 
        
    )]
    pub mint_pda: Account<'info, Mint>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct MintTo<'info> {
    #[account()]
    pub merchant: Account<'info, Merchant>,
    #[account(mut)]
    pub mint_pda: Account<'info, Mint>,

    // User Token Account
    #[account(mut)]
    pub user_token: Account<'info, TokenAccount>,

    pub user: Signer<'info>,

    // SPL Token Program
    pub token_program: Program<'info, Token>,
}


#[derive(Accounts)]
pub struct Burn<'info> {
    //NEED TO CHECK
    #[account(mut)]
    pub mint_pda: Account<'info, Mint>,

    // see `token::Burn.to`
    #[account(mut)]
    pub user_token: Account<'info, TokenAccount>,

    // The authority allowed to mutate the above ??????
    pub user: Signer<'info>,

        // SPL Token Program
    pub token_program: Program<'info, Token>,

}

#[account]
pub struct Merchant {
    pub name: String,
    pub mint: Pubkey,
    pub bump: u8,
    pub discount: u8,
    pub cash_back: u8
}