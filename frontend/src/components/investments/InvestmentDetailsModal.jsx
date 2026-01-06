import React, { useState, useEffect } from 'react';
import { FaTimes, FaCalendar, FaCoins, FaChartLine, FaMoneyBillWave, FaExchangeAlt, FaHistory } from 'react-icons/fa';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const InvestmentDetailsModal = ({ investment, onClose, formatPKR, formatCurrency, formatPercentage, getProfitLossColor, userCurrency, exchangeRate }) => {
  const [historicalData, setHistoricalData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchHistoricalData();
  }, [investment]);

  const fetchHistoricalData = async () => {
    try {
      setLoadingHistory(true);
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${investment.coinId}/market_chart?vs_currency=usd&days=30&interval=daily`
      );
      setHistoricalData(response.data);
    } catch (error) {
      console.error('Error fetching historical data:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const purchaseDate = new Date(investment.purchaseDate);
  const daysHeld = Math.floor((new Date() - purchaseDate) / (1000 * 60 * 60 * 24));
  
  const details = [
    { 
      label: 'Coin', 
      value: `${investment.coinName} (${investment.symbol})`, 
      icon: FaCoins 
    },
    { 
      label: 'Purchase Date', 
      value: purchaseDate.toLocaleDateString(), 
      icon: FaCalendar 
    },
    { 
      label: 'Days Held', 
      value: `${daysHeld} days`, 
      icon: FaHistory 
    },
    { 
      label: 'Invested Amount', 
      value: formatPKR(investment.investedAmount),
      subValue: formatCurrency(investment.investedAmount / exchangeRate, 'USD')
    },
    { 
      label: 'Quantity', 
      value: investment.quantity.toFixed(8) + ' ' + investment.symbol 
    },
    { 
      label: 'Purchase Price', 
      value: formatPKR(investment.purchasePriceLocal),
      subValue: formatCurrency(investment.purchasePriceUSD, 'USD')
    },
    { 
      label: 'Current Price', 
      value: investment.currentPriceLocal ? formatPKR(investment.currentPriceLocal) : 'Loading...',
      subValue: investment.currentPrice ? formatCurrency(investment.currentPrice, 'USD') : '',
      change: investment.priceChange24h ? `${investment.priceChange24h >= 0 ? '+' : ''}${investment.priceChange24h.toFixed(2)}%` : ''
    },
    { 
      label: 'Current Value', 
      value: investment.currentValueLocal ? formatPKR(investment.currentValueLocal) : 'Loading...',
      subValue: investment.currentValue ? formatCurrency(investment.currentValue, 'USD') : ''
    },
    { 
      label: 'Profit/Loss', 
      value: investment.profitLossLocal !== null ? formatPKR(investment.profitLossLocal) : 'N/A',
      subValue: investment.profitLoss !== null ? formatCurrency(investment.profitLoss, 'USD') : '',
      color: getProfitLossColor(investment.profitLossLocal)
    },
    { 
      label: 'Return %', 
      value: investment.profitLossPercentage !== null ? formatPercentage(investment.profitLossPercentage) : 'N/A',
      color: getProfitLossColor(investment.profitLossPercentage)
    }
  ];

  if (investment.status === 'sold' || investment.status === 'partial') {
    details.push(
      { 
        label: 'Sale Date', 
        value: investment.sellDate ? new Date(investment.sellDate).toLocaleDateString() : 'N/A',
        icon: FaMoneyBillWave 
      },
      { 
        label: 'Sale Price', 
        value: investment.sellPriceLocal ? formatPKR(investment.sellPriceLocal) : 'N/A',
        subValue: investment.sellPriceUSD ? formatCurrency(investment.sellPriceUSD, 'USD') : ''
      },
      { 
        label: 'Realized P&L', 
        value: formatPKR(investment.realizedProfitLoss || 0),
        color: getProfitLossColor(investment.realizedProfitLoss)
      }
    );
  }

  const prepareChartData = () => {
    if (!historicalData?.prices) return null;

    const prices = historicalData.prices;
    const labels = prices.map(([timestamp]) => 
      new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );
    
    const data = prices.map(([, price]) => price * exchangeRate);

    return {
      labels: labels.slice(-30), // Last 30 days
      datasets: [
        {
          label: `${investment.symbol} Price (PKR)`,
          data: data.slice(-30),
          borderColor: getLineColor(),
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  };

  const getLineColor = () => {
    if (investment.profitLossPercentage === null) return '#3b82f6';
    return investment.profitLossPercentage >= 0 ? '#10b981' : '#ef4444';
  };

  const chartData = prepareChartData();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${investment.symbol}: ${formatPKR(context.raw)}`;
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: (value) => formatPKR(value)
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Investment Details</h2>
              <p className="text-primary-100 mt-1">Complete investment information</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200"
            >
              <FaTimes className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Summary Card */}
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4"
                  style={{ backgroundColor: investment.coinInfo?.color || '#6B7280' }}
                >
                  {investment.symbol.slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{investment.coinName}</h3>
                  <p className="text-gray-600">{investment.symbol}</p>
                  <div className={`mt-1 text-lg font-bold ${getProfitLossColor(investment.profitLossPercentage)}`}>
                    {formatPKR(investment.currentValueLocal || 0)} • {formatPercentage(investment.profitLossPercentage || 0)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Status</div>
                <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                  investment.status === 'active' ? 'bg-green-100 text-green-800' :
                  investment.status === 'sold' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {investment.status.charAt(0).toUpperCase() + investment.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Left Column - Details */}
            <div className="lg:col-span-2">
              <h4 className="text-lg font-semibold mb-4">Investment Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {details.map((detail, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-1">
                      {detail.icon && <detail.icon className="w-4 h-4 text-gray-400 mr-2" />}
                      <span className="text-sm font-medium text-gray-500">{detail.label}</span>
                    </div>
                    <div className={`text-lg font-semibold ${detail.color || 'text-gray-800'}`}>
                      {detail.value}
                    </div>
                    {detail.subValue && (
                      <div className="text-sm text-gray-600 mt-1">{detail.subValue}</div>
                    )}
                    {detail.change && (
                      <div className={`text-xs mt-1 ${parseFloat(detail.change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {detail.change} (24h)
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Notes */}
              {investment.notes && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-2">Notes</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700">{investment.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Chart */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Price Chart (30 Days)</h4>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                {loadingHistory ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="loading-spinner"></div>
                  </div>
                ) : chartData ? (
                  <div className="h-48">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    Chart data unavailable
                  </div>
                )}
                
                {/* Performance Insights */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Purchase Price:</span>
                    <span className="font-medium">{formatPKR(investment.purchasePriceLocal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Current Price:</span>
                    <span className="font-medium">{formatPKR(investment.currentPriceLocal || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Price Difference:</span>
                    <span className={`font-medium ${getProfitLossColor(investment.currentPriceLocal - investment.purchasePriceLocal)}`}>
                      {formatPKR((investment.currentPriceLocal || 0) - investment.purchasePriceLocal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Exchange Rate Info */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <FaExchangeAlt className="text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-800">Exchange Rate</span>
                </div>
                <div className="mt-2 text-center">
                  <div className="text-2xl font-bold text-blue-700">1 USD = {formatPKR(exchangeRate)}</div>
                  <div className="text-sm text-blue-600">Current rate used for calculations</div>
                </div>
              </div>
            </div>
          </div>

          {/* Holding Period Analysis */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
            <h4 className="text-lg font-semibold text-yellow-800 mb-3">Holding Period Analysis</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-700">{daysHeld}</div>
                <div className="text-sm text-yellow-600">Days Held</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-700">{Math.floor(daysHeld / 30)}</div>
                <div className="text-sm text-yellow-600">Months</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-700">{Math.floor(daysHeld / 365)}</div>
                <div className="text-sm text-yellow-600">Years</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getProfitLossColor(investment.profitLossPercentage)}`}>
                  {investment.profitLossPercentage?.toFixed(2) || 0}%
                </div>
                <div className="text-sm text-yellow-600">Annualized Return</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentDetailsModal;