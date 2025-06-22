import React, { useState } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { 
  Building2,
  Users, 
  Upload, 
  User, 
  LogOut,
  Menu,
  X,
  MapPin, 
  Flag, 
  FileText, 
  DollarSign,
  BarChart3,
  Calendar,
  Home,
  BookOpen,
  AlertTriangle
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import useConstituents from '../hooks/useConstituents';
import UploadPage from './Upload';
import Profile from './Profile';
import ConstituentList from '../components/ConstituentList';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const Dashboard: React.FC = () => {
  const { state, logout } = useAuth();
  const { dispatch } = useAppContext();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Set the current district from the authenticated user
  React.useEffect(() => {
    if (state.user?.district) {
      dispatch({ type: 'SET_DISTRICT', payload: state.user.district });
    }
  }, [state.user?.district, dispatch]);

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
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:inset-auto ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">Replicant</span>
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 z-10 sticky top-0">
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
  const { totalPopulation, censusDemographics, censusOccupations, censusAgeGroups, censusEconomicIndicators } = useConstituents(15, true);

  if (!state.user) return null;

  // Prepare pie chart data
  const pieChartData = censusDemographics ? {
    labels: ['White', 'Black', 'Hispanic', 'Asian', 'Other'],
    datasets: [
      {
        data: [
          censusDemographics.white,
          censusDemographics.black,
          censusDemographics.hispanic,
          censusDemographics.asian,
          censusDemographics.other
        ],
        backgroundColor: [
          '#3B82F6', // Blue
          '#1F2937', // Gray
          '#F59E0B', // Amber
          '#10B981', // Emerald
          '#8B5CF6'  // Purple
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  } : null;

  // Prepare bar chart data for age demographics
  const barChartData = censusAgeGroups ? {
    labels: censusAgeGroups.map(item => item.ageRange),
    datasets: [
      {
        label: 'Population',
        data: censusAgeGroups.map(item => item.count),
        backgroundColor: [
          '#3B82F6', // Blue
          '#10B981', // Green
          '#F59E0B', // Amber
          '#EF4444', // Red
          '#8B5CF6', // Purple
          '#06B6D4', // Cyan
          '#84CC16'  // Lime
        ],
        borderColor: [
          '#2563EB',
          '#059669',
          '#D97706',
          '#DC2626',
          '#7C3AED',
          '#0891B2',
          '#65A30D'
        ],
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }
    ]
  } : null;

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: { label: string; parsed: number }) {
            return `${context.label}: ${context.parsed}%`;
          }
        }
      }
    }
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context: { parsed: { y: number } }) {
            return `Population: ${context.parsed.y.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(tickValue: string | number) {
            if (typeof tickValue === 'number') {
              return tickValue.toLocaleString();
            }
            return tickValue;
          }
        }
      }
    }
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

      {/* Census Data Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">District Census Overview</h2>
        </div>
        
        {/* Census Demographics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Total Population Widget */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Users className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900">Total Population</h3>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {totalPopulation > 0 ? totalPopulation.toLocaleString() : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">residents in district</p>
            </div>
          </div>

          {/* Median Income Widget */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-2 mb-3">
              <DollarSign className="h-4 w-4 text-green-600" />
              <h3 className="text-sm font-semibold text-gray-900">Median Income</h3>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {censusEconomicIndicators?.medianIncome ? 
                  `$${censusEconomicIndicators.medianIncome.toLocaleString()}` : 
                  'N/A'
                }
              </p>
              <p className="text-xs text-gray-500 mt-1">household income</p>
            </div>
          </div>

          {/* Homeownership Rate Widget */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Home className="h-4 w-4 text-purple-600" />
              <h3 className="text-sm font-semibold text-gray-900">Homeownership</h3>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {censusEconomicIndicators?.homeownershipRate !== undefined ? 
                  `${censusEconomicIndicators.homeownershipRate}%` : 
                  'N/A'
                }
              </p>
              <p className="text-xs text-gray-500 mt-1">own their homes</p>
            </div>
          </div>

          {/* College Rate Widget */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-2 mb-3">
              <BookOpen className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-gray-900">College Educated</h3>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600">
                {censusEconomicIndicators?.collegeRate !== undefined ? 
                  `${censusEconomicIndicators.collegeRate}%` : 
                  'N/A'
                }
              </p>
              <p className="text-xs text-gray-500 mt-1">have college degree</p>
            </div>
          </div>
        </div>

        {/* Charts and Detailed Data Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Racial Demographics Pie Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-2 mb-3">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900">Racial Demographics</h3>
            </div>
            <div className="h-48">
              {censusDemographics && pieChartData ? (
                <Pie data={pieChartData} options={pieChartOptions} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <p>N/A - Data not available</p>
                </div>
              )}
            </div>
          </div>

          {/* Age Demographics Bar Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Calendar className="h-4 w-4 text-purple-600" />
              <h3 className="text-sm font-semibold text-gray-900">Age Distribution</h3>
            </div>
            <div className="h-48">
              {censusAgeGroups && barChartData ? (
                <Bar data={barChartData} options={barChartOptions} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <p>N/A - Data not available</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Jobs */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Users className="h-4 w-4 text-green-600" />
              <h3 className="text-sm font-semibold text-gray-900">Top Occupations</h3>
            </div>
            <div className="space-y-2">
              {censusOccupations && censusOccupations.length > 0 ? (
                censusOccupations.map((job, index) => (
                  <div key={job.job} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold">
                        {index + 1}
                      </div>
                      <p className="text-xs font-medium text-gray-900">{job.job}</p>
                    </div>
                    <p className="text-xs font-semibold text-green-600">{job.percentage}%</p>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <p>N/A - Data not available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Poverty Rate Warning */}
        {censusEconomicIndicators && censusEconomicIndicators.povertyRate > 10 && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <p className="text-sm text-orange-800">
                <span className="font-medium">Poverty Rate: {censusEconomicIndicators.povertyRate}%</span> - 
                This district has a higher than average poverty rate, indicating significant economic challenges.
              </p>
            </div>
          </div>
        )}

        {/* Data Availability Notice */}
        {!censusDemographics && !censusAgeGroups && !censusOccupations && !censusEconomicIndicators && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Census Data Unavailable</span> - 
                Census data for this district is not currently available. Constituent data will be generated using default values.
              </p>
            </div>
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-blue-200">
          <p className="text-sm text-gray-600 text-center">
            All data sourced from U.S. Census Bureau American Community Survey (ACS) API
          </p>
        </div>
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
    </div>
  );
};

export default Dashboard; 