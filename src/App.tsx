import React, { useState, useEffect } from 'react';
import {
  Building2,
  Wallet,
  TrendingUp,
  Map as MapIcon,
  History,
  AlertTriangle,
  Info,
  IndianRupee,
  Bell,
  Plus,
  Minus,
  MapPin,
  Home,
  Building,
  TreePine,
  Construction,
  Briefcase,
  ShoppingBag,
  Store,
  Navigation,
  DollarSign
} from 'lucide-react';
import { Joyride, type Step } from 'react-joyride';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import PropertyDetail from './components/PropertyDetail';
import './App.css';

// --- Types ---
interface Property {
  id: string;
  pincode: string;
  type: 'Residential' | 'Commercial';
  status: 'Under-Construction' | 'Ready-to-Move';
  price: number;
  rent: number;
  appreciation: number;
  trustScore: number;
  isRERA: boolean;
  carpetArea: number;
  superArea: number;
  maintenance: number;
  description: string;
}

interface Transaction {
  id: string;
  type: 'Buy' | 'Sell' | 'Rent' | 'Maintenance' | 'Tax';
  amount: number;
  description: string;
  timestamp: string;
}

interface UserState {
  cash: number;
  netWorth: number;
  portfolio: Property[];
  transactions: Transaction[];
  turn: number;
}

interface GameEvent {
  id: string;
  title: string;
  description: string;
  type: 'Positive' | 'Negative' | 'Neutral';
}

// --- Locality Names ---
const LOCALITY_NAMES = [
  'Fort', 'Andheri West', 'Powai', 'Bandra East', 'Lower Parel',
  'Goregaon', 'Malad', 'Borivali', 'Thane', 'Juhu',
  'Worli', 'Chembur', 'Vikhroli', 'Mulund', 'Kurla',
  'Dadar', 'Sion', 'Wadala', 'Colaba', 'Nariman Point',
];

const RESIDENTIAL_DESCS = [
  '2BHK Flat', 'Studio Apartment', '1BHK Flat', 'Penthouse Suite',
  '3BHK Family Home', 'Compact Studio', 'Luxury 2BHK', 'Budget 1RK',
  'Garden-View Flat', 'Sea-Facing Apartment',
];

const COMMERCIAL_DESCS = [
  'Office Space', 'Co-Working Hub', 'IT Park Unit', 'Business Centre',
  'Retail Showroom', 'Corporate Floor', 'Tech Office Suite', 'Startup Cabin',
];

const SHOP_DESCS = [
  'Retail Shop', 'Corner Boutique', 'Food Court Unit', 'Anchor Store Unit',
  'Fashion Outlet', 'Electronics Store', 'Pharmacy Space',
];

// Seeded random for deterministic results per tile
const seededRand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

// --- City Generation ---
const GRID_SIZE = 20;

interface CityTile {
  id: number;
  type: 'residential' | 'commercial' | 'under-construction' | 'buyable' | 'mall' | 'shop' | 'road-h' | 'road-v' | 'road-cross' | 'park' | 'ground';
  parentId?: number;
  span?: { cols: number; rows: number };
  hidden?: boolean;
  forSale?: boolean;
}

