import React, { useState } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { 
  Building2, 
  Upload, 
  User, 
  LogOut, 
  Menu, 
  X,
  FileText,
  Users,
  MapPin,
  Flag,
  MessageCircle,
  TrendingUp,
  DollarSign,
  GraduationCap,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UploadPage from './Upload';
import Profile from './Profile';
import ConstituentList from '../components/ConstituentList';
import useConstituents from '../hooks/useConstituents';
import { DigitalTwin } from '../types';
import ConstituentChat from '../components/ConstituentChat';

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
    { path: '/dashboard/constituents', label: 'Constituents', icon: Users },
    { path: '/dashboard/upload', label: 'Upload Policy', icon: Upload },
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
            title="Close sidebar"
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
                title="Open sidebar"
              >
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
                <span>Welcome back,</span>
                <span className="font-medium text-gray-900">{state.user.name}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/constituents" element={<ConstituentList />} />
            <Route path="/upload" element={<UploadPage />} />
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
  const { constituents, isLoading, error, refreshCommonTypes, totalPopulation, censusDemographics } = useConstituents(15, true);
  const [selectedConstituent, setSelectedConstituent] = useState<DigitalTwin | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  if (!state.user) return null;

  const openChat = (constituent: DigitalTwin) => {
    setSelectedConstituent(constituent);
    setIsChatOpen(true);
  };

  const closeChat = () => {
    setIsChatOpen(false);
    setSelectedConstituent(null);
  };

  const quickActions = [
    {
      title: 'View Constituents',
      description: 'See your district\'s demographic profiles',
      icon: Users,
      action: () => navigate('/dashboard/constituents'),
      color: 'bg-indigo-500',
    },
    {
      title: 'Upload New Policy',
      description: 'Analyze a new bill or policy document',
      icon: Upload,
      action: () => navigate('/dashboard/upload'),
      color: 'bg-blue-500',
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
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {state.user.name}!</h1>
            <p className="text-lg text-gray-600 mt-2">Ready to analyze policy impact on your constituents?</p>
            <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500">
              <span className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>{state.user.district}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Flag className="h-4 w-4" />
                <span>{state.user.party}</span>
              </span>
              {state.user.committee && (
                <span className="flex items-center space-x-1">
                  <FileText className="h-4 w-4" />
                  <span>{state.user.committee}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* District Overview with Census Data */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">District Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{totalPopulation.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Population</div>
          </div>
          {censusDemographics && (
            <>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{censusDemographics.hispanic}%</div>
                <div className="text-sm text-gray-600">Hispanic/Latino</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{censusDemographics.asian}%</div>
                <div className="text-sm text-gray-600">Asian</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Common Constituent Types */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Common Constituent Types</h2>
          <button
            onClick={refreshCommonTypes}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <TrendingUp className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Generating constituent profiles...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
            <button
              onClick={refreshCommonTypes}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {constituents.slice(0, 9).map((constituent) => (
              <div key={constituent.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{constituent.name}</h3>
                    <p className="text-sm text-gray-600">{constituent.age} years old • {constituent.demographics}</p>
                  </div>
                  <button
                    onClick={() => openChat(constituent)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Chat with constituent"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2">
                    <Briefcase className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{constituent.occupation}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{constituent.education}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700">${constituent.annualIncome.toLocaleString()}/year</span>
                  </div>
                </div>

                <div className="text-sm text-gray-600 line-clamp-3">
                  {constituent.personalStory.substring(0, 120)}...
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className="bg-white rounded-lg border border-gray-200 p-6 text-left hover:shadow-md transition-shadow duration-200"
            >
              <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4`}>
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{action.title}</h3>
              <p className="text-sm text-gray-600">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Modal */}
      {isChatOpen && selectedConstituent && (
        <ConstituentChat
          constituent={selectedConstituent}
          isOpen={isChatOpen}
          onClose={closeChat}
        />
      )}
    </div>
  );
};

export default Dashboard; 