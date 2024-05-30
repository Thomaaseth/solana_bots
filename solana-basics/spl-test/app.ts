import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import { 
    getOrCreateAssociatedTokenAccount, 
    getMinimumBalanceForRentExemptMint, 
    getAssociatedTokenAddressSync, 
    MINT_SIZE, TOKEN_PROGRAM_ID, 
    createInitializeMintInstruction, 
    createMintToInstruction, 
    createAssociatedTokenAccountIdempotentInstruction, 
    transfer,
    burnChecked 
} from "@solana/spl-token";


const secret = [16,37,1,45,14,218,93,129,46,206,238,140,7,100,32,138,61,11,239,93,202,226,80,36,114,63,141,206,87,122,253,30,62,31,91,68,234,231,31,155,98,106,91,162,170,189,81,169,129,158,108,159,22,189,242,150,98,152,125,206,118,60,77,219]
const tokenAuthority = Keypair.fromSecretKey(new Uint8Array(secret));
const receiver = Keypair.generate();

const quickNodeEndpoint = 'https://green-quick-tree.solana-devnet.quiknode.pro/545afd9bcbee71ca90c72a225dcf48d771670072/'
const connection = new Connection(quickNodeEndpoint);

async function createNewToken(authority: Keypair, connection: Connection, numDecimals: number) {
    // create account
    const requiredBalance = await getMinimumBalanceForRentExemptMint(connection);
    const mintKeypair = Keypair.generate();
    const ix1 = SystemProgram.createAccount({
        fromPubkey: authority.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports: requiredBalance,
        programId: TOKEN_PROGRAM_ID,
    });
    // Set Mint instructions
    const ix2 = createInitializeMintInstruction(
        mintKeypair.publicKey,
        numDecimals,
        authority.publicKey,
        authority.publicKey
    );
    // Create and send tx
    const createNewTokenTransaction = new Transaction().add(ix1, ix2);
    const initSignature = await sendAndConfirmTransaction(connection, createNewTokenTransaction, [tokenAuthority, mintKeypair]);
    return { initSignature, mint: mintKeypair.publicKey}

}

async function mintTokens(mint: PublicKey, authority: Keypair, connection: Connection, numTokens: number) {
    // Create new token account
    const tokenATA = getAssociatedTokenAddressSync(mint, authority.publicKey);
    const ix1 = createAssociatedTokenAccountIdempotentInstruction(
        authority.publicKey,
        tokenATA,
        authority.publicKey,
        mint
    );
    // Mint tokens to new account
    const ix2 = createMintToInstruction(
        mint,
        tokenATA,
        authority.publicKey,
        numTokens
    );
    // Transaction
    const mintTokensTransaction = new Transaction().add(ix1, ix2);
    const mintSignature = await sendAndConfirmTransaction(connection, mintTokensTransaction, [tokenAuthority], { skipPreflight: true });
    return { mintSignature }
}

async function transferTokens(mint: PublicKey, authority: Keypair, destination: PublicKey, connection: Connection, numTokens: number) {
        const destinationAta = await getOrCreateAssociatedTokenAccount(connection, authority, mint, destination, undefined, undefined, { skipPreflight: true });
        const sourceAta = await getOrCreateAssociatedTokenAccount(connection, authority, mint, authority.publicKey, undefined, undefined, { skipPreflight: true });
        const transferSignature = await transfer(connection, authority, sourceAta.address, destinationAta.address, authority, numTokens)
        return { transferSignature };
}


async function burnTokens(mint: PublicKey, authority: Keypair, connection: Connection, numberTokens: number, decimals: number) {
    const ata = await getOrCreateAssociatedTokenAccount(connection, authority, mint, authority.publicKey, undefined, undefined, { skipPreflight: true });
    const burnSignature = await burnChecked(
        connection,
        authority,
        ata.address,
        mint,
        authority.publicKey,
        numberTokens,
        decimals,
        undefined,
        { skipPreflight: true }
    );
    return { burnSignature };
}

async function main() {
    const { initSignature, mint } = await createNewToken(tokenAuthority, connection, 0);
    console.log(`Init Token Tx: https://explorer.solana.com/tx/${initSignature}?cluster=devnet`);
    console.log(`Mint ID: ${mint.toBase58()}`);
    const { mintSignature } = await mintTokens(mint, tokenAuthority, connection, 1000000000);
    console.log(`Mint Tokens Tx: https://explorer.solana.com/tx/${mintSignature}?cluster=devnet`);
    const { transferSignature } = await transferTokens(mint, tokenAuthority, receiver.publicKey, connection, 1000000);
    console.log(`Transfer Tokens Tx: https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
    const { burnSignature } = await burnTokens(mint, tokenAuthority, connection, 1, 0);
    console.log(`Burn Tokens Tx: https://explorer.solana.com/tx/${burnSignature}?cluster=devnet`);
}

main()
    .then(() => process.exit())
    .catch((err) => {
        console.error(err);
        process.exit(-1);
    });