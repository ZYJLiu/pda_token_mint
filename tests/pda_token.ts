import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
// import { PdaToken } from "../target/types/pda_token";

import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getMint,
  getOrCreateAssociatedTokenAccount,
  createAssociatedTokenAccount,
  getAccount,
} from "@solana/spl-token";

const { assert, expect } = require("chai");

let merchant: Keypair;
let merchant2: Keypair;
let mint: PublicKey;
let mint_bump: Number;
let mint2: PublicKey;
let mint_bump2: Number;

describe("pda_token", () => {
  const provider = anchor.Provider.local();
  anchor.setProvider(anchor.Provider.env());
  const connection = anchor.getProvider().connection;
  const program = anchor.workspace.PdaToken as Program<PdaToken>;
  const userWallet = anchor.workspace.PdaToken.provider.wallet;

  it("Can create a token account from seeds pda", async () => {
    merchant = Keypair.generate();

    [mint, mint_bump] = await PublicKey.findProgramAddress(
      [merchant.publicKey.toBuffer()],
      program.programId
    );

    console.log(mint.toString());
    console.log(mint_bump.toString());

    try {
      await program.rpc.createMint("test", {
        accounts: {
          merchant: merchant.publicKey,
          mintPda: mint,
          user: userWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
        signers: [merchant],
      });

      // get Token Mint Address
      const mintAddress = await getMint(connection, mint);
      console.log("Mint Authority:", mintAddress.mintAuthority.toString());
      console.log("Mint Address:", mint.toString());

      assert.isTrue(mintAddress.mintAuthority.equals(mint));
    } catch (error) {
      console.log(error);
    }

    merchant2 = Keypair.generate();

    [mint2, mint_bump2] = await PublicKey.findProgramAddress(
      [merchant2.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.rpc.createMint("test2", {
        accounts: {
          merchant: merchant2.publicKey,
          mintPda: mint2,
          user: userWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
        signers: [merchant2],
      });

      // get Token Mint Address
      const mintAddress2 = await getMint(connection, mint2);
      console.log("Mint Authority:", mintAddress2.mintAuthority.toString());
      console.log("Mint Address:", mint2.toString());

      assert.isTrue(mintAddress2.mintAuthority.equals(mint2));
    } catch (error) {
      console.log(error);
    }

    let merchantAccount = await program.account.merchant.fetch(
      merchant.publicKey
    );

    let merchantAccount2 = await program.account.merchant.fetch(
      merchant2.publicKey
    );

    console.log("Merchant Mint:", merchantAccount.mint.toString());
    console.log("Merchant2 Mint:", merchantAccount2.mint.toString());
  });

  it("Mint Tokens", async () => {
    const Wallet = Keypair.generate();
    const AirdropSignature = await connection.requestAirdrop(
      Wallet.publicKey,
      LAMPORTS_PER_SOL
    );

    await connection.confirmTransaction(AirdropSignature);

    // Get the token account of the fromWallet address, and if it does not exist, create it
    const TokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      Wallet,
      mint,
      Wallet.publicKey
    );

    const data = await program.account.merchant.fetch(merchant.publicKey);
    // console.log(data);

    try {
      await program.rpc.mintTo(new anchor.BN(5_000_000), {
        accounts: {
          merchant: merchant.publicKey,
          mintPda: mint,
          userToken: TokenAccount.address,
          user: provider.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
      });
    } catch (error) {
      console.log(error);
    }

    const balance = (
      await connection.getTokenAccountBalance(TokenAccount.address)
    ).value.amount;

    // assert.equal(balance, 5000);
    console.log("Token Balance:", balance);
  });

  it("Mint2 Tokens", async () => {
    const Wallet = Keypair.generate();
    const AirdropSignature = await connection.requestAirdrop(
      Wallet.publicKey,
      LAMPORTS_PER_SOL
    );

    await connection.confirmTransaction(AirdropSignature);

    // Get the token account of the fromWallet address, and if it does not exist, create it
    const TokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      Wallet,
      mint2,
      Wallet.publicKey
    );

    try {
      await program.rpc.mintTo(new anchor.BN(3_000_000), {
        accounts: {
          merchant: merchant2.publicKey,
          mintPda: mint2,
          userToken: TokenAccount.address,
          user: provider.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
      });
    } catch (error) {
      console.log(error);
    }

    const balance = (
      await connection.getTokenAccountBalance(TokenAccount.address)
    ).value.amount;

    // assert.equal(balance, 5000);
    console.log("Token2 Balance:", balance);
  });

  it("Burn", async () => {
    const Wallet = Keypair.generate();
    const AirdropSignature = await connection.requestAirdrop(
      Wallet.publicKey,
      LAMPORTS_PER_SOL
    );

    await connection.confirmTransaction(AirdropSignature);

    // Get the token account of the fromWallet address, and if it does not exist, create it
    const TokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      Wallet,
      mint,
      Wallet.publicKey
    );

    try {
      await program.rpc.mintTo(new anchor.BN(5_000_000), {
        accounts: {
          merchant: merchant.publicKey,
          mintPda: mint,
          userToken: TokenAccount.address,
          user: provider.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
      });
    } catch (error) {
      console.log(error);
    }

    try {
      await program.rpc.burn(new anchor.BN(3_000_000), {
        accounts: {
          mintPda: mint,
          userToken: TokenAccount.address,
          user: Wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
        signers: [Wallet],
      });
    } catch (error) {
      console.log(error);
    }

    const balance = (
      await connection.getTokenAccountBalance(TokenAccount.address)
    ).value.amount;

    // assert.equal(balance, 5000);
    console.log("Token Balance:", balance);
  });
});
