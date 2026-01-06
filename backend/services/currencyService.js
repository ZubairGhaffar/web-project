const axios = require('axios');

class CurrencyService {
  constructor() {
    this.cache = {
      rates: null,
      timestamp: null,
      ttl: 3600000 // 1 hour cache
    };
    // Fallback rates (PKR to USD)
    this.fallbackRates = {
      PKR: 280, // 1 USD = 280 PKR
      USD: 1,
      EUR: 0.92,
      GBP: 0.79,
      INR: 83,
      CAD: 1.35,
      AUD: 1.52
    };
  }

  async getExchangeRates() {
    const now = Date.now();
    
    // Return cached rates if still valid
    if (this.cache.rates && this.cache.timestamp && 
        (now - this.cache.timestamp) < this.cache.ttl) {
      return this.cache.rates;
    }

    try {
      // Try multiple free exchange rate APIs
      let rates = null;
      
      // First try: exchangerate-api.com
      try {
        const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
          timeout: 5000
        });
        rates = response.data.rates;
      } catch (error) {
        console.log('ExchangeRate API failed, trying backup...');
        
        // Second try: frankfurter.app (free, no API key needed)
        try {
          const response = await axios.get('https://api.frankfurter.app/latest?from=USD', {
            timeout: 5000
          });
          rates = response.data.rates;
        } catch (error2) {
          console.log('Frankfurter API failed, using fallback rates...');
          rates = this.fallbackRates;
        }
      }
      
      // Ensure we have rates for all supported currencies
      const finalRates = { ...this.fallbackRates, ...rates };
      
      this.cache.rates = finalRates;
      this.cache.timestamp = now;
      return finalRates;
      
    } catch (error) {
      console.error('All exchange rate APIs failed:', error.message);
      // Use fallback rates
      this.cache.rates = this.fallbackRates;
      this.cache.timestamp = now;
      return this.fallbackRates;
    }
  }

  async convertToUSD(amount, currency) {
    if (currency === 'USD') return amount;
    
    const rates = await this.getExchangeRates();
    const rate = rates[currency];
    
    if (!rate) {
      console.warn(`Unsupported currency: ${currency}, using fallback rate`);
      // Estimate conversion (1 USD = 280 PKR)
      return currency === 'PKR' ? amount / 280 : amount;
    }
    
    // Convert to USD: amount / exchange_rate
    return amount / rate;
  }

  async convertFromUSD(amount, currency) {
    if (currency === 'USD') return amount;
    
    const rates = await this.getExchangeRates();
    const rate = rates[currency];
    
    if (!rate) {
      console.warn(`Unsupported currency: ${currency}, using fallback rate`);
      // Estimate conversion (1 USD = 280 PKR)
      return currency === 'PKR' ? amount * 280 : amount;
    }
    
    // Convert from USD: amount * exchange_rate
    return amount * rate;
  }

  async convert(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;
    
    const rates = await this.getExchangeRates();
    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];
    
    if (!fromRate || !toRate) {
      console.warn(`Unsupported currency pair: ${fromCurrency} to ${toCurrency}`);
      // Fallback logic
      if (fromCurrency === 'PKR' && toCurrency === 'USD') {
        return amount / 280;
      } else if (fromCurrency === 'USD' && toCurrency === 'PKR') {
        return amount * 280;
      } else {
        return amount; // Return same amount if we can't convert
      }
    }
    
    // Convert via USD
    const usdAmount = amount / fromRate;
    return usdAmount * toRate;
  }

  async getSupportedCurrencies() {
    const rates = await this.getExchangeRates();
    return Object.keys(rates);
  }

  // Get specific rate - FIXED THIS METHOD
  async getRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return 1;
    
    const rates = await this.getExchangeRates();
    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];
    
    if (!fromRate || !toRate) {
      console.warn(`Cannot get rate for ${fromCurrency} to ${toCurrency}`);
      // Return fallback rate for PKR-USD
      if (fromCurrency === 'USD' && toCurrency === 'PKR') {
        return 280;
      } else if (fromCurrency === 'PKR' && toCurrency === 'USD') {
        return 1/280;
      }
      return 1;
    }
    
    // Calculate rate: toRate / fromRate
    return toRate / fromRate;
  }

  // Simple method to get USD to PKR rate specifically
  async getUSDtoPKR() {
    try {
      const rates = await this.getExchangeRates();
      return rates.PKR || 280; // Fallback to 280 if not available
    } catch (error) {
      console.error('Error getting USD to PKR rate:', error);
      return 280;
    }
  }
}

module.exports = new CurrencyService();