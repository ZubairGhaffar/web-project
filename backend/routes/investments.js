const express = require('express');
const router = express.Router();
const Investment = require('../models/Investment');
const coinService = require('../services/coinService');
const currencyService = require('../services/currencyService');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

// Validation middleware for adding investment
const validateInvestment = [
  body('coinId').isIn(['bitcoin', 'ethereum', 'tether', 'bnb', 'solana', 'ripple'])
    .withMessage('Invalid coin selection'),
  body('investedAmount').isFloat({ min: 0.01 })
    .withMessage('Invested amount must be greater than 0'),
  body('quantity').isFloat({ min: 0.00000001 })
    .withMessage('Quantity must be greater than 0'),
  body('originalCurrency').optional().isIn(['PKR', 'USD', 'EUR', 'GBP'])
    .withMessage('Invalid currency'),
  body('purchaseDate').optional().isISO8601()
    .withMessage('Invalid date format'),
  body('notes').optional().trim().isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

// Validation middleware for selling
const validateSell = [
  body('sellQuantity').isFloat({ min: 0.00000001 })
    .withMessage('Sell quantity must be greater than 0'),
  body('sellPriceLocal').isFloat({ min: 0.00000001 })
    .withMessage('Sell price must be greater than 0'),
  body('sellDate').isISO8601()
    .withMessage('Invalid sell date format')
];

// GET all investments with analytics
// GET all investments with analytics
router.get('/', auth, async (req, res) => {
  try {
    const investments = await Investment.find({ 
      userId: req.user._id
    }).sort({ purchaseDate: -1 });

    // Get user's currency preference
    const userCurrency = 'PKR';
    
    // Get current exchange rate
    const exchangeRate = await currencyService.convert(1, 'USD', userCurrency);
    
    // Enrich investments with current market data
    const enrichedInvestments = await coinService.enrichInvestments(investments, userCurrency);
    
    // Get portfolio analytics
    let analytics;
    try {
      analytics = await coinService.getPortfolioAnalytics(investments, userCurrency);
    } catch (analyticsError) {
      console.error('Analytics error:', analyticsError);
      analytics = {
        totalInvested: 0,
        totalCurrentValue: 0,
        totalProfitLoss: 0,
        totalProfitLossPercentage: 0,
        bestPerformer: null,
        worstPerformer: null,
        count: investments.length,
        coinBreakdown: [],
        allocation: {}
      };
    }
    
    res.json({
      success: true,
      count: enrichedInvestments.length,
      investments: enrichedInvestments,
      analytics: analytics,
      exchangeRate: exchangeRate,
      userCurrency: userCurrency
    });
  } catch (error) {
    console.error('Get investments error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch investments',
      message: error.message 
    });
  }
});

// GET investment summary
router.get('/summary', auth, async (req, res) => {
  try {
    const investments = await Investment.find({ 
      userId: req.user._id,
      status: { $in: ['active', 'partial'] }
    });

    const userCurrency = 'PKR';
    
    // Calculate basic summary
    let totalInvested = 0;
    let totalCurrentValue = 0;
    
    investments.forEach(inv => {
      totalInvested += inv.investedAmount;
      
      // For now, use invested amount as current value (will be updated by frontend)
      // In production, you would call coinService.enrichInvestments
      totalCurrentValue += inv.investedAmount;
    });
    
    const totalProfitLoss = totalCurrentValue - totalInvested;
    const totalProfitLossPercentage = totalInvested > 0 
      ? (totalProfitLoss / totalInvested) * 100 
      : 0;
    
    const summary = {
      totalInvested,
      totalCurrentValue,
      totalProfitLoss,
      totalProfitLossPercentage,
      count: investments.length,
      userCurrency: userCurrency
    };
    
    res.json({
      success: true,
      summary: summary
    });
  } catch (error) {
    console.error('Get investment summary error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch investment summary',
      message: error.message 
    });
  }
});

