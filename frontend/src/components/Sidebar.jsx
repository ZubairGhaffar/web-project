import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  FaHome, 
  FaExchangeAlt, 
  FaChartPie, 
  FaChartLine,
  FaCog,
  FaSignOutAlt,
  FaUser
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems = [
    { path: '/', icon: <FaHome />, label: 'Dashboard' },
    { path: '/transactions', icon: <FaExchangeAlt />, label: 'Transactions' },
    { path: '/budgets', icon: <FaChartPie />, label: 'Budgets' },
    { path: '/investments', icon: <FaChartLine />, label: 'Investments' },
    { path: '/reports', icon: <FaChartLine />, label: 'Reports' },
  ];

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Get user initial
  const userInitial = user?.name?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <FaChartLine className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Fin Safe</h1>
            <p className="text-xs text-gray-400">Personal Finance</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <span className="w-5 h-5">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User & Settings */}
      <div className="p-4 border-t border-gray-800">

       
        
        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-red-900 hover:text-red-200 w-full rounded-lg transition-colors mt-4"
        >
          <FaSignOutAlt className="w-5 h-5" />
          <span>Logout</span>
        </button>

        {/* App Version */}
        <div className="mt-6 pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center">
            FIN SAFE v1.0.0
          </p>
          <p className="text-xs text-gray-500 text-center mt-1">
            {user?.currency || 'USD'} • Personal Edition
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;