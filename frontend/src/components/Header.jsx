import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBell, FaSearch, FaUserCircle, FaSignOutAlt, FaCog, FaEdit, FaChartLine, FaWallet } from 'react-icons/fa';
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
  const hasProfileImage = user?.profileImage; // Assuming user object has profileImage property

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Section - Date Display */}
        <div className="flex items-center space-x-4">
          <div className="text-left">
            <p className="text-sm text-gray-600">{format(new Date(), 'EEEE')}</p>
            <p className="font-medium text-gray-900">{format(new Date(), 'MMMM d, yyyy')}</p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-6">
          {/* Notifications */}
          <div className="relative">
            <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors duration-200">
              <FaBell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-1 hover:bg-gray-50 rounded-full transition-all duration-200"
            >
              <div className="hidden md:block text-right">
                <p className="font-medium text-gray-900">{user?.name}</p>
                <p className="text-sm text-gray-600">
                  {user?.monthlyIncome ? `$${user.monthlyIncome}/month` : 'Set income'}
                </p>
              </div>
              
              {/* User Avatar - Shows image if available, otherwise shows initial */}
              <div className="relative group">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 group-hover:border-blue-500 transition-colors duration-200">
                  {hasProfileImage ? (
                    <img 
                      src={user.profileImage} 
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {userInitial}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-30 bg-black bg-opacity-10"
                  onClick={() => setShowUserMenu(false)}
                ></div>
                
                {/* Dropdown Card */}
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-40 overflow-hidden animate-fadeIn">
                  {/* Profile Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-3 border-white/20">
                          {hasProfileImage ? (
                            <img 
                              src={user.profileImage} 
                              alt={user.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-white/20 to-white/40 flex items-center justify-center text-white font-bold text-2xl">
                              {userInitial}
                            </div>
                          )}
                        </div>
                        <button className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full flex items-center justify-center text-blue-600 hover:bg-gray-100">
                          <FaEdit className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{user?.name}</h3>
                        <p className="text-blue-100 text-sm">{user?.email}</p>
                        {user?.monthlyIncome && (
                          <div className="mt-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1 inline-block">
                            <span className="text-sm font-medium">
                              ${user.monthlyIncome}/month
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <FaWallet className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                        <p className="text-xs text-gray-600">Balance</p>
                        <p className="font-bold text-gray-900">$2,540</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <FaChartLine className="w-5 h-5 text-green-600 mx-auto mb-1" />
                        <p className="text-xs text-gray-600">Income</p>
                        <p className="font-bold text-gray-900">$4,200</p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <FaChartLine className="w-5 h-5 text-red-600 mx-auto mb-1" />
                        <p className="text-xs text-gray-600">Expenses</p>
                        <p className="font-bold text-gray-900">$1,660</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <Link
                      to="/profile"
                      className="flex items-center px-5 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <FaUserCircle className="w-5 h-5 mr-3 text-blue-500" />
                      <div className="flex-1">
                        <span className="font-medium">My Profile</span>
                        <p className="text-xs text-gray-500">View and edit profile</p>
                      </div>
                    </Link>
                    
                    <Link
                      to="/dashboard"
                      className="flex items-center px-5 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <FaChartLine className="w-5 h-5 mr-3 text-green-500" />
                      <div className="flex-1">
                        <span className="font-medium">Dashboard</span>
                        <p className="text-xs text-gray-500">Financial overview</p>
                      </div>
                    </Link>
                  </div>

                  {/* Logout Section */}
                  <div className="border-t border-gray-100 py-2 bg-gray-50">
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-5 py-3 text-red-600 hover:bg-red-50 transition-colors duration-150"
                    >
                      <FaSignOutAlt className="w-5 h-5 mr-3" />
                      <span className="font-medium">Logout</span>
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