const generateMap = (): CityTile[] => {
  const grid: CityTile[] = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({
    id: i,
    type: 'ground' as CityTile['type'],
  }));

  const at = (r: number, c: number) => r * GRID_SIZE + c;
  const inBounds = (r: number, c: number) => r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE;

  // 1. Lay roads (every 5th row/col)
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const isHRoad = r % 5 === 0;
      const isVRoad = c % 5 === 0;
      if (isHRoad && isVRoad) grid[at(r, c)].type = 'road-cross';
      else if (isHRoad) grid[at(r, c)].type = 'road-h';
      else if (isVRoad) grid[at(r, c)].type = 'road-v';
    }
  }

  const canPlace = (r: number, c: number, rows: number, cols: number) => {
    for (let dr = 0; dr < rows; dr++)
      for (let dc = 0; dc < cols; dc++)
        if (!inBounds(r + dr, c + dc) || grid[at(r + dr, c + dc)].type !== 'ground') return false;
    return true;
  };

  const placeBuilding = (r: number, c: number, rows: number, cols: number, type: CityTile['type'], forSale = false) => {
    const anchorId = at(r, c);
    grid[anchorId].type = type;
    grid[anchorId].span = { cols, rows };
    grid[anchorId].forSale = forSale;
    for (let dr = 0; dr < rows; dr++) {
      for (let dc = 0; dc < cols; dc++) {
        if (dr === 0 && dc === 0) continue;
        grid[at(r + dr, c + dc)].type = type;
        grid[at(r + dr, c + dc)].parentId = anchorId;
        grid[at(r + dr, c + dc)].hidden = true;
      }
    }
  };

  // 2. Place 2 big malls (4x3)
  const mallSpots = [
    [1, 11, 3, 4],  // Mall 1: top-right area
    [11, 1, 4, 3],  // Mall 2: bottom-left area
  ];
  for (const [r, c, rows, cols] of mallSpots) {
    if (canPlace(r, c, rows, cols)) placeBuilding(r, c, rows, cols, 'mall');
  }

  // 3. Place shops for sale inside mall vicinity (adjacent tiles)
  const shopSpots = [
    [4, 11], [4, 12], [4, 13], [4, 14],  // Below Mall 1
    [1, 16], [2, 16], [3, 16],            // Right of Mall 1
    [16, 1], [16, 2], [16, 3],            // Below Mall 2
    [11, 4], [12, 4], [13, 4],            // Right of Mall 2
  ];
  for (const [r, c] of shopSpots) {
    if (inBounds(r, c) && grid[at(r, c)].type === 'ground') {
      grid[at(r, c)].type = 'shop';
      grid[at(r, c)].forSale = true;
    }
  }

  // 4. Place commercial buildings (buyable offices)
  const commercialSpots = [
    [1, 1, 2, 2], [1, 6, 2, 3], [6, 1, 2, 2], [6, 7, 2, 2],
    [11, 7, 2, 2], [16, 7, 3, 2], [6, 16, 2, 3], [16, 16, 2, 3],
  ];
  for (const [r, c, rows, cols] of commercialSpots) {
    if (canPlace(r, c, rows, cols)) placeBuilding(r, c, rows, cols, 'commercial', true);
  }

  // 5. Place under-construction sites
  const ucSpots = [
    [3, 3, 2, 2], [8, 8, 2, 2], [13, 13, 2, 2], [17, 6, 2, 2], [3, 8, 2, 2],
  ];
  for (const [r, c, rows, cols] of ucSpots) {
    if (canPlace(r, c, rows, cols)) placeBuilding(r, c, rows, cols, 'under-construction');
  }

  // 6. Place large residential buildings
  const largeResSpots = [
    [1, 3, 2, 2], [2, 17, 1, 2], [6, 3, 2, 2],
    [7, 14, 1, 2], [8, 2, 2, 1], [11, 17, 1, 2],
    [13, 2, 2, 2], [16, 3, 1, 2], [17, 8, 2, 1],
    [7, 8, 2, 1], [16, 17, 2, 2], [18, 11, 1, 2],
  ];
  for (const [r, c, rows, cols] of largeResSpots) {
    if (canPlace(r, c, rows, cols)) placeBuilding(r, c, rows, cols, 'residential');
  }

  // 7. Place big parks (2x2 or 2x3)
  const bigParkSpots = [
    [6, 12, 2, 3], [11, 14, 2, 2], [16, 11, 2, 2],
  ];
  for (const [r, c, rows, cols] of bigParkSpots) {
    if (canPlace(r, c, rows, cols)) placeBuilding(r, c, rows, cols, 'park');
  }

  // 8. Place buyable residential properties
  const buyableSpots = [
    [2, 8], [4, 2], [7, 3], [8, 14], [12, 3], [14, 8], [17, 14], [9, 17], [13, 8], [18, 8],
  ];
  for (const [r, c] of buyableSpots) {
    if (inBounds(r, c) && grid[at(r, c)].type === 'ground') {
      grid[at(r, c)].type = 'buyable';
      grid[at(r, c)].forSale = true;
    }
  }

  // 9. Fill remaining ground — dense blocks + more parks
  const isDenseBlock = (r: number, c: number) =>
    (r >= 6 && r <= 9 && c >= 1 && c <= 4) ||
    (r >= 11 && r <= 14 && c >= 6 && c <= 9);

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = grid[at(r, c)];
      if (tile.type === 'ground') {
        if (isDenseBlock(r, c)) {
          tile.type = 'residential';
        } else if ((r + c) % 6 === 0 && r > 0 && c > 0) {
          // More frequent parks (was % 9)
          tile.type = 'park';
        } else {
          tile.type = 'residential';
        }
      }
    }
  }

  return grid;
};

const CITY_MAP = generateMap();

// --- Dynamic Property Generator ---
const propertyCache = new Map<string, Property>();

