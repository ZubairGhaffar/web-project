import React, { useState, useEffect } from 'react';
import { FaTimes, FaMoneyBillWave, FaCalculator, FaExchangeAlt, FaInfoCircle } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import axios from 'axios';

const SellInvestmentModal = ({ investment, onClose, onSell, formatPKR, formatCurrency, userCurrency, exchangeRate }) => {
  const [formData, setFormData] = useState({
    sellQuantity: '',
    sellPriceLocal: '',
    sellDate: new Date(),
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentMarketPrice, setCurrentMarketPrice] = useState(null);
  const [marketLoading, setMarketLoading] = useState(false);

  useEffect(() => {
    fetchCurrentMarketPrice();
  }, [investment]);

  const fetchCurrentMarketPrice = async () => {
    try {
      setMarketLoading(true);
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${investment.coinId}&vs_currencies=usd`
      );
      if (response.data[investment.coinId]) {
        const usdPrice = response.data[investment.coinId].usd;
        const localPrice = usdPrice * exchangeRate;
        setCurrentMarketPrice(localPrice);
        
        // Auto-fill with current market price
        if (!formData.sellPriceLocal) {
          setFormData(prev => ({
            ...prev,
            sellPriceLocal: localPrice.toFixed(2)
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching market price:', error);
    } finally {
      setMarketLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.sellQuantity || parseFloat(formData.sellQuantity) <= 0) {
      newErrors.sellQuantity = 'Sell quantity must be greater than 0';
    } else if (parseFloat(formData.sellQuantity) > investment.quantity) {
      newErrors.sellQuantity = `Cannot sell more than ${investment.quantity} ${investment.symbol}`;
    }
    
    if (!formData.sellPriceLocal || parseFloat(formData.sellPriceLocal) <= 0) {
      newErrors.sellPriceLocal = 'Sell price must be greater than 0';
    }
    
    if (!formData.sellDate) {
      newErrors.sellDate = 'Sell date is required';
    }
    
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
        sellQuantity: parseFloat(formData.sellQuantity),
        sellPriceLocal: parseFloat(formData.sellPriceLocal),
        sellDate: formData.sellDate.toISOString()
      };

      await onSell(submissionData);
    } catch (err) {
      if (typeof err === 'string') {
        setErrors({ general: err });
      } else {
        setErrors({ general: 'Failed to sell investment' });
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateSaleDetails = () => {
    if (!formData.sellQuantity || !formData.sellPriceLocal) return null;
    
    const sellQuantity = parseFloat(formData.sellQuantity);
    const sellPriceLocal = parseFloat(formData.sellPriceLocal);
    const sellPriceUSD = sellPriceLocal / exchangeRate;
    
    // Calculate sale amount
    const saleAmountLocal = sellQuantity * sellPriceLocal;
    const saleAmountUSD = sellQuantity * sellPriceUSD;
    
    // Calculate profit/loss
    const investedPortion = (sellQuantity / investment.quantity) * investment.investedAmount;
    const profitLossLocal = saleAmountLocal - investedPortion;
    const profitLossUSD = saleAmountUSD - (investedPortion / exchangeRate);
    const profitLossPercentage = (profitLossLocal / investedPortion) * 100;
    
    // Calculate remaining investment
    const remainingQuantity = investment.quantity - sellQuantity;
    const remainingPercentage = remainingQuantity / investment.quantity;
    const remainingInvestedAmount = investment.investedAmount * remainingPercentage;
    
    return {
      saleAmountLocal,
      saleAmountUSD,
      profitLossLocal,
      profitLossUSD,
      profitLossPercentage,
      remainingQuantity,
      remainingInvestedAmount,
      isFullSale: sellQuantity >= investment.quantity
    };
  };

  const saleDetails = calculateSaleDetails();

  const handleUseMarketPrice = () => {
    if (currentMarketPrice) {
      setFormData(prev => ({
        ...prev,
        sellPriceLocal: currentMarketPrice.toFixed(2)
      }));
    }
  };

  const handleSellAll = () => {
    setFormData(prev => ({
      ...prev,
      sellQuantity: investment.quantity.toFixed(8)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Sell Investment</h2>
              <p className="text-green-100 mt-1">Sell {investment.coinName} ({investment.symbol})</p>
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

          {/* Investment Summary */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-3">Current Investment</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-blue-600">Coin:</span>
                <span className="font-medium ml-2">{investment.coinName} ({investment.symbol})</span>
              </div>
              <div>
                <span className="text-blue-600">Quantity:</span>
                <span className="font-medium ml-2">{investment.quantity.toFixed(8)}</span>
              </div>
              <div>
                <span className="text-blue-600">Invested (PKR):</span>
                <span className="font-medium ml-2">{formatPKR(investment.investedAmount)}</span>
              </div>
              <div>
                <span className="text-blue-600">Avg Purchase Price:</span>
                <span className="font-medium ml-2">{formatPKR(investment.purchasePriceLocal)}</span>
              </div>
              <div>
                <span className="text-blue-600">Current Value (PKR):</span>
                <span className="font-medium ml-2">{formatPKR(investment.currentValueLocal || 0)}</span>
              </div>
              <div>
                <span className="text-blue-600">Current P&L:</span>
                <span className={`font-medium ml-2 ${investment.profitLossLocal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPKR(investment.profitLossLocal || 0)} ({investment.profitLossPercentage?.toFixed(2) || 0}%)
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Sell Quantity */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity to Sell *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.00000001"
                  min="0.00000001"
                  max={investment.quantity}
                  value={formData.sellQuantity}
                  onChange={(e) => setFormData({...formData, sellQuantity: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.sellQuantity ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00000000"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({...prev, sellQuantity: (investment.quantity / 2).toFixed(8)}))}
                    className="text-xs text-gray-600 hover:text-gray-800"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={handleSellAll}
                    className="text-xs text-green-600 hover:text-green-800"
                  >
                    Sell All
                  </button>
                </div>
              </div>
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>Available: {investment.quantity.toFixed(8)} {investment.symbol}</span>
                {formData.sellQuantity && (
                  <span>Remaining: {(investment.quantity - parseFloat(formData.sellQuantity)).toFixed(8)}</span>
                )}
              </div>
              {errors.sellQuantity && (
                <p className="mt-1 text-sm text-red-600">{errors.sellQuantity}</p>
              )}
            </div>

            {/* Sell Price */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sell Price (PKR per coin) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.sellPriceLocal}
                  onChange={(e) => setFormData({...formData, sellPriceLocal: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.sellPriceLocal ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <button
                    type="button"
                    onClick={handleUseMarketPrice}
                    className="text-xs text-green-600 hover:text-green-700"
                    disabled={marketLoading}
                  >
                    {marketLoading ? 'Loading...' : 'Use Current'}
                  </button>
                </div>
              </div>
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>Purchase Price: {formatPKR(investment.purchasePriceLocal)}</span>
                <span>Current Market: {currentMarketPrice ? formatPKR(currentMarketPrice) : 'Loading...'}</span>
              </div>
              {errors.sellPriceLocal && (
                <p className="mt-1 text-sm text-red-600">{errors.sellPriceLocal}</p>
              )}
            </div>

            {/* Sell Date */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sell Date *
              </label>
              <DatePicker
                selected={formData.sellDate}
                onChange={(date) => setFormData({...formData, sellDate: date})}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.sellDate ? 'border-red-500' : 'border-gray-300'
                }`}
                dateFormat="MMMM d, yyyy"
                maxDate={new Date()}
                showYearDropdown
                scrollableYearDropdown
              />
              {errors.sellDate && (
                <p className="mt-1 text-sm text-red-600">{errors.sellDate}</p>
              )}
            </div>

            {/* Notes */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows="2"
                placeholder="Add any notes about this sale..."
                maxLength="500"
              />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {formData.notes.length}/500 characters
              </p>
            </div>

            {/* Sale Summary */}
            {saleDetails && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                  <FaCalculator className="mr-2" />
                  Sale Summary
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-green-600">Sale Amount (PKR):</span>
                    <span className="font-medium ml-2">{formatPKR(saleDetails.saleAmountLocal)}</span>
                  </div>
                  <div>
                    <span className="text-green-600">Sale Amount (USD):</span>
                    <span className="font-medium ml-2">{formatCurrency(saleDetails.saleAmountUSD, 'USD')}</span>
                  </div>
                  <div>
                    <span className="text-green-600">Profit/Loss (PKR):</span>
                    <span className={`font-medium ml-2 ${saleDetails.profitLossLocal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPKR(saleDetails.profitLossLocal)}
                    </span>
                  </div>
                  <div>
                    <span className="text-green-600">Return %:</span>
                    <span className={`font-medium ml-2 ${saleDetails.profitLossPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {saleDetails.profitLossPercentage.toFixed(2)}%
                    </span>
                  </div>
                  {!saleDetails.isFullSale && (
                    <>
                      <div>
                        <span className="text-green-600">Remaining Quantity:</span>
                        <span className="font-medium ml-2">{saleDetails.remainingQuantity.toFixed(8)} {investment.symbol}</span>
                      </div>
                      <div>
                        <span className="text-green-600">Remaining Value:</span>
                        <span className="font-medium ml-2">
                          {formatPKR((investment.currentValueLocal || 0) * (saleDetails.remainingQuantity / investment.quantity))}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-green-200">
                  <div className="flex items-center text-sm">
                    <FaInfoCircle className="text-green-600 mr-2" />
                    <span className="text-green-700">
                      {saleDetails.isFullSale 
                        ? 'This will close your entire position in this coin.'
                        : `You'll retain ${saleDetails.remainingQuantity.toFixed(8)} ${investment.symbol} after this sale.`
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Exchange Rate Info */}
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center text-sm text-blue-700">
                <FaExchangeAlt className="mr-2" />
                <span>Exchange Rate: 1 USD = {formatPKR(exchangeRate)}</span>
              </div>
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
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <FaMoneyBillWave className="mr-2" />
                    Confirm Sale
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SellInvestmentModal;