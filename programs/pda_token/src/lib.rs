use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount,};

declare_id!("AA6w4TWeM86CJ1CzMsnxboF9d97xQLbcKXBz2vUtkQS7");



#[program]
pub mod pda_token {

     // REPLACE ADDRESS of diam mint by running solana address -k .keys/usdc_mint.json
    pub const USDC_MINT_ADDRESS: &str = "8Ncnd1gHntTjc5B1gHaDgtvgPrk6ePNxocS1mBordcGb";
    // REPLACE ADDRESS of usdc mint by running solana address -k .keys/jun_mint.json
    pub const JUN_MINT_ADDRESS: &str = "7iZnHH122PDPavHeeUtB36KZCNT1qV5R2PdyVcC6P3Zq";
    // REPLACE ADDRESS of diam mint by running solana address -k .keys/diam_mint.json
    pub const DIAM_MINT_ADDRESS: &str = "4vCNES4ohdTppYSVmAPJ8J4R8Gcae3kXa2SKXPYsx97C";

    use super::*;

    pub fn create_token_account(ctx: Context<CreateTokenAccount>) -> Result<()> {
        Ok(())
    }

    pub fn create_mint(ctx: Context<CreateMint>, name: String) -> Result<()> {

        let (pda, bump) = Pubkey::find_program_address(&[ctx.accounts.merchant.key().as_ref()], ctx.program_id);

        let merchant = &mut ctx.accounts.merchant;
        merchant.name = name;
        merchant.mint = pda;
        merchant.bump = bump;
        Ok(())
    }

    pub fn mint_to(ctx: Context<MintTo>, amount: u64) -> Result<()> {
        let merchant = ctx.accounts.merchant.key();


        let seeds = &[merchant.as_ref(), &[ctx.accounts.merchant.bump]];
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

        // transfer USDC from the User to Program
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.user_usdc_token.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.program_usdc_token.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, amount)?;


        Ok(())
    }

    pub fn burn(ctx: Context<Burn>, amount: u64,) -> Result<()> {

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Burn {
                mint: ctx.accounts.mint_pda.to_account_info(),
                from: ctx.accounts.user_token.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::burn(cpi_ctx, amount)?;

        // transfer USDC merchant.
        let (usdc_pda, usdc_bump) = Pubkey::find_program_address(&[ctx.accounts.usdc_mint.key().as_ref()], ctx.program_id);
        let usdc_mint_address = ctx.accounts.usdc_mint.key();
        let seeds = &[usdc_mint_address.as_ref(), &[usdc_bump]];
        let signer = [&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.program_usdc_token.to_account_info(),
                authority: ctx.accounts.program_usdc_token.to_account_info(),
                to: ctx.accounts.user_usdc_token.to_account_info(),
            },
            &signer,
        );

        let usdc_amount = amount; // TODO: Change the formula
        token::transfer(cpi_ctx, usdc_amount)?;

        // transfer USDC merchant.
        let (jun_pda, jun_bump) = Pubkey::find_program_address(&[ctx.accounts.jun_mint.key().as_ref()], ctx.program_id);
        let jun_mint_address = ctx.accounts.jun_mint.key();
        let seeds = &[jun_mint_address.as_ref(), &[jun_bump]];
        let signer = [&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.program_jun_token.to_account_info(),
                authority: ctx.accounts.program_jun_token.to_account_info(),
                to: ctx.accounts.user_jun_token.to_account_info(),
            },
            &signer,
        );

        let jun_amount = amount; // TODO: Change the formula
        token::transfer(cpi_ctx, jun_amount)?;

        Ok(())
    }

    pub fn burn_diam(ctx: Context<BurnDiam>, amount: u64,) -> Result<()> {

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Burn {
                mint: ctx.accounts.diam_pda.to_account_info(),
                from: ctx.accounts.user_diam_token.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::burn(cpi_ctx, amount)?;

        // transfer USDC merchant.
        let (usdc_pda, usdc_bump) = Pubkey::find_program_address(&[ctx.accounts.usdc_mint.key().as_ref()], ctx.program_id);
        let usdc_mint_address = ctx.accounts.usdc_mint.key();
        let seeds = &[usdc_mint_address.as_ref(), &[usdc_bump]];
        let signer = [&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.program_usdc_token.to_account_info(),
                authority: ctx.accounts.program_usdc_token.to_account_info(),
                to: ctx.accounts.merchant_usdc_token.to_account_info(),
            },
            &signer,
        );

        let usdc_amount = amount * 90/100; // TODO: Change the formula
        token::transfer(cpi_ctx, usdc_amount)?;

        // transfer USDC merchant.
        let (jun_pda, jun_bump) = Pubkey::find_program_address(&[ctx.accounts.jun_mint.key().as_ref()], ctx.program_id);
        let jun_mint_address = ctx.accounts.jun_mint.key();
        let seeds = &[jun_mint_address.as_ref(), &[jun_bump]];
        let signer = [&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.program_jun_token.to_account_info(),
                authority: ctx.accounts.program_jun_token.to_account_info(),
                to: ctx.accounts.user_jun_token.to_account_info(),
            },
            &signer,
        );

        let jun_amount = amount; // TODO: Change the formula
        token::transfer(cpi_ctx, jun_amount)?;

        let merchant = ctx.accounts.merchant.key();

        let seeds = &[merchant.as_ref(), &[ctx.accounts.merchant.bump]];
        let signer = [&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.merchant_pda.to_account_info(),
                to: ctx.accounts.user_merchant_token.to_account_info(),
                authority: ctx.accounts.merchant_pda.to_account_info(),
            },
            &signer,
        );

        let merchant_amount = amount * 10/100; // TODO: Change the formula
        token::mint_to(cpi_ctx, merchant_amount)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateTokenAccount<'info> {
    // 1. PDA (so pubkey) for the soon-to-be created usdc token bag for our program.
    #[account(
        init,
        payer = payer,

        // We use the token mint as a seed for the mapping -> think "HashMap[seeds+bump] = pda"
        seeds = [mint.key().as_ref() ],
        bump,

        // Token Program wants to know what kind of token this token bag is for
        token::mint = mint,

        // It's a PDA so the authority is itself!
        token::authority = token_account,
    )]
    pub token_account: Account<'info, TokenAccount>,

    // 2. USDC Mint
    // TODO: add check
    pub mint: Account<'info, Mint>,

    // 3. The rent payer
    #[account(mut)]
    pub payer: Signer<'info>,

    // 4. Needed from Anchor for the creation of an Associated Token Account
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
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

    // Mint Tokens here
    #[account(mut)]
    pub user_token: Account<'info, TokenAccount>,

    // USDC from here
    #[account(mut)]
    pub user_usdc_token: Account<'info, TokenAccount>,
    
    pub user: Signer<'info>,

    // USDC to here
    #[account(
        mut,
        // TODO: add check
        // seeds = [ usdc_mint.key().as_ref() ],
        // bump = program_usdc_bag_bump,
    )]
    pub program_usdc_token: Box<Account<'info, TokenAccount>>,

    // SPL Token Program
    pub token_program: Program<'info, Token>,
}


