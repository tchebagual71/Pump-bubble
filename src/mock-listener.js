export class MockSolanaListener {
  constructor(connection) {
    this.connection = connection;
    this.walletDeltas = new Map();
    this.isRunning = false;
    this.broadcastCallback = null;
    this.mockInterval = null;
  }

  start(broadcastCallback) {
    if (this.isRunning) {
      console.log('Mock listener already running');
      return;
    }

    this.broadcastCallback = broadcastCallback;
    this.isRunning = true;

    console.log('Starting mock Solana listener...');
    
    // Generate mock data every 5 seconds
    this.mockInterval = setInterval(() => {
      this.generateMockTransaction();
    }, 5000);
  }

  stop() {
    if (!this.isRunning) return;

    console.log('Stopping mock Solana listener...');
    this.isRunning = false;

    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }

  generateMockTransaction() {
    // Generate random wallet addresses and deltas
    const wallets = [
      '7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi',
      'BgbNWG4VVGp9wAhQpZLhSQyLhBrFnBaD7oLKYhGnMQFK',
      '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E',
      'CKqGnhCGLZJr2VJnN7iMMHHMNcj7QKjPo8n4CZp3DG54',
      'DjVE6JNiYqPL2QXyCUUh8rNjHrbz637CU9oGZPy6Q46H'
    ];

    const wallet = wallets[Math.floor(Math.random() * wallets.length)];
    const delta = (Math.random() - 0.5) * 1000; // Random delta between -500 and +500
    
    this.updateWalletDelta(wallet, delta);
    
    const data = {
      wallet: wallet,
      delta: Math.round(delta * 1000000) / 1000000, // Round to 6 decimals
      total: this.walletDeltas.get(wallet) || 0,
      signature: this.generateMockSignature(),
      timestamp: new Date().toISOString()
    };

    if (this.broadcastCallback) {
      this.broadcastCallback(data);
    }
  }

  generateMockSignature() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 88; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  updateWalletDelta(wallet, delta) {
    const currentTotal = this.walletDeltas.get(wallet) || 0;
    const newTotal = currentTotal + delta;
    this.walletDeltas.set(wallet, Math.round(newTotal * 1000000) / 1000000);
  }

  getWalletTotals() {
    return Object.fromEntries(this.walletDeltas);
  }

  getWalletTotal(wallet) {
    return this.walletDeltas.get(wallet) || 0;
  }
}