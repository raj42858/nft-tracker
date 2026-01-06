import React, { useState, useMemo, useCallback } from 'react';
import { Search, Plus, Trash2, Upload, X, Flag, Zap, Moon, ExternalLink, ChevronLeft, Grid3x3, List, RefreshCw, Loader2, Eye } from 'lucide-react';

// ⚠️ CHANGE THIS to your Railway backend URL after deploying
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const marketplaceUrls = {
  OpenSea: (c, t) => `https://opensea.io/assets/ethereum/${c}/${t}`,
  Blur: (c, t) => `https://blur.io/asset/${c}/${t}`,
  LooksRare: (c, t) => `https://looksrare.org/collections/${c}/${t}`,
  X2Y2: (c, t) => `https://x2y2.io/eth/${c}/${t}`,
  seaport: (c, t) => `https://opensea.io/assets/ethereum/${c}/${t}`,
};

const defaultCollections = [
  { id: 'bayc', name: 'Bored Ape YC', slug: 'boredapeyachtclub', contract: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', image: 'https://i.seadn.io/gae/Ju9CkWtV-1Okvf45wo8UctR-M9He2PjILP0oOvxE89AyiPPGtrR3gysu1Zgy0hjd2xKIgjJJtWIc0ybj4Vd7wv8t3pxDGHoJBzDB?w=500' },
  { id: 'azuki', name: 'Azuki', slug: 'azuki', contract: '0xED5AF388653567Af2F388E6224dC7C4b3241C544', image: 'https://i.seadn.io/gae/H8jOCJuQokNqGBpkBN5wk1oZwO7LM8bNnrHCaekV2nKjnCqw6UB5oaH8XyNeBDj6bA_n1mjejzhFQUP3O1NfjFLHr3FOaeHcTOOT?w=500' },
  { id: 'doodles', name: 'Doodles', slug: 'doodles-official', contract: '0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e', image: 'https://i.seadn.io/gae/7B0qai02OdHA8P_EOVK672qUliyjQdQDGNrACxs7WnTgZAkJa_wWURnIFKeOh5VTf8cfTqW3wQpozGedaC9mteKphEOtztls02RlWQ?w=500' },
  { id: 'pudgy', name: 'Pudgy Penguins', slug: 'pudgypenguins', contract: '0xBd3531dA5CF5857e7CfAA92426877b022e612cf8', image: 'https://i.seadn.io/gae/yNi-XdGxsgQCPpqSio4o31ygAV6wURdIdInWRcFIl46UjUQ1eV7BEndGe8L661OoG-clRi7EgInLX4LPu9Jfw4fq0bnVYHqg7RFi?w=500' },
  { id: 'milady', name: 'Milady', slug: 'milady', contract: '0x5Af0D9827E0c53E4799BB226655A1de152A425a5', image: 'https://i.seadn.io/gcs/files/e93d1f6650538daa54cf1f7b614ce88d.png?w=500' },
];

export default function NFTTracker() {
  const [collections, setCollections] = useState(defaultCollections);
  const [selected, setSelected] = useState(null);
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState({ floor: '0', volume: '0' });
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('week');
  const [showFlippers, setShowFlippers] = useState(true);
  const [hideFlagged, setHideFlagged] = useState(false);
  const [flagged, setFlagged] = useState(new Set());
  const [dormantOnly, setDormantOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [threshold, setThreshold] = useState(50);
  const [view, setView] = useState('grid');
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [newCol, setNewCol] = useState({ name: '', slug: '', contract: '' });
  const [bulkText, setBulkText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [walletCache, setWalletCache] = useState({});
  const [analyzingWallets, setAnalyzingWallets] = useState(new Set());
  const [error, setError] = useState(null);

  // Fetch collection data
  const loadCollection = useCallback(async (col) => {
    setSelected(col);
    setLoading(true);
    setError(null);
    setSales([]);

    try {
      // Fetch sales from Alchemy via our backend
      const salesRes = await fetch(`${API_URL}/api/sales/${col.contract}`);
      const salesData = await salesRes.json();

      // Fetch floor price
      const floorRes = await fetch(`${API_URL}/api/floor/${col.contract}`);
      const floorData = await floorRes.json();

      // Fetch collection stats from OpenSea
      let osData = {};
      try {
        const osRes = await fetch(`${API_URL}/api/collection/${col.slug}`);
        osData = await osRes.json();
      } catch (e) {
        console.log('OpenSea data unavailable');
      }

      // Process sales
      const processedSales = (salesData.nftSales || []).map((sale, i) => {
        const priceWei = sale.sellerFee?.amount || sale.protocolFee?.amount || '0';
        const priceEth = parseInt(priceWei) / 1e18;

        return {
          id: `${sale.transactionHash}-${i}`,
          tokenId: sale.tokenId,
          price: priceEth.toFixed(4),
          priceRaw: priceEth,
          seller: sale.sellerAddress || '0x0000000000000000000000000000000000000000',
          buyer: sale.buyerAddress || '0x0000000000000000000000000000000000000000',
          timestamp: new Date(sale.blockTimestamp).getTime(),
          marketplace: sale.marketplace || 'OpenSea',
          contract: col.contract,
          image: col.image,
          flipperScore: 0,
          isDormant: false,
          dormantDays: 0,
        };
      });

      // Fetch NFT images for first 20 sales
      const withImages = await Promise.all(
        processedSales.slice(0, 50).map(async (sale) => {
          try {
            const nftRes = await fetch(`${API_URL}/api/nft/${col.contract}/${sale.tokenId}`);
            const nftData = await nftRes.json();
            return {
              ...sale,
              image: nftData?.image?.cachedUrl || nftData?.image?.thumbnailUrl || nftData?.image?.originalUrl || col.image
            };
          } catch {
            return sale;
          }
        })
      );

      setSales(withImages);
      setStats({
        floor: (floorData?.openSea?.floorPrice || floorData?.looksRare?.floorPrice || 0).toFixed(2),
        volume: (osData?.total_volume || 0).toFixed(1),
        owners: osData?.total_owners || 0,
        supply: osData?.total_supply || 0,
      });

    } catch (err) {
      console.error('Load error:', err);
      setError('Failed to load data. Check if backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Analyze wallet for flipper behavior
  const analyzeWallet = useCallback(async (address) => {
    if (walletCache[address] || analyzingWallets.has(address)) return;

    setAnalyzingWallets(prev => new Set([...prev, address]));

    try {
      const res = await fetch(`${API_URL}/api/wallet/${address}`);
      const data = await res.json();
      
      setWalletCache(prev => ({
        ...prev,
        [address]: data
      }));

      // Update sales with flipper info
      setSales(prev => prev.map(s => 
        s.buyer === address ? { ...s, flipperScore: data.flipperScore, isFlipper: data.isFlipper } : s
      ));
    } catch (err) {
      console.error('Wallet analysis error:', err);
    } finally {
      setAnalyzingWallets(prev => {
        const next = new Set(prev);
        next.delete(address);
        return next;
      });
    }
  }, [walletCache, analyzingWallets]);

  // Filter sales
  const filtered = useMemo(() => {
    let data = [...sales];
    const now = Date.now();
    const day = 86400000;

    if (dateFilter === 'day') data = data.filter(s => now - s.timestamp < day);
    else if (dateFilter === 'week') data = data.filter(s => now - s.timestamp < 7 * day);
    else if (dateFilter === 'month') data = data.filter(s => now - s.timestamp < 30 * day);

    if (!showFlippers) data = data.filter(s => (walletCache[s.buyer]?.flipperScore || 0) < threshold);
    if (hideFlagged) data = data.filter(s => !flagged.has(s.buyer) && !flagged.has(s.seller));
    if (dormantOnly) data = data.filter(s => s.isDormant);

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(s => s.buyer.toLowerCase().includes(q) || s.seller.toLowerCase().includes(q) || s.tokenId.toString().includes(q));
    }

    if (sort === 'recent') data.sort((a, b) => b.timestamp - a.timestamp);
    else if (sort === 'high') data.sort((a, b) => b.priceRaw - a.priceRaw);
    else if (sort === 'low') data.sort((a, b) => a.priceRaw - b.priceRaw);
    else if (sort === 'flipper') data.sort((a, b) => (walletCache[b.buyer]?.flipperScore || 0) - (walletCache[a.buyer]?.flipperScore || 0));

    return data;
  }, [sales, dateFilter, showFlippers, hideFlagged, flagged, dormantOnly, search, sort, threshold, walletCache]);

  // Stats
  const displayStats = useMemo(() => {
    const vol = filtered.reduce((s, x) => s + x.priceRaw, 0);
    const flippers = filtered.filter(s => (walletCache[s.buyer]?.flipperScore || 0) >= threshold).length;
    return {
      count: filtered.length,
      volume: vol.toFixed(2),
      avg: filtered.length ? (vol / filtered.length).toFixed(3) : '0',
      flippers,
    };
  }, [filtered, walletCache, threshold]);

  // Utilities
  const addr = (a) => a ? `${a.slice(0, 6)}...${a.slice(-4)}` : '0x...';
  const time = (t) => {
    const d = Date.now() - t;
    const m = Math.floor(d / 60000);
    const h = Math.floor(d / 3600000);
    const dy = Math.floor(d / 86400000);
    return m < 60 ? `${m}m` : h < 24 ? `${h}h` : `${dy}d`;
  };
  const toggleFlag = (a) => setFlagged(p => { const n = new Set(p); n.has(a) ? n.delete(a) : n.add(a); return n; });
  const link = (s) => (marketplaceUrls[s.marketplace] || marketplaceUrls.OpenSea)(s.contract, s.tokenId);

  const addOne = () => {
    if (newCol.name && newCol.contract) {
      setCollections([...collections, {
        id: `c${Date.now()}`,
        name: newCol.name,
        slug: newCol.slug || newCol.name.toLowerCase().replace(/\s+/g, '-'),
        contract: newCol.contract,
        image: `https://via.placeholder.com/400/111/333?text=${newCol.name.charAt(0)}`
      }]);
      setNewCol({ name: '', slug: '', contract: '' });
      setShowAdd(false);
    }
  };

  const addBulk = () => {
    const lines = bulkText.split('\n').filter(l => l.trim());
    const newOnes = lines.map((l, i) => {
      const [name, slug, contract] = l.split(',').map(x => x.trim());
      return {
        id: `b${Date.now()}${i}`,
        name: name || `Col ${i}`,
        slug: slug || '',
        contract: contract || '',
        image: `https://via.placeholder.com/400/111/333?text=${(name || 'N').charAt(0)}`
      };
    });
    setCollections([...collections, ...newOnes]);
    setBulkText('');
    setShowBulk(false);
  };

  return (
    <div className="h-screen w-screen bg-black text-white flex overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
        *{font-family:'Space Grotesk',sans-serif;box-sizing:border-box}
        .mono{font-family:monospace}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:#111}
        ::-webkit-scrollbar-thumb{background:#333;border-radius:3px}
        .nft-card{transition:transform .2s,box-shadow .2s}
        .nft-card:hover{transform:translateY(-8px) scale(1.03);box-shadow:0 20px 50px rgba(0,0,0,.8)}
        .nft-card:hover .overlay{opacity:1}
        .nft-card:hover .mp-link{opacity:1;transform:translateY(0)}
        .nft-card:hover .nft-img{transform:scale(1.1)}
        .overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.95) 0%,transparent 60%);opacity:0;transition:opacity .2s}
        .mp-link{position:absolute;top:8px;right:8px;opacity:0;transform:translateY(-8px);transition:all .2s}
        .nft-img{transition:transform .4s}
        .red-price{color:#ff3b5c;text-shadow:0 0 25px rgba(255,59,92,.6)}
        .flip-badge{background:linear-gradient(135deg,#ff6b00,#ff3d00);box-shadow:0 4px 15px rgba(255,107,0,.5)}
        .dorm-badge{background:linear-gradient(135deg,#7c3aed,#5b21b6);box-shadow:0 4px 15px rgba(124,58,237,.5)}
        .glow-orange{box-shadow:0 0 0 1px rgba(255,107,0,.4),0 0 30px rgba(255,107,0,.15)}
        .glow-purple{box-shadow:0 0 0 1px rgba(124,58,237,.4),0 0 30px rgba(124,58,237,.15)}
        .glow-red{box-shadow:0 0 0 1px rgba(255,59,92,.4),0 0 20px rgba(255,59,92,.1)}
      `}</style>

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-52' : 'w-14'} bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col transition-all duration-200 flex-shrink-0`}>
        <div className="h-12 flex items-center justify-between px-3 border-b border-[#1a1a1a]">
          {sidebarOpen && <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Collections</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-neutral-800 rounded-lg">
            <ChevronLeft size={14} className={`text-neutral-500 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {collections.map(c => (
            <div key={c.id} onClick={() => loadCollection(c)} className={`group flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors ${selected?.id === c.id ? 'bg-neutral-800' : 'hover:bg-neutral-900'}`}>
              <img src={c.image} alt="" className="w-8 h-8 rounded-lg object-cover bg-neutral-800" onError={e => e.target.src = 'https://via.placeholder.com/100/111/333'} />
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-sm font-medium truncate">{c.name}</span>
                  <button onClick={e => { e.stopPropagation(); setCollections(collections.filter(x => x.id !== c.id)); if (selected?.id === c.id) { setSelected(null); setSales([]); } }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded">
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="p-2 border-t border-[#1a1a1a] space-y-1">
          <button onClick={() => setShowAdd(true)} className="w-full flex items-center justify-center gap-2 p-2 bg-white text-black font-semibold rounded-lg text-sm hover:bg-neutral-200 transition-colors">
            <Plus size={14} /> {sidebarOpen && 'Add'}
          </button>
          {sidebarOpen && (
            <button onClick={() => setShowBulk(true)} className="w-full flex items-center justify-center gap-2 p-2 bg-neutral-900 text-neutral-400 rounded-lg text-sm hover:bg-neutral-800 transition-colors">
              <Upload size={14} /> Bulk
            </button>
          )}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            {/* Top Bar */}
            <div className="h-14 flex items-center gap-4 px-4 border-b border-[#1a1a1a] bg-[#080808] flex-shrink-0">
              <img src={selected.image} alt="" className="w-10 h-10 rounded-xl object-cover bg-neutral-800" />
              <div className="min-w-0">
                <h1 className="text-base font-bold truncate">{selected.name}</h1>
                <p className="text-[10px] text-neutral-600 mono truncate">{selected.contract}</p>
              </div>
              <div className="flex items-center gap-6 ml-auto">
                <div className="text-right"><p className="text-[10px] text-neutral-500">FLOOR</p><p className="text-sm font-bold">{stats.floor} ETH</p></div>
                <div className="text-right"><p className="text-[10px] text-neutral-500">VOLUME</p><p className="text-sm font-bold">{stats.volume} ETH</p></div>
                <div className="text-right"><p className="text-[10px] text-neutral-500">SALES</p><p className="text-sm font-bold">{displayStats.count}</p></div>
                <div className="text-right"><p className="text-[10px] text-neutral-500">AVG</p><p className="text-sm font-bold">{displayStats.avg} ETH</p></div>
                <div className="text-right"><p className="text-[10px] text-neutral-500">FLIPPERS</p><p className="text-sm font-bold text-orange-400">{displayStats.flippers}</p></div>
                <button onClick={() => loadCollection(selected)} disabled={loading} className="p-2 hover:bg-neutral-800 rounded-lg">
                  <RefreshCw size={16} className={`text-neutral-500 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="h-11 flex items-center gap-2 px-4 border-b border-[#1a1a1a] bg-[#0a0a0a] flex-shrink-0">
              <div className="flex bg-[#111] rounded-lg p-0.5">
                {['day', 'week', 'month', 'all'].map(p => (
                  <button key={p} onClick={() => setDateFilter(p)} className={`px-3 py-1 text-xs font-medium rounded-md ${dateFilter === p ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}>{p.charAt(0).toUpperCase() + p.slice(1)}</button>
                ))}
              </div>

              <select value={sort} onChange={e => setSort(e.target.value)} className="bg-[#111] border border-[#222] rounded-lg px-2 py-1 text-xs focus:outline-none cursor-pointer">
                <option value="recent">Recent</option>
                <option value="high">Price ↓</option>
                <option value="low">Price ↑</option>
                <option value="flipper">Flipper ↓</option>
              </select>

              <div className="w-px h-5 bg-[#222]" />

              <button onClick={() => setShowFlippers(!showFlippers)} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${showFlippers ? 'bg-orange-500/20 text-orange-400' : 'bg-[#111] text-neutral-500'}`}><Zap size={11} /> Flippers</button>
              <button onClick={() => setHideFlagged(!hideFlagged)} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${hideFlagged ? 'bg-rose-500/20 text-rose-400' : 'bg-[#111] text-neutral-500'}`}><Flag size={11} /> Flagged</button>
              <button onClick={() => setDormantOnly(!dormantOnly)} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${dormantOnly ? 'bg-violet-500/20 text-violet-400' : 'bg-[#111] text-neutral-500'}`}><Moon size={11} /> Dormant</button>

              <div className="flex items-center gap-1 text-xs text-neutral-500 ml-2">
                <span>Threshold</span>
                <input type="range" min="0" max="100" value={threshold} onChange={e => setThreshold(+e.target.value)} className="w-16 h-1 bg-neutral-800 rounded appearance-none cursor-pointer accent-orange-500" />
                <span className="text-orange-400 w-7">{threshold}%</span>
              </div>

              <div className="flex-1" />

              <div className="flex bg-[#111] rounded-lg p-0.5">
                <button onClick={() => setView('grid')} className={`p-1.5 rounded-md ${view === 'grid' ? 'bg-white text-black' : 'text-neutral-500'}`}><Grid3X3 size={14} /></button>
                <button onClick={() => setView('list')} className={`p-1.5 rounded-md ${view === 'list' ? 'bg-white text-black' : 'text-neutral-500'}`}><List size={14} /></button>
              </div>

              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-600" />
                <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="bg-[#111] border border-[#222] rounded-lg pl-7 pr-3 py-1 text-xs w-28 focus:outline-none focus:w-40 transition-all" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3">
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 size={32} className="animate-spin text-neutral-600 mx-auto mb-2" />
                    <p className="text-neutral-500 text-sm">Loading sales...</p>
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-neutral-600">
                    <p>No sales found</p>
                  </div>
                </div>
              ) : view === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
                  {filtered.map(s => {
                    const walletData = walletCache[s.buyer];
                    const isFlip = (walletData?.flipperScore || 0) >= threshold;
                    const isFlagged = flagged.has(s.buyer) || flagged.has(s.seller);
                    const isAnalyzing = analyzingWallets.has(s.buyer);

                    return (
                      <a key={s.id} href={link(s)} target="_blank" rel="noopener noreferrer" className={`nft-card block bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl overflow-hidden ${isFlip ? 'glow-orange' : ''} ${s.isDormant ? 'glow-purple' : ''} ${isFlagged ? 'glow-red' : ''}`}>
                        <div className="aspect-square bg-[#080808] relative overflow-hidden">
                          <img src={s.image} alt="" className="nft-img w-full h-full object-cover" onError={e => e.target.src = 'https://via.placeholder.com/400/111/333'} />
                          <div className="overlay" />
                          <div className="mp-link bg-white px-2 py-1 rounded-full flex items-center gap-1 text-[10px] font-bold text-black shadow-lg">
                            {s.marketplace} <ExternalLink size={9} />
                          </div>
                          <div className="absolute bottom-2 left-2 flex gap-1">
                            {isFlip && <span className="flip-badge text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 text-white"><Zap size={9} /></span>}
                            {s.isDormant && <span className="dorm-badge text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 text-white"><Moon size={9} />{s.dormantDays}d</span>}
                          </div>
                        </div>
                        <div className="p-2.5">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold">#{s.tokenId}</span>
                            <span className="text-[10px] text-neutral-600">{time(s.timestamp)}</span>
                          </div>
                          <p className="text-base font-bold red-price mb-2">{s.price} ETH</p>
                          <div className="space-y-1 text-[10px]">
                            <div className="flex justify-between items-center">
                              <span className="text-neutral-600">From</span>
                              <div className="flex items-center gap-1">
                                <span className={`mono ${flagged.has(s.seller) ? 'text-rose-400' : 'text-neutral-500'}`}>{addr(s.seller)}</span>
                                <button onClick={e => { e.preventDefault(); toggleFlag(s.seller); }} className="p-0.5 hover:bg-neutral-800 rounded"><Flag size={9} className={flagged.has(s.seller) ? 'text-rose-400' : 'text-neutral-700'} /></button>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-neutral-600">To</span>
                              <div className="flex items-center gap-1">
                                <span className={`mono ${flagged.has(s.buyer) ? 'text-rose-400' : 'text-neutral-500'}`}>{addr(s.buyer)}</span>
                                <button onClick={e => { e.preventDefault(); toggleFlag(s.buyer); }} className="p-0.5 hover:bg-neutral-800 rounded"><Flag size={9} className={flagged.has(s.buyer) ? 'text-rose-400' : 'text-neutral-700'} /></button>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={e => { e.preventDefault(); analyzeWallet(s.buyer); }}
                            className="w-full mt-2 py-1.5 text-[10px] bg-neutral-900 hover:bg-neutral-800 rounded-lg flex items-center justify-center gap-1"
                          >
                            {isAnalyzing ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : walletData ? (
                              <span className={walletData.flipperScore >= threshold ? 'text-orange-400' : 'text-neutral-500'}>Score: {walletData.flipperScore}%</span>
                            ) : (
                              <><Eye size={10} /> Analyze</>
                            )}
                          </button>
                        </div>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-[#080808] text-neutral-500 text-[10px] uppercase">
                      <tr>
                        <th className="text-left p-2 font-medium">NFT</th>
                        <th className="text-left p-2 font-medium">Price</th>
                        <th className="text-left p-2 font-medium">From</th>
                        <th className="text-left p-2 font-medium">To</th>
                        <th className="text-left p-2 font-medium">Market</th>
                        <th className="text-left p-2 font-medium">Time</th>
                        <th className="text-left p-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(s => {
                        const walletData = walletCache[s.buyer];
                        const isFlip = (walletData?.flipperScore || 0) >= threshold;
                        const isFlagged = flagged.has(s.buyer) || flagged.has(s.seller);
                        return (
                          <tr key={s.id} className={`border-t border-[#1a1a1a] hover:bg-[#111] ${isFlagged ? 'bg-rose-500/5' : ''}`}>
                            <td className="p-2">
                              <a href={link(s)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group">
                                <img src={s.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-neutral-900" />
                                <span className="font-bold group-hover:text-orange-400">#{s.tokenId}</span>
                              </a>
                            </td>
                            <td className="p-2 font-bold red-price">{s.price} ETH</td>
                            <td className="p-2">
                              <div className="flex items-center gap-1">
                                <span className={`mono ${flagged.has(s.seller) ? 'text-rose-400' : 'text-neutral-500'}`}>{addr(s.seller)}</span>
                                <button onClick={() => toggleFlag(s.seller)} className="p-0.5 hover:bg-neutral-800 rounded"><Flag size={10} className={flagged.has(s.seller) ? 'text-rose-400' : 'text-neutral-700'} /></button>
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="flex items-center gap-1">
                                <span className={`mono ${flagged.has(s.buyer) ? 'text-rose-400' : 'text-neutral-500'}`}>{addr(s.buyer)}</span>
                                <button onClick={() => toggleFlag(s.buyer)} className="p-0.5 hover:bg-neutral-800 rounded"><Flag size={10} className={flagged.has(s.buyer) ? 'text-rose-400' : 'text-neutral-700'} /></button>
                              </div>
                            </td>
                            <td className="p-2">
                              <a href={link(s)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-900 rounded hover:bg-neutral-800">
                                {s.marketplace} <ExternalLink size={10} />
                              </a>
                            </td>
                            <td className="p-2 text-neutral-500">{time(s.timestamp)}</td>
                            <td className="p-2">
                              <div className="flex items-center gap-1">
                                {isFlip && <span className="flip-badge text-[9px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5"><Zap size={9} />{walletData.flipperScore}%</span>}
                                {!walletData && (
                                  <button onClick={() => analyzeWallet(s.buyer)} className="text-[10px] text-neutral-600 hover:text-white flex items-center gap-1">
                                    {analyzingWallets.has(s.buyer) ? <Loader2 size={10} className="animate-spin" /> : <><Eye size={10} /> Analyze</>}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Flagged */}
            {flagged.size > 0 && (
              <div className="h-10 flex items-center gap-2 px-4 border-t border-[#1a1a1a] bg-[#0a0a0a] flex-shrink-0">
                <Flag size={12} className="text-rose-400" />
                <span className="text-[10px] text-neutral-500">Flagged:</span>
                {[...flagged].slice(0, 5).map(a => (
                  <span key={a} className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded text-[10px] mono text-rose-400">
                    {addr(a)} <button onClick={() => toggleFlag(a)}><X size={10} /></button>
                  </span>
                ))}
                {flagged.size > 5 && <span className="text-[10px] text-neutral-500">+{flagged.size - 5} more</span>}
                <button onClick={() => setFlagged(new Set())} className="text-[10px] text-neutral-600 hover:text-rose-400 ml-auto">Clear all</button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-neutral-600">
              <div className="text-4xl mb-3">📊</div>
              <p className="font-semibold">Select a collection</p>
              <p className="text-xs mt-1">Choose from sidebar to view sales</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-[#222] rounded-2xl p-5 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Add Collection</h3>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-neutral-800 rounded-lg"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Name *" value={newCol.name} onChange={e => setNewCol({ ...newCol, name: e.target.value })} className="w-full bg-black border border-[#222] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-600" />
              <input placeholder="OpenSea Slug" value={newCol.slug} onChange={e => setNewCol({ ...newCol, slug: e.target.value })} className="w-full bg-black border border-[#222] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-600" />
              <input placeholder="Contract Address *" value={newCol.contract} onChange={e => setNewCol({ ...newCol, contract: e.target.value })} className="w-full bg-black border border-[#222] rounded-lg px-3 py-2 text-sm mono focus:outline-none focus:border-neutral-600" />
              <button onClick={addOne} disabled={!newCol.name || !newCol.contract} className="w-full py-2.5 bg-white text-black font-semibold rounded-lg disabled:opacity-40">Add Collection</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Modal */}
      {showBulk && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-[#222] rounded-2xl p-5 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Bulk Import</h3>
              <button onClick={() => setShowBulk(false)} className="p-1 hover:bg-neutral-800 rounded-lg"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <textarea placeholder="Name, Slug, Contract (one per line)" value={bulkText} onChange={e => setBulkText(e.target.value)} rows={6} className="w-full bg-black border border-[#222] rounded-lg px-3 py-2 text-sm mono resize-none focus:outline-none focus:border-neutral-600" />
              <p className="text-xs text-neutral-500">{bulkText.split('\n').filter(l => l.trim()).length} collections</p>
              <button onClick={addBulk} disabled={!bulkText.trim()} className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 font-semibold rounded-lg disabled:opacity-40">Import All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
