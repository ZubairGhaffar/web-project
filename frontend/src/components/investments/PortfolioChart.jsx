import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PortfolioChart = ({ analytics, formatCurrency, userCurrency }) => {
  if (!analytics || !analytics.coinBreakdown || analytics.coinBreakdown.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Portfolio Value</h3>
        <div className="text-center py-12 text-gray-500">
          No investment data available
        </div>
      </div>
    );
  }

  // Prepare data for chart
  const labels = analytics.coinBreakdown.map(coin => coin.symbol);
  const investedData = analytics.coinBreakdown.map(coin => coin.totalInvested);
  const currentData = analytics.coinBreakdown.map(coin => coin.totalCurrentValue);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Invested Amount',
        data: investedData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Current Value',
        data: currentData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Portfolio Value by Coin'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.raw;
            return `${label}: ${formatCurrency(value)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatCurrency(value)
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">Portfolio Performance</h3>
      <div className="h-80">
        <Line data={chartData} options={chartOptions} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          <span className="text-gray-600">Total Invested: {formatCurrency(analytics.totalInvested)}</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span className="text-gray-600">Current Value: {formatCurrency(analytics.totalCurrentValue)}</span>
        </div>
      </div>
    </div>
  );
};

export default PortfolioChart;