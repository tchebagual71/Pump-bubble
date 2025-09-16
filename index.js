import express from 'express';
import { Connection, PublicKey } from '@solana/web3.js';
import { SolanaListener } from './src/solana-listener.js';
import { MockSolanaListener } from './src/mock-listener.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// SSE clients storage
const sseClients = new Set();

// Initialize Solana connection and listener
let listener;
const USE_MOCK = process.env.USE_MOCK === 'true' || process.env.NODE_ENV === 'test';

if (USE_MOCK) {
  console.log('Using mock Solana listener');
  listener = new MockSolanaListener(null);
} else {
  try {
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    listener = new SolanaListener(connection);
  } catch (error) {
    console.warn('Failed to initialize Solana connection, falling back to mock:', error.message);
    listener = new MockSolanaListener(null);
  }
}

// SSE endpoint
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write('data: {"type":"connected"}\n\n');

  // Add client to set
  sseClients.add(res);

  // Handle client disconnect
  req.on('close', () => {
    sseClients.delete(res);
  });

  req.on('aborted', () => {
    sseClients.delete(res);
  });
});

// Broadcast function for SSE
function broadcastToClients(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
  sseClients.forEach(client => {
    try {
      client.write(message);
    } catch (error) {
      console.error('Error writing to SSE client:', error);
      sseClients.delete(client);
    }
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API endpoint to get current wallet totals
app.get('/api/totals', (req, res) => {
  res.json(listener.getWalletTotals());
});

// Serve test HTML file
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'test.html'));
});

// Serve static files
app.use(express.static('.'));

// Start listener with broadcast callback
listener.start((data) => {
  broadcastToClients(data);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/api/events`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  listener.stop();
  process.exit(0);
});