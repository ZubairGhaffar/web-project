import React, { useState, useEffect } from 'react';
import { FaTimes, FaSearch, FaCoins, FaExchangeAlt, FaCalculator } from 'react-icons/fa';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const AddInvestmentModal = ({ onClose, onAdd, userCurrency, exchangeRate }) => {
  const [formData, setFormData] = useState({
    coinId: '',
    coinName: '',
    symbol: '',
    investedAmount: '',
    quantity: '',
    purchasePriceLocal: '',
    purchaseDate: new Date(),
    notes: '',
    originalCurrency: userCurrency
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [availableCoins, setAvailableCoins] = useState([]);
  const [currentPrices, setCurrentPrices] = useState({});
  const [fetchingPrices, setFetchingPrices] = useState(false);

  useEffect(() => {
    fetchSupportedCoins();
    fetchCurrentPrices();
  }, []);

  const fetchSupportedCoins = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/investments/coins/supported');
      if (response.data.success) {
        setAvailableCoins(response.data.coins);
      }
    } catch (error) {
      console.error('Error fetching supported coins:', error);
    }
  };

  const fetchCurrentPrices = async () => {
    try {
      setFetchingPrices(true);
      const coinIds = ['bitcoin', 'ethereum', 'tether', 'bnb', 'solana', 'ripple'];
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd`
      );
      setCurrentPrices(response.data);
    } catch (error) {
      console.error('Error fetching current prices:', error);
    } finally {
      setFetchingPrices(false);
    }
  };

  const handleCoinSelect = (coinId) => {
    const selectedCoin = availableCoins.find(coin => coin.id === coinId);
    if (selectedCoin) {
      const currentPriceUSD = currentPrices[coinId]?.usd;
      const currentPriceLocal = currentPriceUSD ? currentPriceUSD * exchangeRate : 0;
      
      setFormData({
        ...formData,
        coinId: selectedCoin.id,
        coinName: selectedCoin.name,
        symbol: selectedCoin.symbol,
        purchasePriceLocal: currentPriceLocal.toFixed(2)
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.coinId) newErrors.coinId = 'Please select a coin';
    if (!formData.investedAmount || parseFloat(formData.investedAmount) <= 0) 
      newErrors.investedAmount = 'Invested amount must be greater than 0';
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) 
      newErrors.quantity = 'Quantity must be greater than 0';
    if (!formData.purchasePriceLocal || parseFloat(formData.purchasePriceLocal) <= 0) 
      newErrors.purchasePriceLocal = 'Purchase price must be greater than 0';
    if (!formData.purchaseDate) newErrors.purchaseDate = 'Purchase date is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const submissionData = {
        ...formData,
        investedAmount: parseFloat(formData.investedAmount),
        quantity: parseFloat(formData.quantity),
        purchasePriceLocal: parseFloat(formData.purchasePriceLocal),
        purchaseDate: formData.purchaseDate.toISOString()
      };

      await onAdd(submissionData);
    } catch (err) {
      if (Array.isArray(err)) {
        const validationErrors = {};
        err.forEach(error => {
          if (error.param) {
            validationErrors[error.param] = error.msg;
          }
        });
        setErrors(validationErrors);
      } else if (typeof err === 'string') {
        setErrors({ general: err });
      } else {
        setErrors({ general: 'Failed to add investment' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, investedAmount: value });
    
    if (formData.purchasePriceLocal && value && parseFloat(value) > 0) {
      const quantity = parseFloat(value) / parseFloat(formData.purchasePriceLocal);
      setFormData(prev => ({ ...prev, quantity: quantity.toFixed(8) }));
    }
  };

  const handlePriceChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, purchasePriceLocal: value });
    
    if (formData.investedAmount && value && parseFloat(value) > 0) {
      const quantity = parseFloat(formData.investedAmount) / parseFloat(value);
      setFormData(prev => ({ ...prev, quantity: quantity.toFixed(8) }));
    }
  };

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, quantity: value });
    
    if (formData.purchasePriceLocal && value && parseFloat(value) > 0) {
      const amount = parseFloat(value) * parseFloat(formData.purchasePriceLocal);
      setFormData(prev => ({ ...prev, investedAmount: amount.toFixed(2) }));
    }
  };

  const formatPKR = (amount) => {
    if (!amount) return '₨0';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatUSD = (amount) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const handleUseCurrentPrice = () => {
    if (formData.coinId && currentPrices[formData.coinId]) {
      const currentPriceUSD = currentPrices[formData.coinId].usd;
      const currentPriceLocal = currentPriceUSD * exchangeRate;
      setFormData(prev => ({
        ...prev,
        purchasePriceLocal: currentPriceLocal.toFixed(2)
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Add New Investment</h2>
              <p className="text-primary-100 mt-1">Track your cryptocurrency investments in {userCurrency}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200"
            >
              <FaTimes className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{errors.general}</p>
            </div>
          )}

          {/* Exchange Rate Info */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaExchangeAlt className="text-blue-600 mr-2" />
                <span className="text-blue-700 font-medium">Exchange Rate</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-800">1 USD = {formatPKR(exchangeRate)}</div>
                <div className="text-sm text-blue-600">Current market rate</div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Coin Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Cryptocurrency *
              </label>
              <div className="relative">
                <select
                  value={formData.coinId}
                  onChange={(e) => handleCoinSelect(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg appearance-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.coinId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Choose a cryptocurrency...</option>
                  {availableCoins.map((coin) => (
                    <option key={coin.id} value={coin.id}>
                      {coin.name} ({coin.symbol})
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {errors.coinId && (
                <p className="mt-1 text-sm text-red-600">{errors.coinId}</p>
              )}

              {/* Selected Coin Details */}
              {formData.coinId && (
                <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-3"
                        style={{ backgroundColor: availableCoins.find(c => c.id === formData.coinId)?.color || '#6B7280' }}
                      >
                        {formData.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800">{formData.coinName}</h4>
                        <p className="text-sm text-gray-600">Symbol: {formData.symbol}</p>
                      </div>
                    </div>
                    
                    {/* Current Market Price */}
                    {currentPrices[formData.coinId] && (
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Current Market Price</div>
                        <div className="text-lg font-bold text-gray-800">
                          {formatPKR(currentPrices[formData.coinId].usd * exchangeRate)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatUSD(currentPrices[formData.coinId].usd)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Investment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invested Amount (PKR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.investedAmount}
                  onChange={handleAmountChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.investedAmount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.investedAmount && (
                  <p className="mt-1 text-sm text-red-600">{errors.investedAmount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purchase Price (PKR per coin) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.purchasePriceLocal}
                    onChange={handlePriceChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.purchasePriceLocal ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {formData.coinId && currentPrices[formData.coinId] && (
                    <button
                      type="button"
                      onClick={handleUseCurrentPrice}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-primary-600 hover:text-primary-700"
                    >
                      Use Current
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  USD: {formData.purchasePriceLocal ? formatUSD(parseFloat(formData.purchasePriceLocal) / exchangeRate) : '$0.00'}
                </div>
                {errors.purchasePriceLocal && (
                  <p className="mt-1 text-sm text-red-600">{errors.purchasePriceLocal}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  min="0.00000001"
                  value={formData.quantity}
                  onChange={handleQuantityChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.quantity ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00000000"
                />
                {errors.quantity && (
                  <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purchase Date *
                </label>
                <DatePicker
                  selected={formData.purchaseDate}
                  onChange={(date) => setFormData({ ...formData, purchaseDate: date })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.purchaseDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                  dateFormat="MMMM d, yyyy"
                  maxDate={new Date()}
                  showYearDropdown
                  scrollableYearDropdown
                />
                {errors.purchaseDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.purchaseDate}</p>
                )}
              </div>
            </div>

            {/* Investment Summary */}
            {formData.investedAmount && formData.purchasePriceLocal && formData.quantity && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                  <FaCalculator className="mr-2" />
                  Investment Summary
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-green-600">Total Cost (PKR):</span>
                    <span className="font-medium ml-2">{formatPKR(parseFloat(formData.investedAmount))}</span>
                  </div>
                  <div>
                    <span className="text-green-600">Total Cost (USD):</span>
                    <span className="font-medium ml-2">
                      {formatUSD(parseFloat(formData.investedAmount) / exchangeRate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-green-600">Quantity:</span>
                    <span className="font-medium ml-2">
                      {parseFloat(formData.quantity).toFixed(8)} {formData.symbol}
                    </span>
                  </div>
                  <div>
                    <span className="text-green-600">Price per Coin:</span>
                    <span className="font-medium ml-2">
                      {formatPKR(parseFloat(formData.purchasePriceLocal))}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows="3"
                placeholder="Add any notes about this investment..."
                maxLength="500"
              />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {formData.notes.length}/500 characters
              </p>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding...
                  </>
                ) : (
                  'Add Investment'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddInvestmentModal;