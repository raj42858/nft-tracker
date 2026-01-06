const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// API Keys from environment variables
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY || '0d4d5542c15e4ee9b38418d47f711ef2';
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || 'FkzSXZO5qT_R9gh0oJzMG';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '9EQPW2MJG7KHVQWK8YR9V6SMPWB7YV5SS3';

const ALCHEMY_BASE = `https://eth-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;
const ETHERSCAN_BASE = 'https://api.etherscan.io/api';
const OPENSEA_BASE = 'https://api.opensea.io/api/v2';

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'NFT Tracker API running', timestamp: new Date().toISOString() });
});

// Get NFT Sales from Alchemy
app.get('/api/sales/:contract', async (req, res) => {
  try {
    const { contract } = req.params;
    const limit = req.query.limit || 100;
    
    const response = await fetch(
      `${ALCHEMY_BASE}/getNFTSales?contractAddress=${contract}&order=desc&limit=${limit}`
    );
    
    if (!response.ok) throw new Error(`Alchemy error: ${response.status}`);
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Sales error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Floor Price from Alchemy
app.get('/api/floor/:contract', async (req, res) => {
  try {
    const { contract } = req.params;
    
    const response = await fetch(
      `${ALCHEMY_BASE}/getFloorPrice?contractAddress=${contract}`
    );
    
    if (!response.ok) throw new Error(`Alchemy error: ${response.status}`);
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Floor error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get NFT Metadata from Alchemy
app.get('/api/nft/:contract/:tokenId', async (req, res) => {
  try {
    const { contract, tokenId } = req.params;
    
    const response = await fetch(
      `${ALCHEMY_BASE}/getNFTMetadata?contractAddress=${contract}&tokenId=${tokenId}`
    );
    
    if (!response.ok) throw new Error(`Alchemy error: ${response.status}`);
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('NFT metadata error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Collection from OpenSea
app.get('/api/collection/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const response = await fetch(
      `${OPENSEA_BASE}/collections/${slug}`,
      { headers: { 'X-API-KEY': OPENSEA_API_KEY, 'Accept': 'application/json' } }
    );
    
    if (!response.ok) throw new Error(`OpenSea error: ${response.status}`);
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Collection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Wallet NFT Transfers from Etherscan (for flipper detection)
app.get('/api/wallet/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    const response = await fetch(
      `${ETHERSCAN_BASE}?module=account&action=tokennfttx&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`
    );
    
    if (!response.ok) throw new Error(`Etherscan error: ${response.status}`);
    
    const data = await response.json();
    
    // Process flipper analysis
    if (data.result && Array.isArray(data.result)) {
      const transfers = data.result;
      const buys = transfers.filter(t => t.to.toLowerCase() === address.toLowerCase());
      const sells = transfers.filter(t => t.from.toLowerCase() === address.toLowerCase());
      
      let quickFlips = 0;
      let totalHoldDays = 0;
      let holdCount = 0;
      
      sells.forEach(sell => {
        const matchingBuy = buys.find(buy => 
          buy.contractAddress.toLowerCase() === sell.contractAddress.toLowerCase() &&
          buy.tokenID === sell.tokenID &&
          parseInt(buy.timeStamp) < parseInt(sell.timeStamp)
        );
        
        if (matchingBuy) {
          const holdDays = (parseInt(sell.timeStamp) - parseInt(matchingBuy.timeStamp)) / 86400;
          totalHoldDays += holdDays;
          holdCount++;
          if (holdDays <= 7) quickFlips++;
        }
      });
      
      const avgHoldDays = holdCount > 0 ? Math.round(totalHoldDays / holdCount) : 0;
      const sellRatio = buys.length > 0 ? sells.length / buys.length : 0;
      const quickFlipRatio = buys.length > 0 ? quickFlips / buys.length : 0;
      
      const flipperScore = Math.min(100, Math.round(
        (sellRatio * 25) + (quickFlipRatio * 50) + (avgHoldDays < 14 ? (14 - avgHoldDays) * 1.5 : 0)
      ));
      
      res.json({
        address,
        flipperScore,
        isFlipper: flipperScore >= 50,
        stats: {
          totalBuys: buys.length,
          totalSells: sells.length,
          quickFlips,
          avgHoldDays
        }
      });
    } else {
      res.json({ address, flipperScore: 0, isFlipper: false, stats: {} });
    }
  } catch (error) {
    console.error('Wallet error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch NFT metadata
app.post('/api/nfts/batch', async (req, res) => {
  try {
    const { contract, tokenIds } = req.body;
    
    const results = await Promise.all(
      tokenIds.slice(0, 20).map(async (tokenId) => {
        try {
          const response = await fetch(
            `${ALCHEMY_BASE}/getNFTMetadata?contractAddress=${contract}&tokenId=${tokenId}`
          );
          return response.json();
        } catch {
          return null;
        }
      })
    );
    
    res.json(results.filter(Boolean));
  } catch (error) {
    console.error('Batch error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 NFT Tracker API running on port ${PORT}`);
});
