import React, { useMemo, memo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const AllocationChart = memo(({ allocation, coins }) => {
  if (!allocation || Object.keys(allocation).length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Portfolio Allocation</h3>
        <div className="text-center py-12 text-gray-500">
          No allocation data available
        </div>
      </div>
    );
  }

  // Colors for each coin
  const coinColors = {
    bitcoin: '#F7931A',
    ethereum: '#627EEA',
    tether: '#26A17B',
    bnb: '#F0B90B',
    solana: '#00FFA3',
    ripple: '#23292F'
  };

  // Memoize chart data
  const { chartData, chartOptions } = useMemo(() => {
    // Prepare data for chart
    const labels = Object.keys(allocation).map(coinId => allocation[coinId].symbol);
    const data = Object.keys(allocation).map(coinId => allocation[coinId].percentage);
    
    const backgroundColors = Object.keys(allocation).map(coinId => 
      coinColors[coinId] || `#${Math.floor(Math.random()*16777215).toString(16)}`
    );

    const chartData = {
      labels,
      datasets: [{
        data,
        backgroundColor: backgroundColors,
        borderWidth: 1,
        borderColor: '#ffffff',
        hoverOffset: 10 // Add hover effect
      }]
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        animateScale: true,
        animateRotate: true,
        duration: 1000,
        easing: 'easeOutQuart'
      },
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 12,
            padding: 15,
            usePointStyle: true,
            font: {
              size: 11
            }
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.raw;
              const coinId = Object.keys(allocation).find(id => 
                allocation[id].symbol === label
              );
              const amount = allocation[coinId]?.amount || 0;
              return `${label}: ${value.toFixed(1)}% (${amount.toLocaleString()} PKR)`;
            }
          }
        }
      },
      cutout: '60%' // Make it a doughnut chart
    };

    return { chartData, chartOptions };
  }, [allocation]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">Portfolio Allocation</h3>
      <div className="h-64">
        <Doughnut 
          data={chartData} 
          options={chartOptions}
          key={JSON.stringify(allocation)} // Force re-render only when allocation changes
        />
      </div>
      <div className="mt-4 space-y-2">
        {coins?.map((coin) => (
          <div key={coin.coinId} className="flex justify-between items-center">
            <div className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: coinColors[coin.coinId] || '#6B7280' }}
              ></div>
              <span className="text-sm text-gray-600">{coin.symbol}</span>
            </div>
            <span className="text-sm font-medium">
              {allocation[coin.coinId]?.percentage?.toFixed(1) || '0'}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

export default AllocationChart;