const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  assetType: {
    type: String,
    enum: ['crypto', 'stock', 'etf', 'mutual-fund'],
    default: 'crypto',
    required: true
  },
  coinId: {
    type: String,
    required: [true, 'Coin ID is required'],
    trim: true,
    lowercase: true,
    enum: ['bitcoin', 'ethereum', 'tether', 'bnb', 'solana', 'ripple']
  },
  coinName: {
    type: String,
    required: [true, 'Coin name is required'],
    trim: true
  },
  symbol: {
    type: String,
    required: [true, 'Symbol is required'],
    trim: true,
    uppercase: true,
    enum: ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP']
  },
  // Amount in user's local currency (PKR)
  investedAmount: {
    type: Number,
    required: [true, 'Invested amount is required'],
    min: [0.01, 'Invested amount must be greater than 0']
  },
  // Original currency of investment (PKR, USD, etc.)
  originalCurrency: {
    type: String,
    required: true,
    default: 'PKR',
    enum: ['PKR', 'USD', 'EUR', 'GBP']
  },
  // Exchange rate at time of purchase (local to USD)
  exchangeRate: {
    type: Number,
    required: true,
    default: 280 // Default PKR to USD rate
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.00000001, 'Quantity must be greater than 0']
  },
  // Purchase price in USD (for consistent calculations)
  purchasePriceUSD: {
    type: Number,
    required: [true, 'Purchase price is required'],
    min: [0.00000001, 'Purchase price must be greater than 0']
  },
  // Purchase price in local currency
  purchasePriceLocal: {
    type: Number,
    required: [true, 'Purchase price in local currency is required']
  },
  purchaseDate: {
    type: Date,
    required: [true, 'Purchase date is required'],
    default: Date.now
  },
  sellDate: {
    type: Date
  },
  sellPriceUSD: {
    type: Number
  },
  sellPriceLocal: {
    type: Number
  },
  sellQuantity: {
    type: Number
  },
  realizedProfitLoss: {
    type: Number,
    default: 0
  },
  realizedProfitLossPercentage: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['active', 'sold', 'partial'],
    default: 'active'
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
// investmentSchema.index({ userId: 1, coinId: 1 });
// investmentSchema.index({ userId: 1, purchaseDate: -1 });
// investmentSchema.index({ userId: 1, status: 1 });

// Virtual for current value in USD (will be populated by service)
investmentSchema.virtual('currentValueUSD').get(function() {
  return this.currentPriceUSD ? this.quantity * this.currentPriceUSD : null;
});

// Virtual for current value in local currency
investmentSchema.virtual('currentValueLocal').get(function() {
  return this.currentPriceLocal ? this.quantity * this.currentPriceLocal : null;
});

// Virtual for unrealized profit/loss in USD
investmentSchema.virtual('unrealizedProfitLossUSD').get(function() {
  if (!this.currentValueUSD || !this.investedAmount || !this.exchangeRate) return null;
  const investedAmountUSD = this.investedAmount / this.exchangeRate;
  return this.currentValueUSD - investedAmountUSD;
});

// Virtual for unrealized profit/loss in local currency
investmentSchema.virtual('unrealizedProfitLossLocal').get(function() {
  if (!this.currentValueLocal) return null;
  return this.currentValueLocal - this.investedAmount;
});

// Virtual for unrealized profit/loss percentage
investmentSchema.virtual('unrealizedProfitLossPercentage').get(function() {
  if (!this.unrealizedProfitLossUSD || !this.investedAmount || !this.exchangeRate) return null;
  const investedAmountUSD = this.investedAmount / this.exchangeRate;
  return (this.unrealizedProfitLossUSD / investedAmountUSD) * 100;
});

// Pre-save middleware to calculate purchase prices
investmentSchema.pre('save', async function(next) {
  if (this.isModified('investedAmount') || this.isModified('quantity') || 
      this.isModified('originalCurrency')) {
    
    // Calculate purchase price in local currency
    if (this.investedAmount && this.quantity) {
      this.purchasePriceLocal = this.investedAmount / this.quantity;
    }
    
    // Calculate purchase price in USD
    if (this.purchasePriceLocal && this.exchangeRate) {
      this.purchasePriceUSD = this.purchasePriceLocal / this.exchangeRate;
    }
  }
  
  // Update status based on sell data
  if (this.sellDate && this.sellQuantity) {
    if (this.sellQuantity >= this.quantity) {
      this.status = 'sold';
    } else {
      this.status = 'partial';
    }
  }
  
  next();
});

module.exports = mongoose.model('Investment', investmentSchema);