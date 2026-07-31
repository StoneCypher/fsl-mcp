import { startServer } from './server.js';

const handle = startServer();

process.on('SIGINT',  () => { void handle.close(); });
process.on('SIGTERM', () => { void handle.close(); });
