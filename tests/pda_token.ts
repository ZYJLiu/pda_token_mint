import * as anchor from "@project-serum/anchor";
import { Program, BN } from "@project-serum/anchor";
import { PdaToken } from "../target/types/pda_token";

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
  createMint,
  mintTo,
  Account,
  transfer,
} from "@solana/spl-token";

import fs from "fs";

const { assert, expect } = require("chai");

const initialAmount = 100;

let tokenAuthority: Keypair;

let usdcMint: PublicKey;
let usdcTokenAccount: Account;
let junMint: PublicKey;
let junTokenAccount: Account;

let usdcPDA: PublicKey;
let usdcBump: Number;
let junPDA: PublicKey;
let junBump: Number;

let diam: Keypair;
let diamMint: PublicKey;
let diamBump: Number;

let merchant: Keypair;
let merchantMint: PublicKey;
let merchantBump: Number;

describe("pda_token", () => {
  const provider = anchor.Provider.local();
  anchor.setProvider(anchor.Provider.env());
  const connection = anchor.getProvider().connection;
  const program = anchor.workspace.PdaToken as Program<PdaToken>;
  const userWallet = anchor.workspace.PdaToken.provider.wallet;

  const randomPayer = async (lamports = LAMPORTS_PER_SOL) => {
    const wallet = Keypair.generate();
    const signature = await connection.requestAirdrop(
      wallet.publicKey,
      lamports
    );
    await connection.confirmTransaction(signature);
    return wallet;
  };

  before(async () => {
    tokenAuthority = Keypair.generate();
    const signature = await connection.requestAirdrop(
      tokenAuthority.publicKey,
      LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(signature);

    usdcMint = await createMint(
      connection, //connection to Solana
      await randomPayer(), //user randomPayer helper to create accounts for test
      tokenAuthority.publicKey, // mint authority
      null, // freeze authority (you can use `null` to disable it. when you disable it, you can't turn it on again)
      2, // decimals
      usdcMintKeypair
    );

    usdcTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection, // connection to Solana
      await randomPayer(), // randomPayer for testing
      usdcMint, // Token Mint
      tokenAuthority.publicKey // user with Authority over this Token Account
    );

    await mintTo(
      connection, // connection to Solana
      await randomPayer(), // randomPayer as payer for test
      usdcMint, // USDC Token Mint
      usdcTokenAccount.address, // User USDC Token Account (destination)
      tokenAuthority, // Mint Authority (required as signer)
      initialAmount
    );

    // check tokens minted to Token Account
    const usdcAccount = await getAccount(connection, usdcTokenAccount.address);
    console.log("USDC Mint:", usdcMint.toString());
    console.log("setup USDC Token Account:", Number(usdcAccount.amount));

    junMint = await createMint(
      connection, //connection to Solana
      await randomPayer(), //user randomPayer helper to create accounts for test
      tokenAuthority.publicKey, // mint authority
      null, // freeze authority (you can use `null` to disable it. when you disable it, you can't turn it on again)
      2, // decimals
      junMintKeypair
    );

    junTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection, // connection to Solana
      await randomPayer(), // randomPayer for testing
      junMint, // Token Mint
      tokenAuthority.publicKey // user with Authority over this Token Account
    );

    await mintTo(
      connection, // connection to Solana
      await randomPayer(), // randomPayer as payer for test
      junMint, // USDC Token Mint
      junTokenAccount.address, // User USDC Token Account (destination)
      tokenAuthority, // Mint Authority (required as signer)
      initialAmount
    );

    // check tokens minted to Token Account
    const junAccount = await getAccount(connection, junTokenAccount.address);
    console.log("JUN Mint:", junMint.toString());
    console.log("setup JUN Token Account:", Number(junAccount.amount));
    console.log("");
  });

  it("Create usdcPDA Token Account", async () => {
    [usdcPDA, usdcBump] = await PublicKey.findProgramAddress(
      [usdcMintAddress.toBuffer()],
      program.programId
    );

    try {
      await program.rpc.createTokenAccount({
        accounts: {
          tokenAccount: usdcPDA,
          mint: usdcMint,
          payer: userWallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        },
      });
    } catch (error) {
      console.log(error);
    }

    const Account = await getAccount(connection, usdcPDA);
    console.log("usdcPDA Token Account:", usdcPDA.toString());
    console.log("usdcPDA Balance:", Number(Account.amount));
  });

  it("Create and fund junPDA Token Account", async () => {
    [junPDA, junBump] = await PublicKey.findProgramAddress(
      [junMintAddress.toBuffer()],
      program.programId
    );

    try {
      await program.rpc.createTokenAccount({
        accounts: {
          tokenAccount: junPDA,
          mint: junMint,
          payer: userWallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        },
      });
    } catch (error) {
      console.log(error);
    }

    await transfer(
      connection,
      tokenAuthority,
      junTokenAccount.address,
      junPDA,
      tokenAuthority.publicKey,
      initialAmount
    );

    const Account = await getAccount(connection, junPDA);
    console.log("junPDA Token Account:", junPDA.toString());
    console.log("junPDA Balance:", Number(Account.amount));
  });

  it("Create Diam Mint", async () => {
    diam = diamKeypair;

    [diamMint, diamBump] = await PublicKey.findProgramAddress(
      [diamAddress.toBuffer()],
      program.programId
    );

    try {
      await program.rpc.createMint("diam", {
        accounts: {
          merchant: diam.publicKey,
          mintPda: diamMint,
          user: userWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
        signers: [diamKeypair],
      });

      // get Token Mint Address
      const diamAddress = await getMint(connection, diamMint);
      console.log("DIAM Authority:", diamAddress.mintAuthority.toString());
      console.log("DIAM Address:", diamMint.toString());

      assert.isTrue(diamAddress.mintAuthority.equals(diamMint));
    } catch (error) {
      console.log(error);
    }

    let merchantAccount2 = await program.account.merchant.fetch(diam.publicKey);

    console.log("DIAM Mint:", merchantAccount2.mint.toString());
  });

  it("Create Merchant Mint", async () => {
    merchant = Keypair.generate();

    [merchantMint, merchantBump] = await PublicKey.findProgramAddress(
      [merchant.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.rpc.createMint("merchant", {
        accounts: {
          merchant: merchant.publicKey,
          mintPda: merchantMint,
          user: userWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
        signers: [merchant],
      });

      // get Token Mint Address
      const mintAddress = await getMint(connection, merchantMint);
      console.log("Mint Authority:", mintAddress.mintAuthority.toString());
      console.log("Mint Address:", merchantMint.toString());

      assert.isTrue(mintAddress.mintAuthority.equals(merchantMint));
    } catch (error) {
      console.log(error);
    }

    let merchantAccount = await program.account.merchant.fetch(
      merchant.publicKey
    );

    console.log("Merchant Mint:", merchantAccount.mint.toString());
  });

  // it("Mint DIAM Tokens", async () => {
  //   // Get the token account of the fromWallet address, and if it does not exist, create it
  //   const TokenAccount = await getOrCreateAssociatedTokenAccount(
  //     connection,
  //     await randomPayer(),
  //     diamMint,
  //     provider.wallet.publicKey
  //   );

  //   const usdcTokenAccount = await getOrCreateAssociatedTokenAccount(
  //     connection,
  //     await randomPayer(),
  //     usdcMint,
  //     provider.wallet.publicKey
  //   );

  //   await mintTo(
  //     connection, // connection to Solana
  //     await randomPayer(), // randomPayer as payer for test
  //     usdcMint, // USDC Token Mint
  //     usdcTokenAccount.address, // User USDC Token Account (destination)
  //     tokenAuthority, // Mint Authority (required as signer)
  //     initialAmount
  //   );

  //   const data = await program.account.merchant.fetch(diam.publicKey);
  //   console.log(data);

  //   try {
  //     await program.rpc.mintTo(new anchor.BN(initialAmount), {
  //       accounts: {
  //         merchant: diam.publicKey,
  //         mintPda: diamMint,
  //         userToken: TokenAccount.address,
  //         userUsdcToken: usdcTokenAccount.address,
  //         user: provider.wallet.publicKey,
  //         programUsdcToken: usdcPDA,
  //         tokenProgram: TOKEN_PROGRAM_ID,
  //       },
  //     });
  //   } catch (error) {
  //     console.log(error);
  //   }

  //   const balance = (
  //     await connection.getTokenAccountBalance(TokenAccount.address)
  //   ).value.amount;

  //   const balance2 = (await connection.getTokenAccountBalance(usdcPDA)).value
  //     .amount;

  //   const balance3 = (
  //     await connection.getTokenAccountBalance(usdcTokenAccount.address)
  //   ).value.amount;

  //   console.log("userDIAM Balance:", balance);
  //   console.log("usdcPDA Balance:", balance2);
  //   console.log("userUSDC Balance:", balance3);

  //   assert.equal(balance, initialAmount);
  // });

  // it("Mint Merchant Tokens", async () => {
  //   // Get the token account of the fromWallet address, and if it does not exist, create it
  //   const TokenAccount = await getOrCreateAssociatedTokenAccount(
  //     connection,
  //     await randomPayer(),
  //     merchantMint,
  //     provider.wallet.publicKey
  //   );

  //   const usdcTokenAccount = await getOrCreateAssociatedTokenAccount(
  //     connection,
  //     await randomPayer(),
  //     usdcMint,
  //     provider.wallet.publicKey
  //   );

  //   await mintTo(
  //     connection, // connection to Solana
  //     await randomPayer(), // randomPayer as payer for test
  //     usdcMint, // USDC Token Mint
  //     usdcTokenAccount.address, // User USDC Token Account (destination)
  //     tokenAuthority, // Mint Authority (required as signer)
  //     initialAmount
  //   );

  //   const data = await program.account.merchant.fetch(merchant.publicKey);
  //   console.log(data);

  //   try {
  //     await program.rpc.mintTo(new anchor.BN(initialAmount), {
  //       accounts: {
  //         merchant: merchant.publicKey,
  //         mintPda: merchantMint,
  //         userToken: TokenAccount.address,
  //         userUsdcToken: usdcTokenAccount.address,
  //         user: provider.wallet.publicKey,
  //         programUsdcToken: usdcPDA,
  //         tokenProgram: TOKEN_PROGRAM_ID,
  //       },
  //     });
  //   } catch (error) {
  //     console.log(error);
  //   }

  //   const balance = (
  //     await connection.getTokenAccountBalance(TokenAccount.address)
  //   ).value.amount;

  //   const balance2 = (await connection.getTokenAccountBalance(usdcPDA)).value
  //     .amount;

  //   const balance3 = (
  //     await connection.getTokenAccountBalance(usdcTokenAccount.address)
  //   ).value.amount;

  //   console.log("userMerchant Balance:", balance);
  //   console.log("usdcPDA Balance:", balance2);
  //   console.log("userUSDC Balance:", balance3);

  //   assert.equal(balance, initialAmount);
  // });

  // it("Burn", async () => {
  //   const Wallet = Keypair.generate();
  //   const AirdropSignature = await connection.requestAirdrop(
  //     Wallet.publicKey,
  //     LAMPORTS_PER_SOL
  //   );

  //   await connection.confirmTransaction(AirdropSignature);

  //   // Get the token account of the fromWallet address, and if it does not exist, create it
  //   // Get the token account of the fromWallet address, and if it does not exist, create it
  //   const TokenAccount = await getOrCreateAssociatedTokenAccount(
  //     connection,
  //     await randomPayer(),
  //     merchantMint,
  //     Wallet.publicKey
  //   );

  //   const usdcTokenAccount = await getOrCreateAssociatedTokenAccount(
  //     connection,
  //     await randomPayer(),
  //     usdcMint,
  //     Wallet.publicKey
  //   );

  //   await mintTo(
  //     connection, // connection to Solana
  //     await randomPayer(), // randomPayer as payer for test
  //     usdcMint, // USDC Token Mint
  //     usdcTokenAccount.address, // User USDC Token Account (destination)
  //     tokenAuthority, // Mint Authority (required as signer)
  //     initialAmount
  //   );

  //   const junTokenAccount = await getOrCreateAssociatedTokenAccount(
  //     connection,
  //     await randomPayer(),
  //     junMint,
  //     Wallet.publicKey
  //   );

  //   try {
  //     await program.rpc.mintTo(new anchor.BN(initialAmount), {
  //       accounts: {
  //         merchant: merchant.publicKey,
  //         mintPda: merchantMint,
  //         userToken: TokenAccount.address,
  //         userUsdcToken: usdcTokenAccount.address,
  //         user: Wallet.publicKey,
  //         programUsdcToken: usdcPDA,
  //         tokenProgram: TOKEN_PROGRAM_ID,
  //       },
  //       signers: [Wallet],
  //     });
  //   } catch (error) {
  //     console.log(error);
  //   }

  //   const balance = (
  //     await connection.getTokenAccountBalance(TokenAccount.address)
  //   ).value.amount;
  //   console.log("Before Burn Token Balance:", balance);

  //   const Merchant = Keypair.generate();

  //   const merchantUsdcTokenAccount = await getOrCreateAssociatedTokenAccount(
  //     connection,
  //     await randomPayer(),
  //     usdcMint,
  //     Merchant.publicKey
  //   );

  //   try {
  //     await program.rpc.burn(new anchor.BN(initialAmount / 2), {
  //       accounts: {
  //         mintPda: merchantMint,
  //         userToken: TokenAccount.address,
  //         user: Wallet.publicKey,

  //         programUsdcToken: usdcPDA,
  //         usdcMint: usdcMintAddress,
  //         userUsdcToken: merchantUsdcTokenAccount.address,

  //         programJunToken: junPDA,
  //         junMint: junMintAddress,
  //         userJunToken: junTokenAccount.address,

  //         tokenProgram: TOKEN_PROGRAM_ID,
  //       },
  //       signers: [Wallet],
  //     });
  //   } catch (error) {
  //     console.log(error);
  //   }

  //   const balance2 = (
  //     await connection.getTokenAccountBalance(TokenAccount.address)
  //   ).value.amount;

  //   const balance3 = (
  //     await connection.getTokenAccountBalance(junTokenAccount.address)
  //   ).value.amount;

  //   // assert.equal(balance2, initialAmount / 2);

  //   console.log("After Burn Token Balance:", balance2);
  //   console.log("Jun Token Balance:", balance3);
  // });

  it("Burn DIAM", async () => {
    const Wallet = Keypair.generate();
    const AirdropSignature = await connection.requestAirdrop(
      Wallet.publicKey,
      LAMPORTS_PER_SOL
    );

    await connection.confirmTransaction(AirdropSignature);

    // Get the token account of the fromWallet address, and if it does not exist, create it
    // Get the token account of the fromWallet address, and if it does not exist, create it
    const TokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      await randomPayer(),
      diamMint,
      Wallet.publicKey
    );

    const usdcTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      await randomPayer(),
      usdcMint,
      Wallet.publicKey
    );

    await mintTo(
      connection, // connection to Solana
      await randomPayer(), // randomPayer as payer for test
      usdcMint, // USDC Token Mint
      usdcTokenAccount.address, // User USDC Token Account (destination)
      tokenAuthority, // Mint Authority (required as signer)
      initialAmount
    );

    const junTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      await randomPayer(),
      junMint,
      Wallet.publicKey
    );

    const merchantTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      await randomPayer(),
      merchantMint,
      Wallet.publicKey
    );

    try {
      await program.rpc.mintTo(new anchor.BN(initialAmount), {
        accounts: {
          merchant: diam.publicKey,
          mintPda: diamMint,
          userToken: TokenAccount.address,
          userUsdcToken: usdcTokenAccount.address,
          user: Wallet.publicKey,
          programUsdcToken: usdcPDA,
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
    console.log("Before Burn DIAM Token Balance:", balance);

    const Merchant = Keypair.generate();

    const merchantUsdcTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      await randomPayer(),
      usdcMint,
      Merchant.publicKey
    );

    try {
      await program.rpc.burnDiam(new anchor.BN(initialAmount), {
        accounts: {
          diamPda: diamMint,
          userDiamToken: TokenAccount.address,
          user: Wallet.publicKey,

          programUsdcToken: usdcPDA,
          usdcMint: usdcMintAddress,
          merchantUsdcToken: merchantUsdcTokenAccount.address,

          programJunToken: junPDA,
          junMint: junMintAddress,
          userJunToken: junTokenAccount.address,

          merchant: merchant.publicKey,
          merchantPda: merchantMint,
          userMerchantToken: merchantTokenAccount.address,

          tokenProgram: TOKEN_PROGRAM_ID,
        },
        signers: [Wallet],
      });
    } catch (error) {
      console.log(error);
    }

    const balance2 = (
      await connection.getTokenAccountBalance(TokenAccount.address)
    ).value.amount;

    const balance3 = (
      await connection.getTokenAccountBalance(junTokenAccount.address)
    ).value.amount;

    const balance4 = (
      await connection.getTokenAccountBalance(merchantTokenAccount.address)
    ).value.amount;

    const balance5 = (
      await connection.getTokenAccountBalance(merchantUsdcTokenAccount.address)
    ).value.amount;

    const balance6 = (await connection.getTokenAccountBalance(usdcPDA)).value
      .amount;

    // assert.equal(balance2, initialAmount / 2);

    console.log("After Burn DIAM Token Balance:", balance2);
    console.log("User Jun Token Balance:", balance3);
    console.log("User Merchant Token Balance:", balance4);
    console.log("Merchant USDC Token Balance:", balance5);
    console.log("Program USDC Token Balance:", balance6);
  });
});

// @ts-ignore
const usdcData = JSON.parse(fs.readFileSync(".keys/usdc_mint.json"));
const usdcMintKeypair = Keypair.fromSecretKey(new Uint8Array(usdcData));
const usdcMintAddress = usdcMintKeypair.publicKey;
console.log("USDC Mint:", usdcMintAddress.toString());

// @ts-ignore
const junData = JSON.parse(fs.readFileSync(".keys/jun_mint.json"));
const junMintKeypair = Keypair.fromSecretKey(new Uint8Array(junData));
const junMintAddress = junMintKeypair.publicKey;
console.log("JUN Mint:", junMintAddress.toString());

// @ts-ignore
const diamData = JSON.parse(fs.readFileSync(".keys/diam.json"));
const diamKeypair = Keypair.fromSecretKey(new Uint8Array(diamData));
const diamAddress = diamKeypair.publicKey;
console.log("DIAM Merchant:", diamAddress.toString());
