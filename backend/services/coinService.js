const axios = require('axios');
const NodeCache = require('node-cache');
const currencyService = require('./currencyService');

class CoinService {
  constructor() {
    this.api = axios.create({
      baseURL: 'https://api.coingecko.com/api/v3'
    });
    
    // Cache for 1 minute
    this.cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });
    
    this.supportedCoins = [
      { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', color: '#F7931A' },
      { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', color: '#627EEA' },
      { id: 'tether', name: 'Tether', symbol: 'USDT', color: '#26A17B' },
      { id: 'bnb', name: 'BNB', symbol: 'BNB', color: '#F0B90B' },
      { id: 'solana', name: 'Solana', symbol: 'SOL', color: '#00FFA3' },
      { id: 'ripple', name: 'XRP', symbol: 'XRP', color: '#23292F' }
    ];
  }

  async getPrices(coinIds, userCurrency = 'USD', forceRefresh = false) {
    const cacheKey = `prices_${userCurrency}_${coinIds.sort().join('_')}`;
    
    // Return cached data if available
    if (!forceRefresh) {
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        console.log('Returning cached prices');
        return cachedData;
      }
    }
    
    try {
      const validIds = [...new Set(coinIds)]
        .filter(id => id && typeof id === 'string')
        .filter(id => this.supportedCoins.some(coin => coin.id === id.toLowerCase()));
      
      if (validIds.length === 0) {
        return this.getFallbackPrices(coinIds, userCurrency);
      }

      console.log('Fetching fresh prices for:', validIds);

      const response = await this.api.get('/simple/price', {
        params: {
          ids: validIds.join(','),
          vs_currencies: 'usd',
          include_24hr_change: true
        }
      });

      if (!response.data || Object.keys(response.data).length === 0) {
        console.error('Empty response from CoinGecko API');
        return this.getFallbackPrices(coinIds, userCurrency);
      }

      let result;
      if (userCurrency !== 'USD') {
        let exchangeRate;
        try {
          exchangeRate = await currencyService.convert(1, 'USD', userCurrency);
        } catch (error) {
          console.error('Currency conversion error:', error);
          exchangeRate = 280; // Fallback for PKR
        }
        
        result = {};
        for (const [coinId, data] of Object.entries(response.data)) {
          result[coinId] = {
            usd: data.usd,
            usd_24h_change: data.usd_24h_change,
            local: data.usd * exchangeRate,
            exchange_rate: exchangeRate
          };
        }
      } else {
        result = response.data;
      }

      // Cache the result
      this.cache.set(cacheKey, result);
      
      return result;
      
    } catch (error) {
      console.error('CoinGecko API Error:', error.message);
      
      // Return cached data if available
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        console.log('API failed, returning stale cached data');
        return cachedData;
      }
      
      return this.getFallbackPrices(coinIds, userCurrency);
    }
  }

  getFallbackPrices(coinIds, userCurrency) {
    console.log('Using fallback prices');
    
    const fallbackPrices = {
      'bitcoin': { usd: 45000, usd_24h_change: 0.5, local: 45000 * 280 },
      'ethereum': { usd: 3000, usd_24h_change: 1.2, local: 3000 * 280 },
      'tether': { usd: 1, usd_24h_change: 0, local: 280 },
      'bnb': { usd: 350, usd_24h_change: -0.5, local: 350 * 280 },
      'solana': { usd: 100, usd_24h_change: 2.5, local: 100 * 280 },
      'ripple': { usd: 0.5, usd_24h_change: -1.5, local: 0.5 * 280 }
    };
    
    const result = {};
    coinIds.forEach(id => {
      if (fallbackPrices[id]) {
        result[id] = userCurrency === 'USD' 
          ? { usd: fallbackPrices[id].usd, usd_24h_change: fallbackPrices[id].usd_24h_change }
          : fallbackPrices[id];
      }
    });
    
    return result;
  }

  async getSupportedCoins() {
    return this.supportedCoins;
  }

  async enrichInvestments(investments, userCurrency = 'USD') {
    if (!investments || investments.length === 0) {
      return [];
    }

    // Extract unique coin IDs
    const coinIds = [...new Set(investments.map(inv => inv.coinId))];
    
    // Fetch all prices in one API call
    const prices = await this.getPrices(coinIds, userCurrency);
    const exchangeRate = userCurrency !== 'USD' 
      ? (prices[coinIds[0]]?.exchange_rate || 280) 
      : 1;
    
    // Enrich investments
    return investments.map(investment => {
      const coinData = prices[investment.coinId];
      const coinInfo = this.supportedCoins.find(c => c.id === investment.coinId);
      
      if (!coinData) {
        return this.createInvestmentWithFallback(investment, userCurrency);
      }

      const currentPriceUSD = coinData.usd;
      const currentPriceLocal = userCurrency === 'USD' 
        ? currentPriceUSD 
        : (coinData.local || currentPriceUSD * exchangeRate);
      
      return this.calculateInvestmentMetrics(investment, {
        currentPriceUSD,
        currentPriceLocal,
        priceChange24h: coinData.usd_24h_change || 0,
        coinInfo,
        exchangeRate
      });
    });
  }

  createInvestmentWithFallback(investment, userCurrency) {
    const fallbackPrice = this.getFallbackPrices([investment.coinId], userCurrency)[investment.coinId];
    const currentPriceUSD = fallbackPrice?.usd || 0;
    const currentPriceLocal = userCurrency === 'USD' 
      ? currentPriceUSD 
      : (fallbackPrice?.local || currentPriceUSD * 280);
    
    return this.calculateInvestmentMetrics(investment, {
      currentPriceUSD,
      currentPriceLocal,
      priceChange24h: fallbackPrice?.usd_24h_change || 0,
      coinInfo: this.supportedCoins.find(c => c.id === investment.coinId),
      exchangeRate: 280
    });
  }

  calculateInvestmentMetrics(investment, data) {
    const currentValueUSD = investment.quantity * data.currentPriceUSD;
    const currentValueLocal = investment.quantity * data.currentPriceLocal;
    
    const investedAmountUSD = investment.originalCurrency === 'USD' 
      ? investment.investedAmount 
      : investment.investedAmount / (investment.exchangeRate || 280);
    
    const profitLossUSD = currentValueUSD - investedAmountUSD;
    const profitLossLocal = currentValueLocal - investment.investedAmount;
    const profitLossPercentage = investedAmountUSD > 0 
      ? (profitLossUSD / investedAmountUSD) * 100 
      : 0;

    return {
      ...investment.toObject ? investment.toObject() : investment,
      coinInfo: data.coinInfo,
      currentPrice: data.currentPriceUSD,
      currentPriceLocal: data.currentPriceLocal,
      priceChange24h: data.priceChange24h,
      currentValue: currentValueUSD,
      currentValueLocal,
      profitLoss: profitLossUSD,
      profitLossLocal,
      profitLossPercentage,
      exchangeRate: data.exchangeRate
    };
  }

  async getPortfolioAnalytics(investments, userCurrency = 'USD') {
    const enrichedInvestments = await this.enrichInvestments(investments, userCurrency);
    
    if (enrichedInvestments.length === 0) {
      return {
        totalInvested: 0,
        totalCurrentValue: 0,
        totalProfitLoss: 0,
        totalProfitLossPercentage: 0,
        bestPerformer: null,
        worstPerformer: null,
        count: 0,
        coinBreakdown: [],
        allocation: {},
        performanceOverTime: []
      };
    }

    // Calculate totals
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalProfitLoss = 0;
    const coinPerformance = {};
    const allocation = {};

    enrichedInvestments.forEach(inv => {
      totalInvested += inv.investedAmount;
      totalCurrentValue += (inv.currentValueLocal || 0);
      totalProfitLoss += (inv.profitLossLocal || 0);

      if (!coinPerformance[inv.coinId]) {
        coinPerformance[inv.coinId] = {
          coinId: inv.coinId,
          coinName: inv.coinName,
          symbol: inv.symbol,
          totalInvested: 0,
          totalCurrentValue: 0,
          totalProfitLoss: 0,
          avgPurchasePrice: 0,
          totalQuantity: 0,
          profitLossPercentage: 0
        };
      }

      coinPerformance[inv.coinId].totalInvested += inv.investedAmount;
      coinPerformance[inv.coinId].totalCurrentValue += (inv.currentValueLocal || 0);
      coinPerformance[inv.coinId].totalQuantity += inv.quantity;
    });

    // Calculate percentages and find best/worst performers
    let bestPerformer = null;
    let worstPerformer = null;
    const coinBreakdown = Object.values(coinPerformance).map(coin => {
      coin.totalProfitLoss = coin.totalCurrentValue - coin.totalInvested;
      coin.avgPurchasePrice = coin.totalQuantity > 0 ? coin.totalInvested / coin.totalQuantity : 0;
      coin.profitLossPercentage = coin.totalInvested > 0 
        ? (coin.totalProfitLoss / coin.totalInvested) * 100 
        : 0;
      
      // Update best/worst performers
      if (!bestPerformer || coin.profitLossPercentage > bestPerformer.profitLossPercentage) {
        bestPerformer = coin;
      }
      if (!worstPerformer || coin.profitLossPercentage < worstPerformer.profitLossPercentage) {
        worstPerformer = coin;
      }
      
      // Calculate allocation percentage
      allocation[coin.coinId] = {
        percentage: totalCurrentValue > 0 ? (coin.totalCurrentValue / totalCurrentValue) * 100 : 0,
        amount: coin.totalCurrentValue,
        coinName: coin.coinName,
        symbol: coin.symbol
      };
      
      return coin;
    });

    const totalProfitLossPercentage = totalInvested > 0 
      ? (totalProfitLoss / totalInvested) * 100 
      : 0;

    return {
      totalInvested,
      totalCurrentValue,
      totalProfitLoss,
      totalProfitLossPercentage,
      bestPerformer,
      worstPerformer,
      count: enrichedInvestments.length,
      coinBreakdown,
      allocation,
      enrichedInvestments
    };
  }

  async refreshCache() {
    console.log('Refreshing cache...');
    const keys = this.cache.keys();
    
    for (const key of keys) {
      if (key.startsWith('prices_')) {
        this.cache.del(key);
      }
    }
  }

  async getHistoricalData(coinId, days = 30) {
    try {
      const response = await this.api.get(`/coins/${coinId}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days: days,
          interval: days <= 1 ? 'hourly' : days <= 90 ? 'daily' : 'daily'
        }
      });

      return {
        prices: response.data.prices,
        market_caps: response.data.market_caps,
        total_volumes: response.data.total_volumes
      };
    } catch (error) {
      console.error('Historical data fetch error:', error.message);
      // Return mock historical data
      return this.getMockHistoricalData(days);
    }
  }

  getMockHistoricalData(days) {
    const prices = [];
    const now = Date.now();
    
    for (let i = days; i >= 0; i--) {
      const timestamp = now - (i * 24 * 60 * 60 * 1000);
      const price = 45000 + (Math.random() * 1000 - 500); // Random price around 45000
      prices.push([timestamp, price]);
    }
    
    return {
      prices,
      market_caps: [],
      total_volumes: []
    };
  }
}

module.exports = new CoinService();