const generatePropertyForTile = (tile: CityTile, turn: number): Property => {
  const cacheKey = `${tile.id}-${turn}`;
  if (propertyCache.has(cacheKey)) return propertyCache.get(cacheKey)!;

  const row = Math.floor(tile.id / GRID_SIZE);
  const col = tile.id % GRID_SIZE;
  const rand = seededRand(tile.id);

  // --- Proximity calculations ---
  let nearbyCommercial = 0;
  let nearbyMall = 0;
  let nearbyPark = 0;
  let nearbyConstruction = 0;

  for (const other of CITY_MAP) {
    if (other.hidden) continue;
    const oRow = Math.floor(other.id / GRID_SIZE);
    const oCol = other.id % GRID_SIZE;
    const dist = Math.abs(row - oRow) + Math.abs(col - oCol); // Manhattan distance
    if (dist === 0 || dist > 6) continue;

    const proximity = Math.max(0, 7 - dist); // 6=close, 1=far
    if (other.type === 'commercial') nearbyCommercial += proximity;
    if (other.type === 'mall') nearbyMall += proximity;
    if (other.type === 'park') nearbyPark += proximity;
    if (other.type === 'under-construction') nearbyConstruction += proximity;
  }

  // --- Determine tile characteristics ---
  const isCommercialType = tile.type === 'commercial' || tile.type === 'shop';
  const isUnderConstruction = tile.type === 'under-construction' || nearbyConstruction > 8;
  const isGovt = rand < 0.2; // 20% chance of govt property
  const isRERA = isGovt || rand > 0.35; // Govt always RERA, 65% others
  const isMulti = !!tile.span;
  const isTrap = rand < 0.05; // 5% chance of a "Value Trap" (Distressed Asset)

  // --- Size based on tile span ---
  const tileCount = isMulti ? (tile.span!.cols * tile.span!.rows) : 1;
  const baseCarpet = isCommercialType ? 400 : 350;
  const carpetArea = Math.round(baseCarpet * tileCount * (0.8 + rand * 0.4));
  const loadingFactor = 0.25 + rand * 0.15; // 25-40%
  const superArea = Math.round(carpetArea / (1 - loadingFactor));

  // --- Base price per sqft (₹) ---
  let pricePerSqft = isCommercialType ? 12000 : 8000;

  // Proximity bonuses
  pricePerSqft += nearbyMall * 200;       // Near mall = premium
  pricePerSqft += nearbyCommercial * 150;  // Near offices = premium
  pricePerSqft += nearbyPark * 180;        // Near parks = premium
  pricePerSqft -= nearbyConstruction * 100; // Near construction = discount

  // Status adjustments
  if (isUnderConstruction) pricePerSqft *= 0.75; // 25% under-construction discount
  if (!isRERA) pricePerSqft *= 0.85;              // Non-RERA = risky = cheaper
  if (isGovt) pricePerSqft *= 0.8;                // Govt = cheaper but safe

  const price = Math.round(pricePerSqft * superArea / 100000) * 100000; // Round to nearest lakh

  // --- Rent (yield-based) ---
  let yieldPct = isCommercialType ? (3.5 + rand * 2) : (2.5 + rand * 1.5);
  if (isTrap) yieldPct += 4; // Yield bait!
  const rent = Math.round((price * yieldPct / 100) / 12 / 1000) * 1000;

  // --- Trust Score ---
  let trustScore = isGovt ? 100 : Math.round(50 + rand * 45);
  if (isRERA && !isGovt) trustScore = Math.max(trustScore, 65);

  // --- Appreciation ---
  let appreciation = 3 + rand * 4; // 3-7% base

  // Infrastructure bonuses
  if (nearbyMall > 8) appreciation += 2.5;
  if (nearbyPark > 5) appreciation += 1.2;
  if (nearbyCommercial > 10) appreciation += 2;
  if (isUnderConstruction) appreciation += 1.5;

  // Quality/Risk penalties
  if (!isRERA) appreciation -= 5; // Huge penalty for non-RERA (likely to be stagnant or negative)
  if (trustScore < 60) appreciation -= 3; // Penalty for low trust builders
  if (nearbyCommercial < 4 && nearbyMall < 4) appreciation -= 2.5; // Isolated locality penalty

  appreciation = Math.round(appreciation * 10) / 10;

  // --- Maintenance ---
  let maintPerSqft = isCommercialType ? 8 : 5;

  if (isTrap) {
    maintPerSqft *= 6; // 6x maintenance (legal issues/repairs)
    appreciation -= 10; // Value crashes over time
  } else {
    // Luxury / Premium factor
    if (nearbyPark > 5) maintPerSqft += 4;
    if (nearbyMall > 7) maintPerSqft += 3;
    // "White Elephant" Factor (15% chance)
    if (rand < 0.15) maintPerSqft *= 3;
  }

  let maintenance = Math.round((superArea * maintPerSqft) / 500) * 500;
  if (isUnderConstruction) maintenance = 0;

  // Add Trap indication to description
  const locality = LOCALITY_NAMES[(row + col) % LOCALITY_NAMES.length];
  let desc: string;
  if (isTrap) {
    desc = `Distressed ${isCommercialType ? 'Office' : 'Apartment'} in ${locality}`;
  } else if (tile.type === 'shop') {
    desc = `${SHOP_DESCS[tile.id % SHOP_DESCS.length]} in ${locality}`;
  } else if (isCommercialType) {
    desc = `${COMMERCIAL_DESCS[tile.id % COMMERCIAL_DESCS.length]} in ${locality}`;
  } else {
    const prefix = isGovt ? 'Govt (MHADA) ' : (isUnderConstruction ? 'New ' : '');
    desc = `${prefix}${RESIDENTIAL_DESCS[tile.id % RESIDENTIAL_DESCS.length]} in ${locality}`;
  }

  // --- Apply Turn-based Appreciation ---
  const quarterlyRate = appreciation / 4; // Approximation of quarterly growth
  const yearsElapsed = (turn - 1) / 4;
  const appreciationFactor = Math.pow(1 + (appreciation / 100), yearsElapsed);

  const finalPrice = Math.round((price * appreciationFactor) / 100000) * 100000;
  const finalRent = Math.round((rent * appreciationFactor) / 1000) * 1000;

  const property: Property = {
    id: `tile-${tile.id}`,
    pincode: `400${String(row * GRID_SIZE + col).padStart(3, '0')}`,
    type: isCommercialType ? 'Commercial' : 'Residential',
    status: isUnderConstruction ? 'Under-Construction' : 'Ready-to-Move',
    price: finalPrice,
    rent: finalRent,
    appreciation,
    trustScore,
    isRERA,
    carpetArea,
    superArea,
    maintenance,
    description: desc,
  };

  propertyCache.set(cacheKey, property);
  return property;
};

