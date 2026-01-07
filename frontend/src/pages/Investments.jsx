import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaPlus, 
  FaChartLine, 
  FaSearch, 
  FaCoins, 
  FaArrowUp, 
  FaArrowDown,
  FaTrash,
  FaInfoCircle,
  FaWallet,
  FaMoneyBillWave,
  FaPercent,
  FaExchangeAlt,
  FaFilter,
  FaSortAmountDown,
  FaSortAmountUp,
  FaSync // Add refresh icon
} from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import AddInvestmentModal from '../components/investments/AddInvestmentModal';
import InvestmentDetailsModal from '../components/investments/InvestmentDetailsModal';
import SellInvestmentModal from '../components/investments/SellInvestmentModal';
import PortfolioChart from '../components/investments/PortfolioChart';
import AllocationChart from '../components/investments/AllocationChart';

const Investments = () => {
  const [investments, setInvestments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [coinPrices, setCoinPrices] = useState({}); // Add coinPrices state
  const [loading, setLoading] = useState(true);
  const [priceLoading, setPriceLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const [investmentToSell, setInvestmentToSell] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('purchaseDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [userCurrency, setUserCurrency] = useState('PKR');
  const [exchangeRate, setExchangeRate] = useState(280);
  const { user } = useAuth();

  // Fetch investments data
  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/investments');
      if (response.data.success) {
        setInvestments(response.data.investments);
        setAnalytics(response.data.analytics);
        setExchangeRate(response.data.exchangeRate || 280);
      }
    } catch (err) {
      console.error('Error fetching investments:', err);
      setError('Failed to load investments');
    } finally {
      setLoading(false);
    }
  };

  // Fetch batch prices
  const fetchBatchPrices = useCallback(async (coinIds) => {
    if (coinIds.length === 0) return;
    
    try {
      setPriceLoading(true);
      const response = await axios.post('http://localhost:5000/api/investments/prices/batch', {
        coinIds
      });
      
      if (response.data.success) {
        setCoinPrices(response.data.prices);
      }
    } catch (err) {
      console.error('Error fetching batch prices:', err);
      // Don't show error to user, just use fallback prices
    } finally {
      setPriceLoading(false);
    }
  }, []);

  // Fetch exchange rate
  const fetchExchangeRate = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/investments/exchange-rate');
      if (response.data.success) {
        setExchangeRate(response.data.rate);
      }
    } catch (err) {
      console.error('Error fetching exchange rate:', err);
    }
  };

  // Refresh prices manually
  const handleRefreshPrices = async () => {
    const coinIds = [...new Set(investments.map(inv => inv.coinId))];
    if (coinIds.length > 0) {
      await fetchBatchPrices(coinIds);
    }
  };

  useEffect(() => {
    if (user) {
      setUserCurrency(user.currency || 'PKR');
      fetchInvestments();
      fetchExchangeRate();
    }
  }, [user]);

  useEffect(() => {
    if (investments.length > 0) {
      const coinIds = [...new Set(investments.map(inv => inv.coinId))];
      fetchBatchPrices(coinIds);
    }
  }, [investments, fetchBatchPrices]);

  // Enrich investments with current prices from batch
  const getEnrichedInvestments = () => {
    return investments.map(investment => {
      const coinPriceData = coinPrices[investment.coinId];
      
      if (!coinPriceData) {
        return {
          ...investment,
          currentPriceLocal: null,
          currentPrice: null,
          priceChange24h: null,
          currentValueLocal: null,
          currentValue: null,
          profitLossLocal: null,
          profitLoss: null,
          profitLossPercentage: null,
          priceLoading: true
        };
      }

      const currentPriceUSD = coinPriceData.usd || 0;
      const currentPriceLocal = userCurrency === 'USD' 
        ? currentPriceUSD 
        : (coinPriceData.local || currentPriceUSD * exchangeRate);
      
      const priceChange24h = coinPriceData.usd_24h_change || 0;
      const currentValueLocal = investment.quantity * currentPriceLocal;
      const currentValueUSD = investment.quantity * currentPriceUSD;
      
      const investedAmountUSD = investment.originalCurrency === 'USD' 
        ? investment.investedAmount 
        : investment.investedAmount / (investment.exchangeRate || exchangeRate);
      
      const profitLossUSD = currentValueUSD - investedAmountUSD;
      const profitLossLocal = currentValueLocal - investment.investedAmount;
      const profitLossPercentage = investedAmountUSD > 0 
        ? (profitLossUSD / investedAmountUSD) * 100 
        : 0;

      return {
        ...investment,
        currentPriceLocal,
        currentPrice: currentPriceUSD,
        priceChange24h,
        currentValueLocal,
        currentValue: currentValueUSD,
        profitLossLocal,
        profitLoss: profitLossUSD,
        profitLossPercentage,
        priceLoading: false
      };
    });
  };

  const handleAddInvestment = async (investmentData) => {
    try {
      const response = await axios.post('http://localhost:5000/api/investments', investmentData);
      if (response.data.success) {
        setShowAddModal(false);
        await fetchInvestments();
        
        // Refresh prices for the newly added coin
        if (investmentData.coinId) {
          fetchBatchPrices([investmentData.coinId]);
        }
      }
      return response.data;
    } catch (err) {
      console.error('Error adding investment:', err);
      throw err.response?.data?.errors || err.response?.data?.error || 'Failed to add investment';
    }
  };

  const handleSellInvestment = async (sellData) => {
    try {
      const response = await axios.post(
        `http://localhost:5000/api/investments/${investmentToSell._id}/sell`,
        sellData
      );
      if (response.data.success) {
        setInvestmentToSell(null);
        await fetchInvestments();
      }
      return response.data;
    } catch (err) {
      console.error('Error selling investment:', err);
      throw err.response?.data?.error || 'Failed to sell investment';
    }
  };

  const handleDeleteInvestment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this investment?')) {
      return;
    }

    try {
      const response = await axios.delete(`http://localhost:5000/api/investments/${id}`);
      if (response.data.success) {
        await fetchInvestments();
      }
    } catch (err) {
      console.error('Error deleting investment:', err);
      setError('Failed to delete investment');
    }
  };

  const formatCurrency = (amount, currency = userCurrency) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatPKR = (amount) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getProfitLossColor = (value) => {
    if (value === null || value === undefined) return 'text-gray-600';
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getProfitLossBgColor = (value) => {
    if (value === null || value === undefined) return 'bg-gray-100';
    return value >= 0 ? 'bg-green-50' : 'bg-red-50';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'sold': return 'bg-blue-100 text-blue-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const enrichedInvestments = getEnrichedInvestments();

  const filteredAndSortedInvestments = enrichedInvestments
    .filter(inv => {
      if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
      if (!searchTerm) return true;
      return (
        inv.coinName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'coinName':
          aValue = a.coinName;
          bValue = b.coinName;
          break;
        case 'investedAmount':
          aValue = a.investedAmount;
          bValue = b.investedAmount;
          break;
        case 'currentValue':
          aValue = a.currentValueLocal || 0;
          bValue = b.currentValueLocal || 0;
          break;
        case 'profitLoss':
          aValue = a.profitLossLocal || 0;
          bValue = b.profitLossLocal || 0;
          break;
        case 'profitLossPercentage':
          aValue = a.profitLossPercentage || 0;
          bValue = b.profitLossPercentage || 0;
          break;
        case 'purchaseDate':
          aValue = new Date(a.purchaseDate);
          bValue = new Date(b.purchaseDate);
          break;
        default:
          aValue = a[sortBy];
          bValue = b[sortBy];
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Investment Portfolio</h1>
            <p className="text-gray-600 mt-2">Track and manage your cryptocurrency investments in {userCurrency}</p>
            <div className="mt-2 flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <FaExchangeAlt />
                <span>Exchange Rate: 1 USD = {formatPKR(exchangeRate)}</span>
              </div>
              {priceLoading && (
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <FaSync className="animate-spin" />
                  <span>Updating prices...</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleRefreshPrices}
              disabled={priceLoading || investments.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              title="Refresh Prices"
            >
              <FaSync className={`mr-2 ${priceLoading ? 'animate-spin' : ''}`} />
              Refresh Prices
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-lg hover:from-primary-700 hover:to-primary-800 flex items-center shadow-lg hover:shadow-xl transition-all"
            >
              <FaPlus className="mr-2" />
              Add Investment
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Portfolio Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100">Total Invested</p>
                <p className="text-2xl font-bold mt-2">
                  {formatPKR(analytics.totalInvested)}
                </p>
                <p className="text-sm text-blue-200 mt-1">
                  {formatCurrency(analytics.totalInvested / exchangeRate, 'USD')}
                </p>
              </div>
              <div className="p-3 rounded-full bg-white bg-opacity-20">
                <FaWallet className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-100">Current Value</p>
                <p className="text-2xl font-bold mt-2">
                  {formatPKR(analytics.totalCurrentValue)}
                </p>
                <p className="text-sm text-purple-200 mt-1">
                  {formatCurrency(analytics.totalCurrentValue / exchangeRate, 'USD')}
                </p>
              </div>
              <div className="p-3 rounded-full bg-white bg-opacity-20">
                <FaChartLine className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-100">Total Profit/Loss</p>
                <p className={`text-2xl font-bold mt-2 ${getProfitLossColor(analytics.totalProfitLoss)}`}>
                  {formatPKR(analytics.totalProfitLoss)}
                </p>
                <p className={`text-sm mt-1 ${analytics.totalProfitLoss >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                  {formatCurrency(analytics.totalProfitLoss / exchangeRate, 'USD')}
                </p>
              </div>
              <div className={`p-3 rounded-full bg-white bg-opacity-20 ${getProfitLossBgColor(analytics.totalProfitLoss)}`}>
                {analytics.totalProfitLoss >= 0 ? (
                  <FaArrowUp className="w-6 h-6 text-green-300" />
                ) : (
                  <FaArrowDown className="w-6 h-6 text-red-300" />
                )}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-100">Return %</p>
                <p className={`text-2xl font-bold mt-2 ${getProfitLossColor(analytics.totalProfitLossPercentage)}`}>
                  {formatPercentage(analytics.totalProfitLossPercentage)}
                </p>
                <p className="text-sm text-indigo-200 mt-1">
                  {analytics.count} Investment{analytics.count !== 1 ? 's' : ''}
                </p>
              </div>
              <div className={`p-3 rounded-full bg-white bg-opacity-20 ${getProfitLossBgColor(analytics.totalProfitLossPercentage)}`}>
                <FaPercent className="w-6 h-6 text-indigo-300" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Price Loading Indicator */}
      {priceLoading && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center">
          <FaSync className="animate-spin text-blue-600 mr-2" />
          <span className="text-blue-700">Updating cryptocurrency prices...</span>
        </div>
      )}

      {/* Charts Section */}
      {analytics && analytics.coinBreakdown && analytics.coinBreakdown.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <PortfolioChart 
              analytics={analytics} 
              formatCurrency={formatPKR}
              userCurrency={userCurrency}
            />
          </div>
          <div>
            <AllocationChart 
              allocation={analytics.allocation} 
              coins={analytics.coinBreakdown}
            />
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6 bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search investments by coin name, symbol, or notes..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex space-x-4">
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="sold">Sold</option>
                <option value="partial">Partial</option>
              </select>
              <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            
            <div className="text-sm text-gray-600 flex items-center">
              <FaCoins className="mr-2" />
              {filteredAndSortedInvestments.length} investment{filteredAndSortedInvestments.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Investments Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('coinName')}>
                  <div className="flex items-center">
                    Coin
                    {sortBy === 'coinName' && (
                      sortOrder === 'asc' ? <FaSortAmountUp className="ml-1" /> : <FaSortAmountDown className="ml-1" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('investedAmount')}>
                  <div className="flex items-center">
                    Invested (PKR)
                    {sortBy === 'investedAmount' && (
                      sortOrder === 'asc' ? <FaSortAmountUp className="ml-1" /> : <FaSortAmountDown className="ml-1" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchase Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('currentValue')}>
                  <div className="flex items-center">
                    Current Value
                    {sortBy === 'currentValue' && (
                      sortOrder === 'asc' ? <FaSortAmountUp className="ml-1" /> : <FaSortAmountDown className="ml-1" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('profitLoss')}>
                  <div className="flex items-center">
                    P&L (PKR)
                    {sortBy === 'profitLoss' && (
                      sortOrder === 'asc' ? <FaSortAmountUp className="ml-1" /> : <FaSortAmountDown className="ml-1" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('profitLossPercentage')}>
                  <div className="flex items-center">
                    Return %
                    {sortBy === 'profitLossPercentage' && (
                      sortOrder === 'asc' ? <FaSortAmountUp className="ml-1" /> : <FaSortAmountDown className="ml-1" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAndSortedInvestments.map((investment) => (
                <tr key={investment._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-3"
                           style={{ backgroundColor: investment.coinInfo?.color || '#6B7280' }}>
                        <span className="text-white font-bold">{investment.symbol.slice(0, 2)}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{investment.coinName}</div>
                        <div className="text-sm text-gray-500">{investment.symbol}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {investment.quantity.toFixed(8)} coins
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{formatPKR(investment.investedAmount)}</div>
                    <div className="text-sm text-gray-500">
                      {formatCurrency(investment.investedAmount / exchangeRate, 'USD')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{formatPKR(investment.purchasePriceLocal)}</div>
                    <div className="text-sm text-gray-500">
                      {formatCurrency(investment.purchasePriceUSD, 'USD')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {investment.priceLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        <span className="text-gray-400">Loading...</span>
                      </div>
                    ) : investment.currentValueLocal ? (
                      <>
                        <div className="font-medium">{formatPKR(investment.currentValueLocal)}</div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(investment.currentValue, 'USD')}
                        </div>
                        <div className={`text-xs ${getProfitLossColor(investment.priceChange24h)}`}>
                          {investment.priceChange24h ? `${investment.priceChange24h >= 0 ? '+' : ''}${investment.priceChange24h.toFixed(2)}%` : ''}
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-400">Price unavailable</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {investment.priceLoading ? (
                      <div className="text-gray-400">...</div>
                    ) : investment.profitLossLocal !== null ? (
                      <>
                        <div className={`font-medium ${getProfitLossColor(investment.profitLossLocal)}`}>
                          {formatPKR(investment.profitLossLocal)}
                        </div>
                        <div className={`text-sm ${getProfitLossColor(investment.profitLoss)}`}>
                          {formatCurrency(investment.profitLoss, 'USD')}
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-400">N/A</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {investment.priceLoading ? (
                      <div className="text-gray-400">...</div>
                    ) : investment.profitLossPercentage !== null ? (
                      <div className={`font-medium ${getProfitLossColor(investment.profitLossPercentage)}`}>
                        {formatPercentage(investment.profitLossPercentage)}
                      </div>
                    ) : (
                      <div className="text-gray-400">N/A</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(investment.status)}`}>
                      {investment.status.charAt(0).toUpperCase() + investment.status.slice(1)}
                    </span>
                    {investment.sellDate && (
                      <div className="text-xs text-gray-500 mt-1">
                        Sold: {new Date(investment.sellDate).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedInvestment(investment)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="View Details"
                      >
                        <FaInfoCircle />
                      </button>
                      {investment.status === 'active' && (
                        <button
                          onClick={() => setInvestmentToSell(investment)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Sell Investment"
                        >
                          <FaMoneyBillWave />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteInvestment(investment._id)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredAndSortedInvestments.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <FaCoins className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterStatus !== 'all' ? 'No matching investments' : 'No investments yet'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try changing your search or filter criteria'
                : 'Start tracking your cryptocurrency investments to see your portfolio performance'}
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Add your first investment →
              </button>
            )}
          </div>
        )}
      </div>


      {/* Performance Insights */}
      {analytics && analytics.bestPerformer && analytics.worstPerformer && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
              <FaArrowUp className="mr-2" />
              Best Performer
            </h4>
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center mr-3">
                <span className="font-bold text-green-800">{analytics.bestPerformer.symbol.slice(0, 2)}</span>
              </div>
              <div>
                <h5 className="font-bold text-gray-900">{analytics.bestPerformer.coinName}</h5>
                <p className="text-sm text-gray-600">{analytics.bestPerformer.symbol}</p>
              </div>
            </div>
            <div className={`text-2xl font-bold ${getProfitLossColor(analytics.bestPerformer.profitLossPercentage)}`}>
              {formatPercentage(analytics.bestPerformer.profitLossPercentage)}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Total Profit: {formatPKR(analytics.bestPerformer.totalProfitLoss)}
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-red-800 mb-3 flex items-center">
              <FaArrowDown className="mr-2" />
              Worst Performer
            </h4>
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 rounded-full bg-red-200 flex items-center justify-center mr-3">
                <span className="font-bold text-red-800">{analytics.worstPerformer.symbol.slice(0, 2)}</span>
              </div>
              <div>
                <h5 className="font-bold text-gray-900">{analytics.worstPerformer.coinName}</h5>
                <p className="text-sm text-gray-600">{analytics.worstPerformer.symbol}</p>
              </div>
            </div>
            <div className={`text-2xl font-bold ${getProfitLossColor(analytics.worstPerformer.profitLossPercentage)}`}>
              {formatPercentage(analytics.worstPerformer.profitLossPercentage)}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Total Loss: {formatPKR(analytics.worstPerformer.totalProfitLoss)}
            </div>
          </div>
        </div>
      )}

      {/* Investment Tips */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-primary-800 mb-3 flex items-center">
          <FaInfoCircle className="mr-2" />
          Investment Tips for Pakistani Investors
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-primary-700">
            <div className="font-medium mb-1">💡 Currency Considerations</div>
            <p className="text-sm">Investments are tracked in PKR but calculated in USD for accurate crypto valuations.</p>
          </div>
          <div className="text-primary-700">
            <div className="font-medium mb-1">📊 Tax Implications</div>
            <p className="text-sm">Keep track of purchase dates and prices for capital gains tax calculations.</p>
          </div>
          <div className="text-primary-700">
            <div className="font-medium mb-1">🔄 Exchange Rate Impact</div>
            <p className="text-sm">PKR/USD fluctuations affect your returns. Monitor exchange rates regularly.</p>
          </div>
          <div className="text-primary-700">
            <div className="font-medium mb-1">⚖️ Risk Management</div>
            <p className="text-sm">Diversify across different cryptocurrencies to manage volatility risk.</p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddInvestmentModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddInvestment}
          userCurrency={userCurrency}
          exchangeRate={exchangeRate}
        />
      )}

      {selectedInvestment && (
        <InvestmentDetailsModal
          investment={selectedInvestment}
          onClose={() => setSelectedInvestment(null)}
          formatPKR={formatPKR}
          formatCurrency={formatCurrency}
          formatPercentage={formatPercentage}
          getProfitLossColor={getProfitLossColor}
          userCurrency={userCurrency}
          exchangeRate={exchangeRate}
        />
      )}

      {investmentToSell && (
        <SellInvestmentModal
          investment={investmentToSell}
          onClose={() => setInvestmentToSell(null)}
          onSell={handleSellInvestment}
          formatPKR={formatPKR}
          formatCurrency={formatCurrency}
          userCurrency={userCurrency}
          exchangeRate={exchangeRate}
        />
      )}
    </div>
  );
};

export default Investments;