// GET exchange rate - Updated version
router.get('/exchange-rate', auth, async (req, res) => {
  try {
    const userCurrency = 'PKR'; // Always PKR
    
    // Try to get live rate first
    let rate;
    try {
      rate = await currencyService.getRate('USD', 'PKR');
    } catch (apiError) {
      console.warn('Currency API failed, using fallback rate:', apiError.message);
      // Use fallback rate for PKR
      rate = 280; // Fixed fallback for PKR
    }
    
    res.json({
      success: true,
      rate: rate,
      from: 'USD',
      to: 'PKR',
      timestamp: new Date(),
      source: 'live'
    });
  } catch (error) {
    console.error('Get exchange rate error:', error);
    
    // Always return fallback rate for PKR
    res.json({
      success: true,
      rate: 280, // Fallback rate for PKR
      from: 'USD',
      to: 'PKR',
      timestamp: new Date(),
      source: 'fallback'
    });
  }
});


// GET single investment with detailed analytics
router.get('/:id', auth, async (req, res) => {
  try {
    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!investment) {
      return res.status(404).json({
        success: false,
        error: 'Investment not found'
      });
    }

    const userCurrency =  'PKR';
    const enrichedInvestment = (await coinService.enrichInvestments([investment], userCurrency))[0];
    
    // Get historical data for charts
    let historicalData = null;
    try {
      historicalData = await coinService.getHistoricalData(investment.coinId, 30);
    } catch (error) {
      console.error('Historical data error:', error.message);
    }
    
    // Calculate holding period
    const purchaseDate = new Date(investment.purchaseDate);
    const daysHeld = Math.floor((new Date() - purchaseDate) / (1000 * 60 * 60 * 24));
    
    res.json({
      success: true,
      investment: enrichedInvestment,
      historicalData: historicalData,
      holdingPeriod: {
        days: daysHeld,
        months: Math.floor(daysHeld / 30),
        years: Math.floor(daysHeld / 365)
      },
      userCurrency: userCurrency
    });
  } catch (error) {
    console.error('Get single investment error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch investment' 
    });
  }
});

// POST create new investment (in PKR)
router.post('/', auth, validateInvestment, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }

  try {
    const userCurrency = 'PKR';
    
    // Get current exchange rate
    const exchangeRate = await currencyService.convert(1, 'USD', 'PKR');
    
    // Get coin details
    const supportedCoins = await coinService.getSupportedCoins();
    const selectedCoin = supportedCoins.find(c => c.id === req.body.coinId);
    
    if (!selectedCoin) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coin selected'
      });
    }

    // Get current market price in USD
    const prices = await coinService.getPrices([req.body.coinId], 'USD');
    const currentPriceUSD = prices[req.body.coinId]?.usd;
    
    if (!currentPriceUSD) {
      return res.status(400).json({
        success: false,
        error: 'Unable to fetch current market price'
      });
    }

    const investmentData = {
  ...req.body,
  userId: req.user._id,
  assetType: 'crypto',
  coinName: selectedCoin.name,
  symbol: selectedCoin.symbol,
  originalCurrency: 'PKR', // Always PKR
  exchangeRate: exchangeRate,
  purchasePriceUSD: currentPriceUSD,
  purchasePriceLocal: (req.body.investedAmount / req.body.quantity),
  purchaseDate: req.body.purchaseDate ? new Date(req.body.purchaseDate) : new Date(),
  status: 'active'
};

    const investment = new Investment(investmentData);
    await investment.save();

    // Enrich with current market data
    const enrichedInvestment = (await coinService.enrichInvestments([investment], userCurrency))[0];

    res.status(201).json({
      success: true,
      message: 'Investment added successfully',
      investment: enrichedInvestment,
      exchangeRate: exchangeRate
    });
  } catch (error) {
    console.error('Create investment error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({ 
      success: false,
      error: 'Failed to create investment' 
    });
  }
});

