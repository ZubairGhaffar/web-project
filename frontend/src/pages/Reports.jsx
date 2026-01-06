import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { FaDownload, FaFilter, FaFilePdf, FaFileExcel } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx-js-style';

const Reports = () => {
  const [reportData, setReportData] = useState({
    income: 0,
    expense: 0,
    netBalance: 0,
    categoryBreakdown: [],
    recentTransactions: [],
    topExpenses: []
  });
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [analyticsData, setAnalyticsData] = useState({});
  const [filter, setFilter] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 6)),
    endDate: new Date()
  });
  const [loading, setLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const { user } = useAuth();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4'];

  useEffect(() => {
    fetchReportData();
  }, [filter]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.startDate) params.startDate = filter.startDate.toISOString();
      if (filter.endDate) params.endDate = filter.endDate.toISOString();

      // Fetch all report data in parallel
      const [summaryRes, monthlyRes, analyticsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/transactions/summary', { params }),
        axios.get('http://localhost:5000/api/transactions/monthly-summary', { 
          params: { months: 6 } 
        }),
        axios.get('http://localhost:5000/api/transactions/analytics', { 
          params: { months: 12 } 
        })
      ]);

      setReportData(summaryRes.data);
      setMonthlySummary(monthlyRes.data.monthlySummary || []);
      setAnalyticsData(analyticsRes.data || {});
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
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

  // Export to Excel
const exportToExcel = () => {
  alert('Excel export requires server-side implementation. Please use CSV export instead.');
};

