// frontend/src/components/investments/PerformanceChart.jsx
import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const PerformanceChart = ({ analytics, formatPercentage }) => {
  if (!analytics || !analytics.coinBreakdown || analytics.coinBreakdown.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Performance by Coin</h3>
        <div className="text-center py-12 text-gray-500">
          No performance data available
        </div>
      </div>
    );
  }

  // Sort coins by performance
  const sortedCoins = [...analytics.coinBreakdown].sort((a, b) => 
    b.profitLossPercentage - a.profitLossPercentage
  );

  const labels = sortedCoins.map(coin => coin.symbol);
  const data = sortedCoins.map(coin => coin.profitLossPercentage);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Return %',
        data,
        backgroundColor: data.map(value => 
          value >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'
        ),
        borderColor: data.map(value => 
          value >= 0 ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'
        ),
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Performance by Coin (%)'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const coin = sortedCoins[context.dataIndex];
            return [
              `${coin.coinName}: ${formatPercentage(coin.profitLossPercentage)}`,
              `Profit/Loss: ${coin.totalProfitLoss.toLocaleString()} PKR`
            ];
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: (value) => `${value}%`
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">Performance by Coin</h3>
      <div className="h-64">
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default PerformanceChart;