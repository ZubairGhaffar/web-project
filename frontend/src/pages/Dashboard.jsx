import React, { useState, useEffect } from 'react';
import { 
  FaChartLine, 
  FaChartBar, 
  FaDollarSign, 
  FaChartPie,
  FaCalendar,
  FaArrowUp,
  FaArrowDown,
  FaMoneyBillWave,
  FaShoppingCart,
  FaSync
} from 'react-icons/fa';
import { PieChart as RePieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const [summary, setSummary] = useState({ 
    income: 0, 
    expense: 0, 
    netBalance: 0,
    categoryBreakdown: [],
    recentTransactions: []
  });
  
  const [investmentSummary, setInvestmentSummary] = useState({
    totalInvested: 0,
    totalCurrentValue: 0,
    totalProfitLoss: 0,
    totalProfitLossPercentage: 0,
    count: 0,
    loading: false,
    error: null
  });
  
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchInvestmentSummary = async () => {
    try {
      setInvestmentSummary(prev => ({ ...prev, loading: true, error: null }));
      const response = await axios.get('http://localhost:5000/api/investments/summary');
      
      if (response.data.success) {
        const summaryData = response.data.summary;
        console.log('Investment Summary Data:', summaryData); // Debug log
        
        setInvestmentSummary({
          totalInvested: summaryData.totalInvested || 0,
          totalCurrentValue: summaryData.totalCurrentValue || 0,
          totalProfitLoss: summaryData.totalProfitLoss || 0,
          totalProfitLossPercentage: summaryData.totalProfitLossPercentage || 0,
          count: summaryData.count || 0,
          loading: false,
          error: null
        });
        
        // If you need current prices in dashboard too
        const coinIds = summaryData?.coinBreakdown?.map(c => c.coinId) || [];
        if (coinIds.length > 0) {
          // Fetch batch prices for dashboard if needed
          await axios.post('http://localhost:5000/api/investments/prices/batch', {
            coinIds
          });
        }
      } else {
        setInvestmentSummary(prev => ({
          ...prev,
          loading: false,
          error: response.data.error || 'Failed to fetch investment data'
        }));
      }
    } catch (error) {
      console.error('Error fetching investment summary:', error);
      setInvestmentSummary(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch investment data'
      }));
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [summaryRes, categoriesRes] = await Promise.all([
        axios.get('http://localhost:5000/api/transactions/summary'),
        axios.get('http://localhost:5000/api/transactions/categories?type=expense'),
        fetchInvestmentSummary() // Call investment summary
      ]);

      setSummary(summaryRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await fetchDashboardData();
  };

  const netBalanceWithInvestments = (summary.income - summary.expense) + investmentSummary.totalCurrentValue;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon, trend, color, prefix = '₨', suffix = '', loading = false }) => (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          {loading ? (
            <div className="flex items-center mt-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-300 mr-3"></div>
              <span className="text-gray-400">Loading...</span>
            </div>
          ) : (
            <p className={`text-2xl font-bold mt-2 ${color}`}>
              {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color.replace('text', 'bg').replace('-600', '-100')}`}>
          {icon}
        </div>
      </div>
      {trend !== undefined && !loading && (
        <div className="flex items-center mt-4 text-sm">
          {trend > 0 ? <FaArrowUp className="text-green-500 mr-1" /> : <FaArrowDown className="text-red-500 mr-1" />}
          <span className={trend > 0 ? 'text-green-500' : 'text-red-500'}>
            {Math.abs(trend)}% from last month
          </span>
        </div>
      )}
    </div>
  );

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const categoryData = summary.categoryBreakdown?.map(item => ({
    name: item._id,
    value: item.total
  })) || [];

  // Calculate savings rate
  const savingsRate = summary.income > 0 
    ? ((summary.netBalance / summary.income) * 100).toFixed(1)
    : 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome back, {user?.name}!</h1>
          <p className="text-gray-600">Here's your financial overview</p>
          {user?.monthlyIncome > 0 && (
            <div className="mt-2 inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
              <FaDollarSign className="mr-2" />
              Monthly Income: ₨ {user.monthlyIncome.toLocaleString()}
            </div>
          )}
        </div>
        <button
          onClick={refreshData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          <FaSync className="mr-2" />
          Refresh Data
        </button>
      </div>

      {/* Error Messages */}
      {investmentSummary.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">Investment data error: {investmentSummary.error}</p>
          <p className="text-red-500 text-sm mt-1">
            This might be due to API rate limits. Try refreshing in a moment.
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Balance" 
          value={summary.netBalance} 
          icon={<FaDollarSign className="text-blue-600 w-6 h-6" />}
          color="text-blue-600"
          trend={summary.income > 0 ? (summary.netBalance / summary.income * 100).toFixed(0) : 0}
        />
        <StatCard 
          title="Total Income" 
          value={summary.income} 
          icon={<FaChartLine className="text-green-600 w-6 h-6" />}
          color="text-green-600"
          trend={8}
        />
        <StatCard 
          title="Total Expenses" 
          value={summary.expense} 
          icon={<FaShoppingCart className="text-red-600 w-6 h-6" />}
          color="text-red-600"
          trend={-5}
        />
        <StatCard 
          title="Savings Rate" 
          value={savingsRate} 
          icon={<FaChartPie className="text-purple-600 w-6 h-6" />}
          color="text-purple-600"
          trend={3}
          prefix=""
          suffix="%"
        />
        <StatCard 
          title="Investment Value" 
          value={investmentSummary.totalCurrentValue} 
          icon={<FaChartLine className="text-purple-600 w-6 h-6" />}
          color="text-purple-600"
          trend={investmentSummary.totalProfitLossPercentage}
          loading={investmentSummary.loading}
        />

        <StatCard 
          title="Investment P&L" 
          value={investmentSummary.totalProfitLoss} 
          icon={investmentSummary.totalProfitLoss >= 0 ? 
            <FaArrowUp className="text-green-600 w-6 h-6" /> : 
            <FaArrowDown className="text-red-600 w-6 h-6" />
          }
          color={investmentSummary.totalProfitLoss >= 0 ? "text-green-600" : "text-red-600"}
          trend={investmentSummary.totalProfitLossPercentage}
          loading={investmentSummary.loading}
        />
        
        <StatCard 
          title="Invested Amount" 
          value={investmentSummary.totalInvested} 
          icon={<FaMoneyBillWave className="text-indigo-600 w-6 h-6" />}
          color="text-indigo-600"
          loading={investmentSummary.loading}
        />
        
        <StatCard 
          title="Total Investments" 
          value={investmentSummary.count} 
          icon={<FaChartBar className="text-yellow-600 w-6 h-6" />}
          color="text-yellow-600"
          prefix=""
          loading={investmentSummary.loading}
        />
      </div>

      {/* Investment Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm p-6 mb-8 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-blue-800">Investment Portfolio Summary</h3>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {investmentSummary.count} Investment{investmentSummary.count !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <p className="text-sm text-gray-600">Total Invested</p>
            <p className="text-xl font-bold text-indigo-700">
              ₨ {investmentSummary.totalInvested.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <p className="text-sm text-gray-600">Current Value</p>
            <p className="text-xl font-bold text-purple-700">
              ₨ {investmentSummary.totalCurrentValue.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <p className="text-sm text-gray-600">Total P&L</p>
            <p className={`text-xl font-bold ${
              investmentSummary.totalProfitLoss >= 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              {investmentSummary.totalProfitLoss >= 0 ? '+' : ''}₨ {investmentSummary.totalProfitLoss.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <p className="text-sm text-gray-600">Return %</p>
            <p className={`text-xl font-bold ${
              investmentSummary.totalProfitLossPercentage >= 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              {investmentSummary.totalProfitLossPercentage >= 0 ? '+' : ''}{investmentSummary.totalProfitLossPercentage.toFixed(2)}%
            </p>
          </div>
        </div>
        
        {investmentSummary.totalInvested > 0 && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">Portfolio Performance</span>
              <span className={`text-sm font-medium ${
                investmentSummary.totalProfitLossPercentage >= 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                Overall Return: {investmentSummary.totalProfitLossPercentage >= 0 ? '+' : ''}
                {investmentSummary.totalProfitLossPercentage.toFixed(2)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full ${
                  investmentSummary.totalProfitLossPercentage >= 0 ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{ 
                  width: `${Math.min(Math.abs(investmentSummary.totalProfitLossPercentage), 100)}%` 
                }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Category Distribution */}
        {categoryData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Expense Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`₨${value}`, 'Amount']} />
                <Legend />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Recent Transactions</h3>
            <span className="text-sm text-gray-500">{summary.recentTransactions?.length || 0} transactions</span>
          </div>
          <div className="space-y-4">
            {summary.recentTransactions?.map((transaction) => (
              <div key={transaction._id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    transaction.type === 'income' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {transaction.type === 'income' ? <FaChartLine /> : <FaShoppingCart />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{transaction.title}</p>
                    <p className="text-sm text-gray-500">{transaction.category}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(transaction.date).toLocaleDateString('en-PK')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}₨ {transaction.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {transaction.type}
                  </p>
                </div>
              </div>
            ))}
            
            {(!summary.recentTransactions || summary.recentTransactions.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaShoppingCart className="w-8 h-8 text-gray-400" />
                </div>
                <p>No transactions yet</p>
                <p className="text-sm mt-1">Add your first transaction to see it here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Combined Financial Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Budget Status */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Budget Status</h3>
          <div className="space-y-4">
            {user?.monthlyIncome > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Monthly Spending</span>
                  <span className="text-gray-600">
                    ₨ {summary.expense.toFixed(2)} / ₨ {user.monthlyIncome.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      (summary.expense / user.monthlyIncome) > 0.9 
                        ? 'bg-red-500' 
                        : (summary.expense / user.monthlyIncome) > 0.7 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                    }`}
                    style={{ 
                      width: `${Math.min((summary.expense / user.monthlyIncome) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {((summary.expense / user.monthlyIncome) * 100).toFixed(1)}% of monthly income spent
                </p>
              </div>
            )}
            
            {summary.netBalance < 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 font-medium flex items-center">
                  <FaArrowDown className="mr-2" />
                  ⚠️ You're spending more than you earn
                </p>
                <p className="text-red-500 text-sm mt-1">
                  Consider reviewing your expenses or increasing your income
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Net Worth Summary */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-sm p-6 border border-green-200">
          <h3 className="text-lg font-semibold text-green-800 mb-4">Net Worth Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Available Balance:</span>
              <span className={`text-lg font-bold ${summary.netBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                ₨ {summary.netBalance.toLocaleString()}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Investment Value:</span>
              <span className="text-lg font-bold text-purple-700">
                ₨ {investmentSummary.totalCurrentValue.toLocaleString()}
              </span>
            </div>
            
            <div className="pt-4 border-t border-green-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-800 font-medium">Total Net Worth:</span>
                <span className={`text-2xl font-bold ${netBalanceWithInvestments >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                  ₨ {netBalanceWithInvestments.toLocaleString()}
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                Available Balance + Investment Value
              </div>
            </div>
            
            {netBalanceWithInvestments > 0 && (
              <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                <p className="text-green-800 text-sm">
                  💰 Your total net worth is positive. Great job managing your finances!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Financial Tips */}
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl shadow-sm p-6 border border-yellow-200">
        <h3 className="text-lg font-semibold text-yellow-800 mb-3">Financial Tips for Today</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-white rounded-lg border border-yellow-100">
            <p className="text-sm text-yellow-700">
              💡 <span className="font-medium">Emergency Fund:</span> Aim to save 3-6 months of expenses
            </p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-yellow-100">
            <p className="text-sm text-yellow-700">
              📊 <span className="font-medium">Investing:</span> Consider diversifying across different asset classes
            </p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-yellow-100">
            <p className="text-sm text-yellow-700">
              🎯 <span className="font-medium">Budgeting:</span> Try to save at least 20% of your income
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;