#[derive(Accounts)]
// #[instruction(usdc_bump: u8, jun_bump:u8)]
pub struct Burn<'info> {
    //NEED TO CHECK
    // `token::Burn.mint`
    #[account(mut)]
    pub mint_pda: Box<Account<'info, Mint>>,

    // `token::Burn.to`
    #[account(mut)]
    pub user_token: Box<Account<'info, TokenAccount>>,

    // The authority allowed to mutate the above ⬆️
    pub user: Signer<'info>,

    // see `token::Transfer.from`
    // NOTE: seed not working not sure why 
    #[account(
        mut,
        seeds = [USDC_MINT_ADDRESS.parse::<Pubkey>().unwrap().as_ref()],
        bump,
    )]
    pub program_usdc_token: Box<Account<'info, TokenAccount>>,

    //NEED TO CHECK
    //Require for the PDA above 
    #[account(
        address = USDC_MINT_ADDRESS.parse::<Pubkey>().unwrap(),
    )]
    pub usdc_mint: Box<Account<'info, Mint>>,

    // see `token::Transfer.to`
    #[account(mut)]
    pub user_usdc_token: Box<Account<'info, TokenAccount>>,

    // NOTE: seed not working not sure why 
     #[account(
        mut,
        seeds = [JUN_MINT_ADDRESS.parse::<Pubkey>().unwrap().as_ref()],
        bump,
    )]
    pub program_jun_token: Box<Account<'info, TokenAccount>>,
    
    #[account(
    mut,
    address = JUN_MINT_ADDRESS.parse::<Pubkey>().unwrap(),
    )]
    pub jun_mint: Box<Account<'info, Mint>>,
    
    #[account(mut)]
    pub user_jun_token: Box<Account<'info, TokenAccount>>,

    // SPL Token Program
    pub token_program: Program<'info, Token>,

}

#[derive(Accounts)]
// #[instruction(usdc_bump: u8, jun_bump:u8)]
pub struct BurnDiam<'info> {
    //NEED TO CHECK
    // `token::Burn.mint`
    #[account(mut)]
    pub diam_pda: Box<Account<'info, Mint>>,

    // `token::Burn.to`
    #[account(mut)]
    pub user_diam_token: Box<Account<'info, TokenAccount>>,

    // The authority allowed to mutate the above ⬆️
    pub user: Signer<'info>,

    // see `token::Transfer.from`
    // NOTE: seed not working not sure why 
    #[account(
        mut,
        seeds = [USDC_MINT_ADDRESS.parse::<Pubkey>().unwrap().as_ref()],
        bump,
    )]
    pub program_usdc_token: Box<Account<'info, TokenAccount>>,

    //NEED TO CHECK
    //Require for the PDA above 
    #[account(
        address = USDC_MINT_ADDRESS.parse::<Pubkey>().unwrap(),
    )]
    pub usdc_mint: Box<Account<'info, Mint>>,

    // see `token::Transfer.to`
    #[account(mut)]
    pub merchant_usdc_token: Box<Account<'info, TokenAccount>>,
    
    // NOTE: seed not working not sure why 
     #[account(
        mut,
        seeds = [JUN_MINT_ADDRESS.parse::<Pubkey>().unwrap().as_ref()],
        bump,
    )]
    pub program_jun_token: Box<Account<'info, TokenAccount>>,
    
    #[account(
    mut,
    address = JUN_MINT_ADDRESS.parse::<Pubkey>().unwrap(),
    )]
    pub jun_mint: Box<Account<'info, Mint>>,
    
    #[account(mut)]
    pub user_jun_token: Box<Account<'info, TokenAccount>>,

    #[account()]
    pub merchant: Account<'info, Merchant>,

    #[account(mut)]
    pub merchant_pda: Box<Account<'info, Mint>>,

    // `token::Burn.to`
    #[account(mut)]
    pub user_merchant_token: Box<Account<'info, TokenAccount>>,

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