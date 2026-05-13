import React from 'react';
import { 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  TrendingUp,
  Home,
  Ruler,
  IndianRupee,
  Wrench,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';

interface PropertyDetailProps {
  property: any;
  onClose: () => void;
  onBuy: (property: any) => void;
  onSell?: (property: any) => void;
  userCash: number;
  viewMode: 'buy' | 'info' | 'sell';
}

const fmt = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
};

const PropertyDetail: React.FC<PropertyDetailProps> = ({ property, onClose, onBuy, onSell, userCash, viewMode }) => {
  const stampDuty = property.price * 0.06;
  const totalCost = property.price + stampDuty;
  const canAfford = userCash >= totalCost;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-overlay"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.92, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="prop-card"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button className="prop-close" onClick={onClose}><X size={20} /></button>

        {/* Top: Badges */}
        <div className="prop-badges">
          <span className={`prop-badge ${property.type === 'Commercial' ? 'badge-orange' : 'badge-blue'}`}>
            {property.type}
          </span>
          {viewMode === 'buy' ? (
            <span className="prop-badge badge-green">For Sale</span>
          ) : viewMode === 'sell' ? (
            <span className="prop-badge badge-blue">Owned</span>
          ) : (
            <span className="prop-badge badge-gray">Not For Sale</span>
          )}
          {property.isRERA ? (
            <span className="prop-badge badge-outline-green"><ShieldCheck size={12} /> RERA</span>
          ) : (
            <span className="prop-badge badge-outline-red"><ShieldAlert size={12} /> No RERA</span>
          )}
        </div>

        {/* Title */}
        <h2 className="prop-title">{property.description}</h2>
        <p className="prop-pincode">📍 {property.pincode}</p>

        {/* Hero Price */}
        <div className="prop-hero">
          <span className="prop-hero-price">{fmt(property.price)}</span>
          <span className="prop-hero-sub">{fmt(property.rent)}/mo rent</span>
        </div>

        {viewMode === 'buy' ? (
          <>
            {/* Stats Grid */}
            <div className="prop-stats">
              <div className="prop-stat">
                <Ruler size={16} className="prop-stat-icon" />
                <span className="prop-stat-val">{property.carpetArea}</span>
                <span className="prop-stat-label">Carpet sq.ft</span>
              </div>
              <div className="prop-stat">
                <Home size={16} className="prop-stat-icon" />
                <span className="prop-stat-val">{property.superArea}</span>
                <span className="prop-stat-label">Super Built-up</span>
              </div>
              <div className="prop-stat">
                <Info size={16} className="prop-stat-icon" />
                <span className="prop-stat-val">{Math.round(((property.superArea - property.carpetArea) / property.superArea) * 100)}%</span>
                <span className="prop-stat-label">Loading Factor</span>
              </div>
              <div className="prop-stat">
                <Wrench size={16} className="prop-stat-icon" />
                <span className="prop-stat-val">{fmt(property.maintenance)}</span>
                <span className="prop-stat-label">Maint./mo</span>
              </div>
              <div className="prop-stat">
                <ShieldCheck size={16} className="prop-stat-icon" />
                <span className="prop-stat-val">{property.trustScore}%</span>
                <span className="prop-stat-label">Builder Trust</span>
              </div>
            </div>

            {/* Cost Summary */}
            <div className="prop-cost">
              <div className="prop-cost-row">
                <span>Price</span>
                <span>{fmt(property.price)}</span>
              </div>
              <div className="prop-cost-row">
                <span>+ Stamp Duty (6%)</span>
                <span>{fmt(stampDuty)}</span>
              </div>
              <div className="prop-cost-row prop-cost-total">
                <span>Total</span>
                <span>{fmt(totalCost)}</span>
              </div>
            </div>

            {/* Buy Button */}
            <button 
              className={`prop-buy ${!canAfford ? 'prop-buy-disabled' : ''}`}
              disabled={!canAfford}
              onClick={() => onBuy(property)}
            >
              {canAfford ? 'Buy Property' : 'Not Enough Cash'}
            </button>
          </>
        ) : viewMode === 'sell' ? (
          <>
            {/* Stats Grid */}
            <div className="prop-stats">
              <div className="prop-stat">
                <Ruler size={16} className="prop-stat-icon" />
                <span className="prop-stat-val">{property.carpetArea}</span>
                <span className="prop-stat-label">Carpet sq.ft</span>
              </div>
              <div className="prop-stat">
                <Home size={16} className="prop-stat-icon" />
                <span className="prop-stat-val">{property.superArea}</span>
                <span className="prop-stat-label">Built-up sq.ft</span>
              </div>
              <div className="prop-stat">
                <Wrench size={16} className="prop-stat-icon" />
                <span className="prop-stat-val">{fmt(property.maintenance)}</span>
                <span className="prop-stat-label">Maint./mo</span>
              </div>
            </div>

            <div className="prop-cost">
              <div className="prop-cost-row">
                <span>Current Market Value</span>
                <span>{fmt(property.price)}</span>
              </div>
              <div className="prop-cost-row">
                <span>Monthly Rent Income</span>
                <span style={{ color: '#16a34a' }}>+ {fmt(property.rent)}</span>
              </div>
            </div>

            <button 
              className="prop-buy" 
              style={{ background: 'linear-gradient(135deg, #64748b, #334155)' }}
              onClick={() => onSell && onSell(property)}
            >
              Sell Property
            </button>
          </>
        ) : (
          <p className="prop-info-note">
            <Info size={14} /> This property is not for sale.
          </p>
        )}
      </motion.div>
    </motion.div>
  );
};

export default PropertyDetail;
