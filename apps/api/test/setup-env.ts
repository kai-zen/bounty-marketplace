/**
 * e2e imports `AppModule`, which validates env before the suite runs.
 * These values match `apps/api/.env.example` and are not a live dependency.
 */
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/bounty-marketplace';
process.env.PORT = '3001';
process.env.RPC_URL = 'http://127.0.0.1:8545';
process.env.CHAIN_ID = '31337';
process.env.FACTORY_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
process.env.REGISTRY_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
process.env.INDEXER_START_BLOCK = '0';
