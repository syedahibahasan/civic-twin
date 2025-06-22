import React, { useState } from 'react';
import { Users, RefreshCw, TrendingUp, DollarSign, GraduationCap, Calendar, MessageCircle, Database, AlertCircle, BarChart3, Briefcase, Home, BookOpen, AlertTriangle } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import useConstituents from '../hooks/useConstituents';
import ConstituentChat from './ConstituentChat';
import { DigitalTwin } from '../types';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const ConstituentList: React.FC = () => {
  const { constituents, isLoading, error, refresh, stats, totalPopulation, censusDemographics, censusOccupations, censusAgeGroups, censusEconomicIndicators } = useConstituents(15);
  const [selectedConstituent, setSelectedConstituent] = useState<DigitalTwin | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const openChat = (constituent: DigitalTwin) => {
    setSelectedConstituent(constituent);
    setIsChatOpen(true);
  };

  const closeChat = () => {
    setIsChatOpen(false);
    setSelectedConstituent(null);
  };

  // Check if we have real Census data (district-level or valid ZIP codes)
  const hasRealData = totalPopulation > 0 && (censusDemographics || constituents.some(c => c.zipCode && c.zipCode.length === 5));

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Generating constituents from Census data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={refresh}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Census Data Summary */}
      {totalPopulation > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">District Census Overview</h2>
          </div>
          
          {/* Census Demographics Grid */}
          {(censusDemographics || censusAgeGroups || censusOccupations || censusEconomicIndicators) && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Total Population Widget */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Users className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Total Population</h3>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{totalPopulation.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">residents in district</p>
                </div>
              </div>

              {/* Median Income Widget */}
              {censusEconomicIndicators && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Median Income</h3>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">${censusEconomicIndicators.medianIncome.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">household income</p>
                  </div>
                </div>
              )}

              {/* Homeownership Rate Widget */}
              {censusEconomicIndicators && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Home className="h-4 w-4 text-purple-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Homeownership</h3>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{censusEconomicIndicators.homeownershipRate}%</p>
                    <p className="text-xs text-gray-500 mt-1">own their homes</p>
                  </div>
                </div>
              )}

              {/* College Rate Widget */}
              {censusEconomicIndicators && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <BookOpen className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-sm font-semibold text-gray-900">College Educated</h3>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-600">{censusEconomicIndicators.collegeRate}%</p>
                    <p className="text-xs text-gray-500 mt-1">have college degree</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Charts and Detailed Data Grid */}
          {(censusDemographics || censusAgeGroups || censusOccupations) && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              {/* Racial Demographics Pie Chart */}
              {censusDemographics && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Racial Demographics</h3>
                  </div>
                  <div className="h-48">
                    {pieChartData && <Pie data={pieChartData} options={pieChartOptions} />}
                  </div>
                </div>
              )}

              {/* Age Demographics Bar Chart */}
              {censusAgeGroups && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Age Distribution</h3>
                  </div>
                  <div className="h-48">
                    {barChartData && <Bar data={barChartData} options={barChartOptions} />}
                  </div>
                </div>
              )}

              {/* Top Jobs */}
              {censusOccupations && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Briefcase className="h-4 w-4 text-green-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Top Occupations</h3>
                  </div>
                  <div className="space-y-2">
                    {censusOccupations.map((job, index) => (
                      <div key={job.job} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold">
                            {index + 1}
                          </div>
                          <p className="text-xs font-medium text-gray-900">{job.job}</p>
                        </div>
                        <p className="text-xs font-semibold text-green-600">{job.percentage}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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
          
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-sm text-gray-600 text-center">
              All data sourced from U.S. Census Bureau American Community Survey (ACS) API
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Your Constituents</h2>
        </div>
        <div className="flex items-center space-x-3">
          {/* Data Source Indicator */}
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm">
            {hasRealData ? (
              <div className="flex items-center space-x-1 text-green-700 bg-green-50 px-2 py-1 rounded-full">
                <Database className="h-4 w-4" />
                <span>Real Census Data</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-orange-700 bg-orange-50 px-2 py-1 rounded-full">
                <AlertCircle className="h-4 w-4" />
                <span>Mock Data</span>
              </div>
            )}
          </div>
          
          <button
            onClick={refresh}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Data Source Info */}
      {hasRealData && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-green-600" />
            <h3 className="text-sm font-medium text-green-800">Real Census Data Active</h3>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Constituent profiles are generated using real demographic data from the U.S. Census Bureau's American Community Survey (ACS) API. 
            {totalPopulation > 0 && censusDemographics ? ' Using direct district-level census data for accurate population and demographic information.' : ' Using ZIP code aggregated census data.'}
          </p>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-600">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalConstituents}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-sm text-gray-600">Avg Income</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">${stats.averageIncome.toLocaleString()}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <span className="text-sm text-gray-600">Avg Age</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.averageAge}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <span className="text-sm text-gray-600">Diversity</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.demographics).length}</p>
          </div>
        </div>
      )}

      {/* Constituent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {constituents.map((constituent) => (
          <div key={constituent.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{constituent.name}</h3>
                <p className="text-sm text-gray-600">{constituent.age} years old</p>
              </div>
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {constituent.demographics}
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">{constituent.education}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">${constituent.annualIncome.toLocaleString()}/year</span>
              </div>
              
              <div className="text-sm text-gray-600">
                <p className="font-medium">{constituent.occupation}</p>
                <p className="text-xs mt-1 flex items-center space-x-1">
                  <span>
                    {constituent.zipCode.includes('-') ? `District: ${constituent.zipCode}` : `ZIP: ${constituent.zipCode}`}
                  </span>
                  {hasRealData && (
                    <Database className="h-3 w-3 text-green-600" />
                  )}
                </p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600 line-clamp-3">{constituent.personalStory}</p>
            </div>
            
            {constituent.policyImpact !== 'To be determined based on policy analysis' && (
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                <p className="text-xs text-green-800 font-medium">Policy Impact:</p>
                <p className="text-xs text-green-700">{constituent.policyImpact}</p>
              </div>
            )}

            {/* Chat Button */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => openChat(constituent)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Chat with {constituent.name.split(' ')[0]}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {constituents.length === 0 && (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No constituents found for your district.</p>
        </div>
      )}

      {/* Chat Modal */}
      {selectedConstituent && (
        <ConstituentChat
          constituent={selectedConstituent}
          isOpen={isChatOpen}
          onClose={closeChat}
        />
      )}
    </div>
  );
};

export default ConstituentList; 