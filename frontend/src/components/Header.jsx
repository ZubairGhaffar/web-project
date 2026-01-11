import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBell, FaSearch, FaUserCircle, FaSignOutAlt, FaCog } from 'react-icons/fa';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';


const Header = () => {
  const [notifications] = useState([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userInitial = user?.name?.charAt(0).toUpperCase() || 'U';

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Section - Search */}
        <div className="flex-1 max-w-xl">
           
   
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Date Display */}
          <div className="hidden md:block text-right">
            <p className="text-sm text-gray-600">{format(new Date(), 'EEEE')}</p>
            <p className="font-medium">{format(new Date(), 'MMMM d, yyyy')}</p>
          </div>

          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="relative">
              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <FaBell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          )}

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-lg"
            >
              <div className="hidden md:block text-right">
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-gray-600">
                  {user?.monthlyIncome ? `$${user.monthlyIncome}/month` : 'Set income'}
                </p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white font-bold">
                {userInitial}
              </div>
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <div className="p-4 border-b">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {userInitial}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{user?.name}</p>
                        <p className="text-sm text-gray-600">{user?.email}</p>
                        {user?.monthlyIncome && (
                          <p className="text-sm text-green-600 mt-1">
                            Income: ${user.monthlyIncome}/month
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="py-2">
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <FaUserCircle className="w-5 h-5 mr-3 text-gray-400" />
                      <span>Profile Settings</span>
                    </Link>
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <FaCog className="w-5 h-5 mr-3 text-gray-400" />
                      <span>Account Settings</span>
                    </Link>
                  </div>
                  
                  <div className="border-t py-2">
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-3 text-red-600 hover:bg-red-50"
                    >
                      <FaSignOutAlt className="w-5 h-5 mr-3" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;