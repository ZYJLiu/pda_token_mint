use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount,};

declare_id!("AA6w4TWeM86CJ1CzMsnxboF9d97xQLbcKXBz2vUtkQS7");


pub const MINT_ADDRESS: &str = "HpK7u61kJEeoCUn8iMay7A8VzxWSovDL35FMvqLA9LsJ";

#[program]
pub mod pda_token {
    use super::*;

    pub fn create_mint(_ctx: Context<CreateMint>) -> Result<()> {
        Ok(())
    }

    pub fn mint_to(ctx: Context<MintTo>, mint_authority_bump: u8, amount: u64) -> Result<()> {
        
        let seeds = &[b"my-mint-seed".as_ref(), &[mint_authority_bump]];
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

    pub fn burn(ctx: Context<Burn>,  mint_authority_bump: u8, amount: u64) -> Result<()> {

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
pub struct CreateMint<'info> {
    #[account(
        init,
        seeds = [b"my-mint-seed".as_ref()],
        bump,
        payer = user,
        mint::decimals = 6,
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
     #[account(
    mut,
    address = MINT_ADDRESS.parse::<Pubkey>().unwrap()
    )]
    pub mint_pda: Account<'info, Mint>,

    // User Token Account
    #[account(mut)]
    pub user_token: Account<'info, TokenAccount>,

    pub user: Signer<'info>,

    // SPL Token Program
    pub token_program: Program<'info, Token>,
}


#[derive(Accounts)]
#[instruction(mint_authority_bump: u8)]
pub struct Burn<'info> {
    //NEED TO CHECK
    #[account(mut,
    address = MINT_ADDRESS.parse::<Pubkey>().unwrap()
    )]
    pub mint_pda: Account<'info, Mint>,

    // see `token::Burn.to`
    #[account(mut)]
    pub user_token: Account<'info, TokenAccount>,

    // The authority allowed to mutate the above ⬆️
    pub user: Signer<'info>,

        // SPL Token Program
    pub token_program: Program<'info, Token>,

}
