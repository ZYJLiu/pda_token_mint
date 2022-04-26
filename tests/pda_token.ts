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
} from "@solana/spl-token";

const { assert, expect } = require("chai");

describe("pda_token", () => {
  const provider = anchor.Provider.local();
  anchor.setProvider(anchor.Provider.env());
  const connection = anchor.getProvider().connection;
  const program = anchor.workspace.PdaToken as Program<PdaToken>;
  const userWallet = anchor.workspace.PdaToken.provider.wallet;

  it("Can create a token account from seeds pda", async () => {
    const [mint, mint_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("my-mint-seed"))],
      program.programId
    );

    try {
      await program.rpc.createMint({
        accounts: {
          mintPda: mint,
          user: userWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
      });

      // get Token Mint Address
      const mintAddress = await getMint(connection, mint);
      console.log("Mint Authority:", mintAddress.mintAuthority.toString());
      console.log("Mint Address:", mint.toString());

      assert.isTrue(mintAddress.mintAuthority.equals(mint));
    } catch (error) {
      console.log(error);
    }
  });

  it("Mint Tokens", async () => {
    const Wallet = Keypair.generate();
    const AirdropSignature = await connection.requestAirdrop(
      Wallet.publicKey,
      LAMPORTS_PER_SOL
    );

    await connection.confirmTransaction(AirdropSignature);

    const [mintPDA, mint_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("my-mint-seed"))],
      program.programId
    );

    // Get the token account of the fromWallet address, and if it does not exist, create it
    const TokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      Wallet,
      mintPDA,
      Wallet.publicKey
    );

    try {
      await program.rpc.mintTo(mint_bump, new anchor.BN(5_000), {
        accounts: {
          mintPda: mintPDA,
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

    assert.equal(balance, 5000);
    console.log("Token Balance:", balance);
  });
});
