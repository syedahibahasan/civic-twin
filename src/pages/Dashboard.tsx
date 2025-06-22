import React, { useState } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { 
  Building2, 
  Upload, 
  BarChart3, 
  User, 
  LogOut, 
  Menu, 
  X,
  FileText,
  Users,
  MapPin,
  Flag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UploadPage from './Upload';
import Analysis from './Analysis';
import Profile from './Profile';

const Dashboard: React.FC = () => {
  const { state, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Building2 },
    { path: '/dashboard/upload', label: 'Upload Policy', icon: Upload },
    { path: '/dashboard/analysis', label: 'Analysis', icon: BarChart3 },
    { path: '/dashboard/profile', label: 'Profile', icon: User },
  ];

  if (!state.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">CivicTwin</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* User Profile Section */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <img
              src={state.user.avatar}
              alt={state.user.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">{state.user.name}</h3>
              <p className="text-xs text-gray-500 truncate">{state.user.district}</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }) => (
            <button
              key={path}
              onClick={() => {
                navigate(path);
                setSidebarOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-3 py-3 text-sm font-medium rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200"
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </nav>

        {/* Logout Section */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-3 text-sm font-medium rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors duration-200"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 z-10">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
                <span>Welcome back,</span>
                <span className="font-medium text-gray-900">{state.user.name.split(' ')[1]}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

// Dashboard Home Component
const DashboardHome: React.FC = () => {
  const { state } = useAuth();
  const navigate = useNavigate();

  if (!state.user) return null;

  const quickActions = [
    {
      title: 'Upload New Policy',
      description: 'Analyze a new bill or policy document',
      icon: Upload,
      action: () => navigate('/dashboard/upload'),
      color: 'bg-blue-500',
    },
    {
      title: 'View Analysis',
      description: 'Review previous policy impact analysis',
      icon: BarChart3,
      action: () => navigate('/dashboard/analysis'),
      color: 'bg-emerald-500',
    },
    {
      title: 'Update Profile',
      description: 'Manage your congressional profile',
      icon: User,
      action: () => navigate('/dashboard/profile'),
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center space-x-6">
          <img
            src={state.user.avatar}
            alt={state.user.name}
            className="w-20 h-20 rounded-full object-cover border-4 border-gray-100 shadow-sm"
          />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {state.user.name.split(' ')[1]}!</h1>
            <p className="text-lg text-gray-600 mt-2">Ready to analyze policy impact on your constituents?</p>
            <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500">
              <span className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>{state.user.district}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Flag className="h-4 w-4" />
                <span>{state.user.state}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Constituent Info Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <MapPin className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{state.user.district}</p>
              <p className="text-sm text-gray-600">Your District</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Flag className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{state.user.state}</p>
              <p className="text-sm text-gray-600">State</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">~750K</p>
              <p className="text-sm text-gray-600">Constituents</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className="text-left p-6 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 bg-white hover:bg-gray-50"
            >
              <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4 shadow-sm`}>
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{action.title}</h3>
              <p className="text-gray-600 leading-relaxed">{action.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 