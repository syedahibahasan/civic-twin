import React, { useState } from 'react';
import { Users, RefreshCw, TrendingUp, DollarSign, GraduationCap, Calendar, MessageCircle, Database, AlertCircle } from 'lucide-react';
import useConstituents from '../hooks/useConstituents';
import ConstituentChat from './ConstituentChat';
import { DigitalTwin } from '../types';

const ConstituentList: React.FC = () => {
  const { constituents, isLoading, error, refresh, stats, totalPopulation, censusDemographics } = useConstituents(20);
  const [selectedConstituent, setSelectedConstituent] = useState<DigitalTwin | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  const openChat = (constituent: DigitalTwin) => {
    setSelectedConstituent(constituent);
    setIsChatOpen(true);
  };

  const closeChat = () => {
    setIsChatOpen(false);
    setSelectedConstituent(null);
  };

  // Filter constituents based on type
  const filteredConstituents = constituents.filter(constituent => {
    if (filterType === 'all') return true;
    
    const occupation = constituent.occupation.toLowerCase();
    const story = constituent.personalStory.toLowerCase();
    
    switch (filterType) {
      case 'students':
        return occupation.includes('student') || story.includes('student') || story.includes('college') || story.includes('university');
      case 'professionals':
        return occupation.includes('engineer') || occupation.includes('manager') || occupation.includes('analyst') || occupation.includes('consultant');
      case 'business':
        return occupation.includes('owner') || occupation.includes('entrepreneur') || story.includes('business') || story.includes('company');
      case 'seniors':
        return constituent.age > 65 || story.includes('retire') || story.includes('senior');
      case 'parents':
        return story.includes('parent') || story.includes('child') || story.includes('family');
      case 'veterans':
        return story.includes('veteran') || story.includes('military') || story.includes('service');
      case 'healthcare':
        return occupation.includes('nurse') || occupation.includes('doctor') || occupation.includes('medical') || occupation.includes('healthcare');
      case 'teachers':
        return occupation.includes('teacher') || occupation.includes('professor') || occupation.includes('educator');
      default:
        return true;
    }
  });

  // Check if we have real Census data (district-level or valid ZIP codes)
  const hasRealData = totalPopulation > 0 && (censusDemographics || constituents.some(c => c.zipCode && c.zipCode.length === 5));

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
    <>
      <div className="space-y-6">
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
            
            {/* Filter Dropdown */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Filter constituents by type"
            >
              <option value="all">All Constituents</option>
              <option value="students">Students</option>
              <option value="professionals">Professionals</option>
              <option value="business">Business Owners</option>
              <option value="seniors">Seniors</option>
              <option value="parents">Parents</option>
              <option value="veterans">Veterans</option>
              <option value="healthcare">Healthcare Workers</option>
              <option value="teachers">Teachers</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={refresh}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

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
          {filteredConstituents.map((constituent) => (
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
              
              {/* Political Policies Section */}
              {constituent.politicalPolicies && constituent.politicalPolicies.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs text-blue-800 font-medium mb-2">Political Policies Supported:</p>
                  <div className="space-y-1">
                    {constituent.politicalPolicies.map((policy, index) => (
                      <p key={index} className="text-xs text-blue-700">• {policy}</p>
                    ))}
                  </div>
                </div>
              )}
              
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

        {filteredConstituents.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No constituents found for your district.</p>
          </div>
        )}
      </div>

      {/* Chat Modal - Rendered outside main container */}
      {selectedConstituent && (
        <ConstituentChat
          constituent={selectedConstituent}
          isOpen={isChatOpen}
          onClose={closeChat}
        />
      )}
    </>
  );
};

export default ConstituentList; 