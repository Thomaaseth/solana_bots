import { Connection, 
    PublicKey, 
    LAMPORTS_PER_SOL,
    Transaction,
    SystemProgram,
    TransactionInstruction,
    Keypair,
    sendAndConfirmTransaction
} from "@solana/web3.js";


const quickNodeEndpoint = 'https://green-quick-tree.solana-devnet.quiknode.pro/545afd9bcbee71ca90c72a225dcf48d771670072/'
const connection = new Connection(quickNodeEndpoint);
const myAddress = "5BW1XhjrXPYMFcrSMyZkFyDAoPme33L1wsGgK7pd3vqQ";
const myPublicKey = new PublicKey(myAddress);

// connection.getVersion().then(version => {
//     console.log('Connection to cluster established:', quickNodeEndpoint);
//     console.log('version:', version)
// }).catch(error => console.error(error));

connection.getAccountInfo(myPublicKey).then((info) => {
    console.log('Account info:', info);
});

// console.log('Address:', myPublicKey.toBase58());

connection.getBalance(myPublicKey).then((balance) => {
    console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
});

async function sendTransaction() {
    const receiver = Keypair.generate();
    console.log(`Receiver address: ${receiver.publicKey.toBase58()}`)
    const secret = [16,37,1,45,14,218,93,129,46,206,238,140,7,100,32,138,61,11,239,93,202,226,80,36,114,63,141,206,87,122,253,30,62,31,91,68,234,231,31,155,98,106,91,162,170,189,81,169,129,158,108,159,22,189,242,150,98,152,125,206,118,60,77,219]
    const sender = Keypair.fromSecretKey(new Uint8Array(secret))

    const ix: TransactionInstruction = SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: receiver.publicKey,
        lamports: LAMPORTS_PER_SOL / 10
    })

    const transaction = new Transaction().add(ix);
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.feePayer = sender.publicKey;
    transaction.recentBlockhash = blockhash;
    transaction.sign(sender);

    const signature = await sendAndConfirmTransaction(connection, transaction, [sender])
    console.log(`Tx: https://explorer.solana.com/tx/${signature}?cluster=devnet`);



}

sendTransaction().then(() => process.exit())