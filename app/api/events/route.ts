import { NextRequest } from 'next/server';

interface DexscreenerTrade {
  block_number: number;
  block_timestamp: string;
  tx_hash: string;
  token_address: string;
  maker: string;
  taker: string;
  amount0In: string;
  amount1In: string;
  amount0Out: string;
  amount1Out: string;
  priceUsd?: number;
}

interface WalletData {
  wallet: string;
  delta: number;
  total: number;
}

// Store wallet data in memory
const walletTotals = new Map<string, number>();

async function fetchDexscreenerData(pairOrMint: string): Promise<DexscreenerTrade[]> {
  try {
    // Mock data for demonstration - in production, this would call actual Dexscreener API
    // The real API would be something like: https://api.dexscreener.com/latest/dex/pairs/solana/${pairOrMint}
    const mockTrades: DexscreenerTrade[] = [
      {
        block_number: Math.floor(Math.random() * 1000000),
        block_timestamp: new Date().toISOString(),
        tx_hash: `0x${Math.random().toString(16).substr(2, 8)}`,
        token_address: pairOrMint,
        maker: `0x${Math.random().toString(16).substr(2, 8)}`,
        taker: `0x${Math.random().toString(16).substr(2, 8)}`,
        amount0In: (Math.random() * 1000).toString(),
        amount1In: '0',
        amount0Out: '0',
        amount1Out: (Math.random() * 1000000).toString(),
        priceUsd: Math.random() * 100
      },
      {
        block_number: Math.floor(Math.random() * 1000000),
        block_timestamp: new Date().toISOString(),
        tx_hash: `0x${Math.random().toString(16).substr(2, 8)}`,
        token_address: pairOrMint,
        maker: `0x${Math.random().toString(16).substr(2, 8)}`,
        taker: `0x${Math.random().toString(16).substr(2, 8)}`,
        amount0In: (Math.random() * 500).toString(),
        amount1In: '0',
        amount0Out: '0',
        amount1Out: (Math.random() * 500000).toString(),
        priceUsd: Math.random() * 50
      }
    ];
    
    return mockTrades;
  } catch (error) {
    console.error('Error fetching Dexscreener data:', error);
    return [];
  }
}

function aggregateBuys(trades: DexscreenerTrade[]): WalletData[] {
  const deltas = new Map<string, number>();
  
  trades.forEach(trade => {
    // Consider it a buy if amount0In > 0 (buying with SOL/base token)
    if (parseFloat(trade.amount0In) > 0) {
      const wallet = trade.taker;
      const delta = parseFloat(trade.amount0In) * (trade.priceUsd || 1);
      
      deltas.set(wallet, (deltas.get(wallet) || 0) + delta);
      walletTotals.set(wallet, (walletTotals.get(wallet) || 0) + delta);
    }
  });
  
  return Array.from(deltas.entries()).map(([wallet, delta]) => ({
    wallet,
    delta,
    total: walletTotals.get(wallet) || 0
  }));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pairOrMint = searchParams.get('pair') || searchParams.get('mint') || 'default';
  
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      const sendData = async () => {
        try {
          const trades = await fetchDexscreenerData(pairOrMint);
          const walletData = aggregateBuys(trades);
          
          if (walletData.length > 0) {
            const data = `data: ${JSON.stringify(walletData)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        } catch (error) {
          console.error('Error in SSE:', error);
        }
      };
      
      // Send initial data
      sendData();
      
      // Set up interval to poll every 2.5 seconds
      const interval = setInterval(sendData, 2500);
      
      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}