// POST sell investment (partial or full)
router.post('/:id/sell', auth, validateSell, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }

  try {
    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: { $in: ['active', 'partial'] }
    });

    if (!investment) {
      return res.status(404).json({
        success: false,
        error: 'Investment not found or already sold'
      });
    }

    const userCurrency =  'PKR';
    const { sellQuantity, sellPriceLocal, sellDate } = req.body;
    
    // Validate sell quantity
    if (sellQuantity > investment.quantity) {
      return res.status(400).json({
        success: false,
        error: `Cannot sell more than ${investment.quantity} ${investment.symbol}`
      });
    }

    // Get current exchange rate
    const exchangeRate = await currencyService.convert(1, 'USD', userCurrency);
    const sellPriceUSD = sellPriceLocal / exchangeRate;
    
    // Calculate realized profit/loss
    const soldAmountLocal = sellQuantity * sellPriceLocal;
    const investedAmountLocal = (sellQuantity / investment.quantity) * investment.investedAmount;
    const realizedProfitLossLocal = soldAmountLocal - investedAmountLocal;
    
    const investedAmountUSD = investedAmountLocal / investment.exchangeRate;
    const realizedProfitLossUSD = (sellQuantity * sellPriceUSD) - investedAmountUSD;
    const realizedProfitLossPercentage = (realizedProfitLossUSD / investedAmountUSD) * 100;

    // Update investment
    investment.sellDate = new Date(sellDate);
    investment.sellPriceLocal = sellPriceLocal;
    investment.sellPriceUSD = sellPriceUSD;
    investment.sellQuantity = sellQuantity;
    investment.realizedProfitLoss = realizedProfitLossLocal;
    investment.realizedProfitLossPercentage = realizedProfitLossPercentage;
    
    if (sellQuantity >= investment.quantity) {
      investment.status = 'sold';
    } else {
      investment.status = 'partial';
      // Reduce remaining quantity and invested amount proportionally
      const remainingPercentage = 1 - (sellQuantity / investment.quantity);
      investment.quantity = investment.quantity - sellQuantity;
      investment.investedAmount = investment.investedAmount * remainingPercentage;
    }

    await investment.save();

    // Enrich with current market data
    const enrichedInvestment = (await coinService.enrichInvestments([investment], userCurrency))[0];

    res.json({
      success: true,
      message: 'Investment sold successfully',
      investment: enrichedInvestment,
      saleSummary: {
        quantitySold: sellQuantity,
        saleAmountLocal: soldAmountLocal,
        saleAmountUSD: sellQuantity * sellPriceUSD,
        realizedProfitLossLocal: realizedProfitLossLocal,
        realizedProfitLossUSD: realizedProfitLossUSD,
        realizedProfitLossPercentage: realizedProfitLossPercentage
      }
    });
  } catch (error) {
    console.error('Sell investment error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to sell investment' 
    });
  }
});

// DELETE investment
router.delete('/:id', auth, async (req, res) => {
  try {
    const investment = await Investment.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!investment) {
      return res.status(404).json({
        success: false,
        error: 'Investment not found'
      });
    }

    res.json({
      success: true,
      message: 'Investment deleted successfully'
    });
  } catch (error) {
    console.error('Delete investment error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete investment' 
    });
  }
});

// GET supported coins
router.get('/coins/supported', auth, async (req, res) => {
  try {
    const coins = await coinService.getSupportedCoins();
    res.json({
      success: true,
      coins: coins
    });
  } catch (error) {
    console.error('Get supported coins error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch supported coins' 
    });
  }
});


// GET batch prices with caching
router.get('/prices/batch', auth, async (req, res) => {
  try {
    const { coinIds = [] } = req.query;
    
    if (!Array.isArray(coinIds)) {
      return res.status(400).json({ 
        success: false,
        error: 'coinIds must be an array' 
      });
    }
    
    const prices = await coinService.getPrices(coinIds, 'PKR');
    
    res.json({
      success: true,
      prices,
      timestamp: new Date(),
      source: 'cached'
    });
  } catch (error) {
    console.error('Batch prices error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch prices' 
    });
  }
});

// POST batch prices (for frontend to send multiple coin IDs)
router.post('/prices/batch', auth, async (req, res) => {
  try {
    const { coinIds = [] } = req.body;
    
    const prices = await coinService.getPrices(coinIds, 'PKR');
    
    res.json({
      success: true,
      prices,
      timestamp: new Date(),
      source: 'batch'
    });
  } catch (error) {
    console.error('Batch prices error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch prices' 
    });
  }
});


module.exports = router;