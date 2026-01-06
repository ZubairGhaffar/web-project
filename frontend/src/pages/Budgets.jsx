import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaExclamationTriangle, FaChartPie } from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const Budgets = () => {
  const [budgets, setBudgets] = useState([]);
  const [formData, setFormData] = useState({
    category: 'Food',
    limit: '',
    period: 'monthly',
    startDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useAuth();

  const categories = [
    'Food', 'Transportation', 'Housing', 'Entertainment',
    'Healthcare', 'Education', 'Shopping', 'Utilities',
    'Personal Care', 'Debt Payments', 'Savings', 'Investments', 'Other'
  ];

  const periods = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' }
  ];

  useEffect(() => {
    if (user) {
      fetchBudgets();
    }
  }, [user]);

  const fetchBudgets = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/budgets');
      setBudgets(response.data);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      setError('Failed to load budgets');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const data = {
        ...formData,
        limit: parseFloat(formData.limit)
      };
      
      await axios.post('http://localhost:5000/api/budgets', data);
      setSuccess('Budget created successfully!');
      resetForm();
      fetchBudgets();
    } catch (err) {
      console.error('Error saving budget:', err);
      if (err.response?.data?.errors) {
        setError(err.response.data.errors[0]?.msg || 'Validation error');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to create budget. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this budget?')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/api/budgets/${id}`);
      setSuccess('Budget deleted successfully!');
      fetchBudgets();
    } catch (error) {
      console.error('Error deleting budget:', error);
      setError('Failed to delete budget');
    }
  };

  const resetForm = () => {
    setFormData({
      category: 'Food',
      limit: '',
      period: 'monthly',
      startDate: new Date().toISOString().split('T')[0]
    });
  };

  const calculateProgress = (budget) => {
    if (budget.limit === 0) return 0;
    const percentage = (budget.spent / budget.limit) * 100;
    return Math.min(percentage, 100);
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getProgressTextColor = (percentage) => {
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Format PKR amounts
  const formatPKR = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPKRDecimal = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Calculate totals
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.limit, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
  const totalRemaining = totalBudget - totalSpent;

  // Calculate monthly equivalent for display
  const getMonthlyEquivalent = (budget) => {
    switch (budget.period) {
      case 'weekly':
        return budget.limit * 4.33; // Average weeks in a month
      case 'yearly':
        return budget.limit / 12;
      default:
        return budget.limit;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Budgets</h1>
        <p className="text-gray-600">Set and track your spending limits in Pakistani Rupees</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Monthly Budget</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {formatPKR(totalBudget)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <FaChartPie className="text-blue-600 w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Sum of all active budgets (monthly equivalent)
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {formatPKR(totalSpent)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-red-100">
              <FaExclamationTriangle className="text-red-600 w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Current spending across all budgets
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Balance</p>
              <p className={`text-2xl font-bold mt-2 ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPKR(totalRemaining)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${totalRemaining >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {totalRemaining >= 0 ? (
                <span className="text-green-600 text-xl font-bold">✓</span>
              ) : (
                <FaExclamationTriangle className="text-red-600 w-6 h-6" />
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {totalRemaining >= 0 ? 'Within budget' : 'Over budget'}
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-600">{success}</p>
        </div>
      )}

      {/* Add Budget Form */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Create New Budget</h3>
        <p className="text-sm text-gray-600 mb-4">All amounts are in Pakistani Rupees (₨)</p>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Limit (₨) *
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={formData.limit}
                onChange={(e) => setFormData({...formData, limit: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Monthly equivalent: {formData.limit ? formatPKR(getMonthlyEquivalent({
                  limit: parseFloat(formData.limit) || 0,
                  period: formData.period
                })) : '₨ 0'}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Period *
              </label>
              <select
                value={formData.period}
                onChange={(e) => setFormData({...formData, period: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                {periods.map(period => (
                  <option key={period.value} value={period.value}>{period.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
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
                  Creating...
                </>
              ) : (
                <>
                  <FaPlus className="mr-2" />
                  Create Budget
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Budgets Grid */}
      {budgets.length > 0 ? (
        <>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Active Budgets</h3>
            <p className="text-sm text-gray-600">{budgets.length} budget{budgets.length !== 1 ? 's' : ''} active</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgets.map((budget) => {
              const progress = calculateProgress(budget);
              const isOverBudget = progress >= 100;
              const remaining = budget.limit - budget.spent;
              const monthlyEquivalent = getMonthlyEquivalent(budget);
              
              return (
                <div key={budget._id} className="bg-white rounded-xl shadow-sm p-6 border hover:border-primary-300 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center">
                        <h3 className="text-lg font-semibold text-gray-800">{budget.category}</h3>
                        <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Monthly equivalent: {formatPKR(monthlyEquivalent)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Started: {new Date(budget.startDate).toLocaleDateString('en-PK')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(budget._id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="Delete budget"
                    >
                      <FaTrash />
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">
                        Spent: {formatPKRDecimal(budget.spent)}
                      </span>
                      <span className="text-gray-600">
                        Limit: {formatPKRDecimal(budget.limit)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${getProgressColor(progress)} transition-all duration-300`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500">
                        {remaining >= 0 ? 'Remaining:' : 'Overspent:'}
                      </span>
                      <span className={getProgressTextColor(progress)}>
                        {progress.toFixed(1)}% spent
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-2">
                    <div className="flex justify-between">
                      <span>Balance:</span>
                      <span className={`font-medium ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatPKRDecimal(Math.abs(remaining))}
                        {remaining < 0 && ' over'}
                      </span>
                    </div>
                    
                    {budget.period === 'monthly' && (
                      <div className="flex justify-between">
                        <span>Daily average (this month):</span>
                        <span className="font-medium">
                          {formatPKRDecimal(budget.spent / new Date().getDate())}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span>Projected monthly:</span>
                      <span className="font-medium">
                        {formatPKRDecimal(monthlyEquivalent)}
                      </span>
                    </div>
                  </div>
                  
                  {isOverBudget && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center animate-pulse">
                      <FaExclamationTriangle className="text-red-500 mr-2 flex-shrink-0" />
                      <span className="text-sm text-red-600">
                        Over budget by {formatPKRDecimal(budget.spent - budget.limit)}!
                      </span>
                    </div>
                  )}
                  
                  {progress >= 80 && progress < 100 && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center">
                      <FaExclamationTriangle className="text-yellow-500 mr-2 flex-shrink-0" />
                      <span className="text-sm text-yellow-600">
                        Warning: {progress.toFixed(1)}% spent
                      </span>
                    </div>
                  )}
                  
                  {progress < 50 && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <span className="text-sm text-green-600">
                        ✓ Good progress: {progress.toFixed(1)}% spent
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm">
          <div className="text-gray-400 mb-4">
            <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3 className="text-2xl font-medium text-gray-900 mb-2">No budgets yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Create your first budget to start tracking your spending in Pakistani Rupees
          </p>
          <div className="inline-flex flex-col items-center">
            <p className="text-sm text-gray-400 mb-4">Common budget categories:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {categories.slice(0, 8).map(cat => (
                <span key={cat} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Budget Tips for Pakistan */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
          <FaChartPie className="mr-2" />
          Budgeting Tips for Pakistan
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="font-medium text-blue-700 mb-2">General Guidelines</h5>
            <ul className="text-blue-600 space-y-1.5 text-sm">
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>Allocate 35-40% of income to housing and utilities</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>Food expenses should be around 20-25% of monthly income</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>Transportation costs average 10-15% in urban areas</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>Include 5-10% for Zakat and charity</span>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-blue-700 mb-2">Local Considerations</h5>
            <ul className="text-blue-600 space-y-1.5 text-sm">
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>Account for seasonal inflation and utility bill fluctuations</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>Budget for festivals (Eid, weddings, religious events)</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>Include mobile load and internet packages in utilities</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>Consider saving in PKR-denominated savings schemes</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-blue-200">
          <p className="text-sm text-blue-600 italic">
            💡 Tip: Adjust your budgets during Ramadan and Eid seasons as spending patterns change.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Budgets;