// --- Main Component ---
const App: React.FC = () => {
  const [user, setUser] = useState<UserState>({
    cash: 10000000,
    netWorth: 10000000,
    portfolio: [],
    transactions: [],
    turn: 1
  });

  const [activeTab, setActiveTab] = useState<'city' | 'portfolio' | 'news' | 'ledger' | 'help'>('city');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [viewMode, setViewMode] = useState<'buy' | 'info' | 'sell'>('buy');
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [zoom, setZoom] = useState(0.8);
  const [gameState, setGameState] = useState<'playing' | 'lost'>('playing');
  const [runTour, setRunTour] = useState(true);

  const steps: Step[] = [
    {
      target: '.stats-bar',
      skipBeacon: true,
      content: 'Welcome to Pincode Tycoon! Here is your money. You start with ₹1 Crore. Your goal is to maximize your Net Worth by Quarter 20!',
      placement: 'bottom',
    },
    {
      target: '.viewport',
      content: 'This is the City Grid. Click on buildings to buy them or view their details. Watch out for Value Traps and look for RERA-registered properties!',
      placement: 'auto',
    },
    {
      target: '.sidebar',
      content: 'Use these tabs to check your Portfolio, read Market News, view your transaction Ledger, or read the Guide for tips.',
      placement: 'right',
    },
    {
      target: '.btn-next-turn',
      content: 'When you are done buying and selling, click "End Quarter" to advance time. You will collect rent, pay maintenance, and properties will change in value!',
      placement: 'top',
    }
  ];

  const restartGame = () => {
    setUser({
      cash: 10000000,
      netWorth: 10000000,
      portfolio: [],
      transactions: [],
      turn: 1
    });
    setGameState('playing');
    setActiveTab('city');
    setEvents([]);
  };

  const mapControls = useAnimation();
  const constraintsRef = React.useRef(null);

  useEffect(() => {
    mapControls.start({ scale: zoom });
  }, [zoom, mapControls]);

  const recenterMap = () => {
    setZoom(0.8);
    mapControls.start({ x: 0, y: 0, scale: 0.8 });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleBuy = (property: Property) => {
    const stampDuty = property.price * 0.06;
    const totalCost = property.price + stampDuty;

    if (user.cash >= totalCost) {
      const newTransaction: Transaction = {
        id: `buy-${Date.now()}`,
        type: 'Buy',
        amount: -totalCost,
        description: `Purchased ${property.description} (incl. ₹${stampDuty.toLocaleString()} Stamp Duty)`,
        timestamp: `Quarter ${user.turn}`
      };

      setUser(prev => ({
        ...prev,
        cash: prev.cash - totalCost,
        portfolio: [...prev.portfolio, property],
        transactions: [newTransaction, ...prev.transactions]
      }));
      setSelectedProperty(null);
    }
  };

  const handleTileClick = (tile: CityTile) => {
    const baseProp = generatePropertyForTile(tile, user.turn);
    const ownedProp = user.portfolio.find(p => p.id === baseProp.id);

    if (ownedProp) {
      setViewMode('sell');
      setSelectedProperty(ownedProp);
    } else {
      setViewMode(tile.forSale ? 'buy' : 'info');
      setSelectedProperty(baseProp);
    }
  };

  const handleSell = (property: Property) => {
    const saleValue = property.price; // Sell at current market value
    const newTransaction: Transaction = {
      id: `sell-${Date.now()}`,
      type: 'Sell',
      amount: saleValue,
      description: `Sold ${property.description} at market price`,
      timestamp: `Quarter ${user.turn}`
    };

    setUser(prev => ({
      ...prev,
      cash: prev.cash + saleValue,
      portfolio: prev.portfolio.filter(p => p.id !== property.id),
      transactions: [newTransaction, ...prev.transactions]
    }));
    setSelectedProperty(null);
  };

  const nextTurn = () => {
    setUser(prev => {
      let totalRent = 0;
      let totalMaintenance = 0;
      const newTransactions: Transaction[] = [];

      const updatedPortfolio = prev.portfolio.map(p => {
        // Apply Appreciation
        const appRate = (p.appreciation + (Math.random() * 2 - 1)) / 100;
        const newPrice = Math.round(p.price * (1 + appRate));
        return { ...p, price: newPrice };
      });

      const survivingPortfolio: Property[] = [];
      updatedPortfolio.forEach(p => {
        // --- 1. RERA Risk (Non-RERA projects can stall) ---
        if (!p.isRERA && Math.random() < 0.02) { // ~30% risk over 20 quarters
          newTransactions.push({
            id: `loss-${Date.now()}-${p.id}`,
            type: 'Maintenance',
            amount: 0,
            description: `⚠️ LEGAL DISASTER: Developer of ${p.description} disappeared. Asset is now worthless.`,
            timestamp: `Quarter ${prev.turn}`
          });
          // Property is removed from survivingPortfolio
        } else {
          // --- 2. Rent & Maintenance Logic ---
          if (p.status === 'Ready-to-Move') {
            // Commercial Vacancy Risk (15% chance per quarter)
            const isVacant = p.type === 'Commercial' && Math.random() < 0.15;

            if (!isVacant) {
              totalRent += p.rent;
            } else {
              newTransactions.push({
                id: `vacancy-${Date.now()}-${p.id}`,
                type: 'Rent',
                amount: 0,
                description: `Vacancy: Shop/Office at ${p.description} is between tenants. No rent this quarter.`,
                timestamp: `Quarter ${prev.turn}`
              });
            }
            totalMaintenance += p.maintenance;
          }
          survivingPortfolio.push(p);
        }
      });

      if (totalRent > 0) {
        newTransactions.push({
          id: `rent-${Date.now()}`,
          type: 'Rent',
          amount: totalRent,
          description: `Quarterly rental income from portfolio`,
          timestamp: `Quarter ${prev.turn}`
        });
      }

      if (totalMaintenance > 0) {
        newTransactions.push({
          id: `maint-${Date.now()}`,
          type: 'Maintenance',
          amount: -totalMaintenance,
          description: `Quarterly maintenance fees for properties`,
          timestamp: `Quarter ${prev.turn}`
        });
      }

      const netIncome = totalRent - totalMaintenance;
      let liquidCash = prev.cash + netIncome;
      let finalPortfolio = [...updatedPortfolio];

      // --- Auto-Liquidation if cash < 0 ---
      if (liquidCash < 0 && finalPortfolio.length > 0) {
        // Sort by price (sell most expensive to clear debt fastest)
        finalPortfolio.sort((a, b) => b.price - a.price);

        while (liquidCash < 0 && finalPortfolio.length > 0) {
          const propToSell = finalPortfolio.pop()!;
          const saleValue = propToSell.price * 0.9; // 10% forced sale discount
          liquidCash += saleValue;

          newTransactions.push({
            id: `forced-sell-${Date.now()}-${finalPortfolio.length}`,
            type: 'Sell',
            amount: saleValue,
            description: `FORCED SALE: ${propToSell.description} sold at 10% discount to cover maintenance debt`,
            timestamp: `Quarter ${prev.turn}`
          });
        }
      }

      const finalNetWorth = liquidCash + finalPortfolio.reduce((acc, p) => acc + p.price, 0);

      // Check Lose Conditions
      if (finalNetWorth < 0 || (prev.turn === 20 && finalNetWorth < 10000000)) {
        setTimeout(() => setGameState('lost'), 100);
      }

      return {
        ...prev,
        cash: liquidCash,
        portfolio: survivingPortfolio,
        netWorth: finalNetWorth,
        transactions: [...newTransactions, ...prev.transactions],
        turn: prev.turn + 1
      };
    });

    // Random Event
    if (Math.random() > 0.7) {
      const newEvent: GameEvent = {
        id: Date.now().toString(),
        title: 'New Metro Line Announced!',
        description: 'Property values in suburban pincodes have surged by 5%!',
        type: 'Positive'
      };
      setEvents(prev => [newEvent, ...prev]);
    }
  };

  return (
    <div className="app-container">
      <Joyride
        steps={steps}
        run={runTour}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        disableScrolling={false}
        scrollToFirstStep={true}
        styles={{
          options: {
            primaryColor: '#ea580c',
            zIndex: 10000,
          },
          tooltip: {
            maxWidth: '350px',
            fontSize: '14px',
          }
        }}
        callback={(data) => {
          if (data.status === 'finished' || data.status === 'skipped') {
            setRunTour(false);
          }
        }}
      />
      {/* --- Sidebar Navigation --- */}
      <nav className="sidebar glass">
        <div className="logo">
          <Building2 className="logo-icon" />
          <span>Pincode Tycoon</span>
        </div>

        <div className="nav-items">
          <button
            className={`nav-item ${activeTab === 'help' ? 'active' : ''}`}
            onClick={() => setActiveTab('help')}
          >
            <Info size={20} />
            <span>Guide</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'city' ? 'active' : ''}`}
            onClick={() => setActiveTab('city')}
          >
            <MapIcon size={20} />
            <span>City Grid</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'portfolio' ? 'active' : ''}`}
            onClick={() => setActiveTab('portfolio')}
          >
            <History size={20} />
            <span>Portfolio</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'news' ? 'active' : ''}`}
            onClick={() => setActiveTab('news')}
          >
            <Bell size={20} />
            <span>Market News</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'ledger' ? 'active' : ''}`}
            onClick={() => setActiveTab('ledger')}
          >
            <History size={20} />
            <span>Ledger</span>
          </button>
        </div>

        <div className="sidebar-footer glass">
          <div className="stat">
            <span className="label">Simulation Turn</span>
            <span className="value">Quarter #{user.turn}</span>
          </div>
          <button className="btn-next-turn" onClick={nextTurn}>End Quarter</button>
        </div>
      </nav>

      {/* --- Main Content --- */}
      <main className="content">
        {/* Header / Stats Bar */}
        <header className="stats-bar glass">
          <div className="stat-card">
            <Wallet className="stat-icon cash" />
            <div className="stat-info">
              <span className="label">Liquid Cash</span>
              <span className="value">{formatCurrency(user.cash)}</span>
            </div>
          </div>
          <div className="stat-card">
            <TrendingUp className="stat-icon wealth" />
            <div className="stat-info">
              <span className="label">Total Net Worth</span>
              <span className="value">{formatCurrency(user.netWorth)}</span>
            </div>
          </div>
          <div className="stat-card">
            <Building2 className="stat-icon assets" />
            <div className="stat-info">
              <span className="label">Assets Owned</span>
              <span className="value">{user.portfolio.length}</span>
            </div>
          </div>
        </header>

        {/* Viewport */}
        <div className="viewport">
          <AnimatePresence mode="wait">
            {activeTab === 'city' && (
              <motion.div
                key="city"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid-view"
              >
                <div className="view-header">
                  <h2>Mumbai Metropolitan Region</h2>
                  <p>Drag the map to explore. Click on a building to invest!</p>
                </div>

                <div className="map-container" ref={constraintsRef}>
                  <div className="zoom-controls glass">
                    <button onClick={() => setZoom(prev => Math.min(prev + 0.2, 2))}><Plus size={20} /></button>
                    <div className="zoom-divider"></div>
                    <button onClick={recenterMap} title="Recenter"><MapPin size={20} /></button>
                    <div className="zoom-divider"></div>
                    <button onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.4))}><Minus size={20} /></button>
                  </div>
                  <motion.div
                    drag
                    dragConstraints={constraintsRef}
                    dragElastic={0.1}
                    animate={mapControls}
                    initial={{ x: 0, y: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="city-grid"
                  >
                    {CITY_MAP.map((tile) => {
                      // Skip tiles consumed by multi-tile buildings
                      if (tile.hidden) return <div key={tile.id} style={{ display: 'none' }} />;

                      const row = Math.floor(tile.id / GRID_SIZE) + 1;
                      const col = (tile.id % GRID_SIZE) + 1;
                      const spanStyle = tile.span ? {
                        gridColumn: `${col} / span ${tile.span.cols}`,
                        gridRow: `${row} / span ${tile.span.rows}`,
                        width: `${tile.span.cols * 72}px`,
                        height: `${tile.span.rows * 72}px`,
                      } : {};

                      // Commercial (multi-tile, buyable)
                      if (tile.type === 'commercial' && tile.span) {
                        return (
                          <motion.div
                            key={tile.id}
                            style={spanStyle}
                            whileHover={{ scale: 1.05, zIndex: 10, y: -5 }}
                            onClick={() => handleTileClick(tile)}
                            className="grid-tile commercial multi"
                          >
                            <Building2 size={36} strokeWidth={2} color="#ea580c" />
                            {tile.forSale && <span className="buy-pulse" />}
                          </motion.div>
                        );
                      }

                      // Mall (large multi-tile)
                      if (tile.type === 'mall' && tile.span) {
                        return (
                          <div
                            key={tile.id}
                            style={spanStyle}
                            className="grid-tile mall multi"
                          >
                            <Store size={48} strokeWidth={1.5} color="#7c3aed" />
                            <span className="mall-label">MALL</span>
                          </div>
                        );
                      }

                      // Shop (for sale, near malls)
                      if (tile.type === 'shop') {
                        return (
                          <motion.div
                            key={tile.id}
                            whileHover={{ scale: 1.15, zIndex: 10, y: -5 }}
                            onClick={() => handleTileClick(tile)}
                            className="grid-tile shop"
                          >
                            <ShoppingBag size={22} strokeWidth={2.5} color="#7c3aed" />
                            <span className="buy-pulse shop-pulse" />
                          </motion.div>
                        );
                      }

                      // Under-construction (multi-tile with crane)
                      if (tile.type === 'under-construction' && tile.span) {
                        return (
                          <motion.div
                            key={tile.id}
                            style={spanStyle}
                            className="grid-tile under-construction multi"
                          >
                            <Construction size={36} strokeWidth={2} color="#64748b" />
                            <div className="crane-overlay" />
                          </motion.div>
                        );
                      }

                      // Buyable property (pulsing marker)
                      if (tile.type === 'buyable') {
                        return (
                          <motion.div
                            key={tile.id}
                            whileHover={{ scale: 1.15, zIndex: 10, y: -5 }}
                            onClick={() => handleTileClick(tile)}
                            className="grid-tile buyable"
                          >
                            <ShoppingBag size={26} strokeWidth={2.5} color="#16a34a" />
                            <span className="buy-pulse" />
                          </motion.div>
                        );
                      }

                      // Regular residential (single or multi-tile, info only)
                      if (tile.type === 'residential') {
                        const isMulti = !!tile.span;
                        return (
                          <motion.div
                            key={tile.id}
                            style={isMulti ? spanStyle : {}}
                            whileHover={{ scale: isMulti ? 1.05 : 1.1, zIndex: 10, y: -5 }}
                            onClick={() => handleTileClick(tile)}
                            className={`grid-tile residential ${isMulti ? 'multi' : ''}`}
                          >
                            {isMulti
                              ? <Building2 size={32} strokeWidth={2} color="#0369a1" />
                              : <Home size={24} strokeWidth={2.5} color="#0369a1" />
                            }
                          </motion.div>
                        );
                      }

                      // Directional roads
                      if (tile.type === 'road-h') return <div key={tile.id} className="road road-h" />;
                      if (tile.type === 'road-v') return <div key={tile.id} className="road road-v" />;
                      if (tile.type === 'road-cross') return <div key={tile.id} className="road road-cross" />;

                      // Parks (single or multi-tile)
                      if (tile.type === 'park') {
                        const isMulti = !!tile.span;
                        return (
                          <div
                            key={tile.id}
                            className={`park ${isMulti ? 'park-big' : ''}`}
                            style={isMulti ? spanStyle : {}}
                          >
                            <TreePine size={isMulti ? 40 : 28} color="#16a34a" />
                          </div>
                        );
                      }

                      return <div key={tile.id} className="ground-tile" />;
                    })}
                  </motion.div>
                </div>
              </motion.div>
            )}

            {activeTab === 'portfolio' && (
              <motion.div
                key="portfolio"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="portfolio-view"
              >
                <h2>My Assets</h2>
                {user.portfolio.length === 0 ? (
                  <div className="empty-state glass">
                    <Info size={48} />
                    <p>No properties owned yet. Head to the City Grid to start investing!</p>
                  </div>
                ) : (
                  <div className="portfolio-list">
                    {user.portfolio.map((p, idx) => (
                      <motion.div
                        key={idx}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => {
                          setViewMode('sell');
                          setSelectedProperty(p);
                        }}
                        className="portfolio-item glass clickable"
                      >
                        <div className="item-main">
                          <Building2 size={24} className="item-icon" />
                          <div>
                            <h4>{p.description}</h4>
                            <p>{p.pincode} • {p.type}</p>
                          </div>
                        </div>
                        <div className="item-stats">
                          <div className="p-stat">
                            <span className="label">Current Value</span>
                            <span className="value">{formatCurrency(p.price)}</span>
                          </div>
                          <div className="p-stat">
                            <span className="label">Monthly Rent</span>
                            <span className="value">{formatCurrency(p.rent)}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'news' && (
              <motion.div
                key="news"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="news-view"
              >
                <h2>Market News Feed</h2>
                {events.length === 0 ? (
                  <p className="empty-news">No major events this quarter. The market is stable.</p>
                ) : (
                  <div className="news-list">
                    {events.map(e => (
                      <div key={e.id} className={`news-item glass ${e.type.toLowerCase()}`}>
                        <h4>{e.title}</h4>
                        <p>{e.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'ledger' && (
              <motion.div
                key="ledger"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="ledger-view"
              >
                <h2>Transaction History</h2>
                <div className="ledger-list glass">
                  {user.transactions.length === 0 ? (
                    <p className="empty-state">No transactions recorded yet.</p>
                  ) : (
                    <table className="ledger-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Description</th>
                          <th className="amount">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {user.transactions.map(t => (
                          <tr key={t.id}>
                            <td className="ts">{t.timestamp}</td>
                            <td><span className={`t-badge ${t.type.toLowerCase()}`}>{t.type}</span></td>
                            <td className="desc">{t.description}</td>
                            <td className={`amount ${t.amount >= 0 ? 'pos' : 'neg'}`}>
                              {t.amount >= 0 ? '+' : ''}{formatCurrency(t.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </motion.div>
            )}
            {activeTab === 'help' && (
              <motion.div
                key="help"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="help-view"
              >
                <div className="help-hero glass">
                  <h1>Pincode Tycoon: Mumbai Edition</h1>
                  <p>Master the art of real estate investment in the world's most dynamic property market.</p>
                </div>

                <div className="help-grid">
                  <div className="help-card glass">
                    <h3>🎯 The Objective</h3>
                    <p>Master the market! Your goal is to <strong>maximize your Net Worth</strong> by the end of <strong>20 Quarters</strong> (5 Years).</p>
                  </div>

                  <div className="help-card glass">
                    <h3>🏢 Residential vs. Commercial</h3>
                    <ul>
                      <li><strong>Residential (Flats/Villas):</strong> Lower rent but "safer" with consistent occupancy.</li>
                      <li><strong>Commercial (Shops/Offices):</strong> Higher rent but riskier; businesses can leave, causing <strong>Vacancies</strong>.</li>
                    </ul>
                  </div>

                  <div className="help-card glass">
                    <h3>🏗️ Project Status</h3>
                    <ul>
                      <li><strong>Ready-to-Move:</strong> Start earning rent immediately, but costs more to buy.</li>
                      <li><strong>Under-Construction:</strong> Cheaper with high appreciation upside, but carries a <strong>"Risk of Delay"</strong>.</li>
                    </ul>
                  </div>

                  <div className="help-card glass">
                    <h3>📈 Appreciation & Infra</h3>
                    <p>Driven by <strong>Infrastructure Development</strong>. Properties near new Metro stations, Airports, or Highways gain value much faster.</p>
                  </div>

                  <div className="help-card glass warning">
                    <h3>⚠️ The "Sticker Price" Trap</h3>
                    <ul>
                      <li><strong>Stamp Duty:</strong> An extra <strong>5%–7%</strong> paid to the government for legal registration.</li>
                      <li><strong>Maintenance (HOA):</strong> Monthly fees for security and cleaning. <strong>Paid even if the property is empty!</strong></li>
                      <li><strong>Property Tax:</strong> Annual tax paid to the local Municipal Corporation (BMC/BBMP).</li>
                    </ul>
                  </div>

                  <div className="help-card glass danger">
                    <h3>🛡️ Legal Guard: RERA</h3>
                    <p>Only buy <strong>RERA-Registered</strong> properties. If you buy "Non-RERA" because it's cheap, there is a significant risk the developer disappears with your money.</p>
                  </div>

                  <div className="help-card glass info">
                    <h3>📐 Carpet vs. Super Built-up</h3>
                    <ul>
                      <li><strong>Carpet Area:</strong> The actual floor space you can walk on. Legally, this is what you pay for.</li>
                      <li><strong>Built-up Area:</strong> Carpet area + walls + balconies.</li>
                      <li><strong>Super Built-up Area:</strong> Includes common lobbies, gyms, and elevators. Often used to inflate quotes!</li>
                    </ul>
                  </div>

                  <div className="help-card glass">
                    <h3>🏛️ Builder History</h3>
                    <p>Not all builders are equal. Look at the <strong>Builder Trust Score</strong>. A higher score means the builder has a history of delivering projects on time and with high quality.</p>
                  </div>

                  <div className="help-card glass">
                    <h3>🏦 Private vs. Govt (MHADA)</h3>
                    <ul>
                      <li><strong>Private:</strong> Often comes with more amenities but can be pricier and riskier.</li>
                      <li><strong>Government (MHADA):</strong> Usually cheaper and safer in terms of legal titles, but might have basic amenities and slower appreciation.</li>
                    </ul>
                  </div>

                  <div className="help-card glass danger">
                    <h3>💀 Bankruptcy & Liquidation</h3>
                    <p>If your cash drops below ₹0, your assets will be sold at a <strong>10% discount</strong>. You lose if your Net Worth hits zero!</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Property Detail Modal */}
        {/* Property Detail Modal */}
        <AnimatePresence>
          {selectedProperty && (
            <PropertyDetail
              property={selectedProperty}
              userCash={user.cash}
              onClose={() => setSelectedProperty(null)}
              onBuy={handleBuy}
              onSell={handleSell}
              viewMode={viewMode}
            />
          )}
        </AnimatePresence>

        {/* GameOver Overlay */}
        <AnimatePresence>
          {gameState === 'lost' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="game-over-overlay"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="game-over-card glass"
              >
                <AlertTriangle size={64} color="#ef4444" />
                <h2>Market Bankruptcy!</h2>
                <p>
                  {user.netWorth < 0
                    ? "Your net worth has dropped below zero. The bank has seized your remaining assets."
                    : "You failed to reach the 1 Crore net worth goal by Quarter 20. Your investors have pulled out."}
                </p>
                <div className="final-stats">
                  <div className="f-stat">
                    <span>Final Net Worth</span>
                    <strong>{formatCurrency(user.netWorth)}</strong>
                  </div>
                  <div className="f-stat">
                    <span>Quarters Survived</span>
                    <strong>{user.turn}</strong>
                  </div>
                </div>
                <button className="btn-restart" onClick={restartGame}>Try Again</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;