const exportToPDF = () => {
  alert('PDF export requires server-side implementation. Please use CSV export instead.');
};

  // Export to CSV
  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Summary section
    csvContent += "Financial Report Summary\r\n";
    csvContent += `Generated on:,${new Date().toLocaleDateString('en-PK')}\r\n`;
    csvContent += `Report Period:,${filter.startDate.toLocaleDateString('en-PK')} to ${filter.endDate.toLocaleDateString('en-PK')}\r\n\r\n`;
    
    csvContent += "Metric,Amount (PKR)\r\n";
    csvContent += `Total Income,${reportData.income}\r\n`;
    csvContent += `Total Expenses,${reportData.expense}\r\n`;
    csvContent += `Net Balance,${reportData.netBalance}\r\n`;
    csvContent += `Savings Rate,${reportData.analytics?.savingsRate?.toFixed(1) || 0}%\r\n\r\n`;
    
    // Top categories
    csvContent += "Top Expense Categories\r\n";
    csvContent += "Category,Amount (PKR),Percentage\r\n";
    
    reportData.topExpenses?.forEach(cat => {
      const percentage = reportData.expense > 0 ? (cat.total / reportData.expense * 100).toFixed(1) : 0;
      csvContent += `${cat._id},${cat.total},${percentage}%\r\n`;
    });
    
    csvContent += "\r\nMonthly Trends\r\n";
    csvContent += "Month,Income (PKR),Expenses (PKR),Net Balance (PKR)\r\n";
    
    monthlySummary.forEach(item => {
      csvContent += `${item.year}-${item.month.toString().padStart(2, '0')},${item.income},${item.expense},${item.netBalance}\r\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Financial_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = () => {
    switch (exportFormat) {
      case 'excel':
        exportToExcel();
        break;
      case 'pdf':
        exportToPDF();
        break;
      case 'csv':
        exportToCSV();
        break;
      default:
        exportToExcel();
    }
  };

  // Get insights based on data
  const getFinancialInsights = () => {
    const insights = [];
    
    if (reportData.analytics?.expenseToIncomeRatio > 70) {
      insights.push({
        type: 'warning',
        title: 'High Spending',
        message: 'Your expenses are more than 70% of your income. Consider reducing discretionary spending.'
      });
    }
    
    if (reportData.analytics?.savingsRate < 10) {
      insights.push({
        type: 'warning',
        title: 'Low Savings Rate',
        message: 'Your savings rate is below 10%. Try to save at least 20% of your income.'
      });
    }
    
    if (reportData.analytics?.savingsRate > 30) {
      insights.push({
        type: 'success',
        title: 'Excellent Savings',
        message: 'Great job! You\'re saving more than 30% of your income.'
      });
    }
    
    if (reportData.topExpenses?.length > 0) {
      const topCategory = reportData.topExpenses[0];
      insights.push({
        type: 'info',
        title: 'Top Spending Category',
        message: `${topCategory._id} accounts for ${((topCategory.total / reportData.expense) * 100).toFixed(1)}% of your expenses.`
      });
    }
    
    if (monthlySummary.length > 0) {
      const bestMonth = monthlySummary.reduce((max, month) => 
        month.netBalance > max.netBalance ? month : max
      );
      insights.push({
        type: 'info',
        title: 'Best Performing Month',
        message: `${bestMonth.year}-${bestMonth.month.toString().padStart(2, '0')} had the highest savings of ${formatPKR(bestMonth.netBalance)}.`
      });
    }
    
    return insights;
  };

  // Prepare chart data
  const getMonthlyChartData = () => {
    return monthlySummary.map(item => ({
      month: `${item.year}-${item.month.toString().padStart(2, '0')}`,
      income: item.income,
      expense: item.expense,
      netBalance: item.netBalance
    }));
  };

  const getCategoryChartData = () => {
    return reportData.categoryBreakdown?.slice(0, 8).map(cat => ({
      name: cat._id,
      value: cat.total
    })) || [];
  };

  const insights = getFinancialInsights();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Financial Reports</h1>
          <p className="text-gray-600">Comprehensive financial analysis and insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="excel">Excel (.xlsx)</option>
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
          </select>
          <button
            onClick={handleExport}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 flex items-center shadow-sm"
          >
            {exportFormat === 'excel' && <FaFileExcel className="mr-2" />}
            {exportFormat === 'pdf' && <FaFilePdf className="mr-2" />}
            {exportFormat === 'csv' && <FaDownload className="mr-2" />}
            Export Report
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading report data...</p>
        </div>
      )}

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center mb-4">
          <FaFilter className="text-primary-600 mr-2" />
          <h3 className="text-lg font-semibold">Report Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <DatePicker
              selected={filter.startDate}
              onChange={(date) => setFilter({...filter, startDate: date})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              dateFormat="dd/MM/yyyy"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <DatePicker
              selected={filter.endDate}
              onChange={(date) => setFilter({...filter, endDate: date})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              dateFormat="dd/MM/yyyy"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
            <input
              type="text"
              value={user?.name || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchReportData}
              disabled={loading}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Apply Filters'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Total Income</h3>
          <p className="text-3xl font-bold">{formatPKR(reportData.income)}</p>
          <div className="mt-2 text-blue-100 text-sm">
            <p>Transactions: {reportData.summary?.find(s => s._id === 'income')?.count || 0}</p>
            <p>Average: {formatPKR(reportData.summary?.find(s => s._id === 'income')?.average || 0)}</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-sm p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Total Expenses</h3>
          <p className="text-3xl font-bold">{formatPKR(reportData.expense)}</p>
          <div className="mt-2 text-red-100 text-sm">
            <p>Transactions: {reportData.summary?.find(s => s._id === 'expense')?.count || 0}</p>
            <p>Categories: {reportData.categoryBreakdown?.length || 0}</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-sm p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Net Savings</h3>
          <p className="text-3xl font-bold">{formatPKR(reportData.netBalance)}</p>
          <div className="mt-2 text-green-100 text-sm">
            <p>Savings Rate: {reportData.analytics?.savingsRate?.toFixed(1) || 0}%</p>
            <p>Expense/Income: {reportData.analytics?.expenseToIncomeRatio?.toFixed(1) || 0}%</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Trend */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Income vs Expense Trend (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getMonthlyChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" tickFormatter={(value) => formatPKR(value)} />
              <Tooltip 
                formatter={(value) => [formatPKRDecimal(value), 'Amount']}
                labelFormatter={(label) => `Period: ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="Income"
              />
              <Line 
                type="monotone" 
                dataKey="expense" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="Expenses"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Expense Distribution</h3>
          {getCategoryChartData().length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getCategoryChartData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getCategoryChartData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [formatPKRDecimal(value), 'Amount']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No expense data available for the selected period
            </div>
          )}
        </div>
      </div>

      {/* Additional Stats and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Monthly Savings */}
        <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Monthly Savings Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={getMonthlyChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" tickFormatter={(value) => formatPKR(value)} />
              <Tooltip 
                formatter={(value) => [formatPKRDecimal(value), 'Amount']}
              />
              <Legend />
              <Bar 
                dataKey="netBalance" 
                fill="#3b82f6" 
                name="Monthly Savings"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Financial Insights */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Financial Insights</h3>
          <div className="space-y-4">
            {insights.length > 0 ? (
              insights.map((insight, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg ${
                    insight.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                    insight.type === 'success' ? 'bg-green-50 border border-green-200' :
                    'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <h4 className={`font-semibold mb-1 ${
                    insight.type === 'warning' ? 'text-yellow-800' :
                    insight.type === 'success' ? 'text-green-800' :
                    'text-blue-800'
                  }`}>
                    {insight.title}
                  </h4>
                  <p className={`text-sm ${
                    insight.type === 'warning' ? 'text-yellow-600' :
                    insight.type === 'success' ? 'text-green-600' :
                    'text-blue-600'
                  }`}>
                    {insight.message}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-500">No insights available for the selected period</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Expense Categories */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Top Expense Categories</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (PKR)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.topExpenses?.map((category, index) => {
                  const percentage = reportData.expense > 0 ? (category.total / reportData.expense * 100).toFixed(1) : 0;
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {category._id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatPKRDecimal(category.total)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {category.count}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-sm text-gray-600">{percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {(!reportData.topExpenses || reportData.topExpenses.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                No expense data available
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {reportData.recentTransactions?.map((transaction) => (
              <div 
                key={transaction._id} 
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    transaction.type === 'income' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '↑' : '↓'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{transaction.title}</p>
                    <p className="text-sm text-gray-500">{transaction.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatPKRDecimal(transaction.amount)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(transaction.date).toLocaleDateString('en-PK')}
                  </p>
                </div>
              </div>
            ))}
            
            {(!reportData.recentTransactions || reportData.recentTransactions.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                No recent transactions
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Summary */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-indigo-800 mb-3">Report Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-medium text-indigo-700 mb-2">Period Analysis</h4>
            <ul className="text-indigo-600 text-sm space-y-1">
              <li>• Report Period: {filter.startDate.toLocaleDateString('en-PK')} - {filter.endDate.toLocaleDateString('en-PK')}</li>
              <li>• Months Analyzed: {monthlySummary.length}</li>
              <li>• Total Categories: {reportData.categoryBreakdown?.length || 0}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-indigo-700 mb-2">Financial Health</h4>
            <ul className="text-indigo-600 text-sm space-y-1">
              <li>• Savings Rate: {reportData.analytics?.savingsRate?.toFixed(1) || 0}%</li>
              <li>• Expense Ratio: {reportData.analytics?.expenseToIncomeRatio?.toFixed(1) || 0}%</li>
              <li>• Average Monthly Net: {formatPKR(monthlySummary.reduce((sum, month) => sum + month.netBalance, 0) / Math.max(monthlySummary.length, 1))}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-indigo-700 mb-2">Recommendations</h4>
            <ul className="text-indigo-600 text-sm space-y-1">
              {insights.some(i => i.type === 'warning') ? (
                <>
                  <li>• Review high-spending categories</li>
                  <li>• Consider creating budgets for top expenses</li>
                  <li>• Aim for 20% savings rate</li>
                </>
              ) : (
                <>
                  <li>• Continue current saving habits</li>
                  <li>• Consider investment opportunities</li>
                  <li>• Review and adjust budgets quarterly</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Installation instructions for export libraries */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
        <p className="font-medium mb-1">Note: Export functionality requires additional libraries</p>
        <p>Install with: <code className="bg-yellow-100 px-2 py-1 rounded">npm install file-saver xlsx-js-style jspdf jspdf-autotable</code></p>
      </div>
    </div>
  );
};

export default Reports;