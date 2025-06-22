import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, AlertTriangle, CheckCircle, Users, TrendingUp, Download } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { generatePolicySuggestions } from '../services/aiService';
import LoadingSpinner from '../components/LoadingSpinner';

const Analysis: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!state.currentPolicy || state.digitalTwins.length === 0) {
      navigate('/upload');
      return;
    }

    if (state.suggestions.length === 0) {
      generateSuggestions();
    }
  }, [state.currentPolicy, state.digitalTwins]);

  const generateSuggestions = async () => {
    if (!state.currentPolicy) return;
    
    setIsGenerating(true);
    try {
      const suggestions = await generatePolicySuggestions(state.digitalTwins, state.currentPolicy);
      dispatch({ type: 'SET_SUGGESTIONS', payload: suggestions });
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-700 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'low': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return AlertTriangle;
      case 'medium': return TrendingUp;
      case 'low': return CheckCircle;
      default: return AlertTriangle;
    }
  };

  if (!state.currentPolicy) {
    return null;
  }

  if (isGenerating) {
    return <LoadingSpinner text="Analyzing policy impact and generating suggestions..." />;
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Impact Analysis & Suggestions</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Based on our simulation with {state.digitalTwins.length} digital twins, here's how your policy 
          affects constituents and recommendations for improvement.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{state.digitalTwins.length}</p>
              <p className="text-sm text-gray-600">Digital Twins Analyzed</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{state.suggestions.length}</p>
              <p className="text-sm text-gray-600">Improvement Suggestions</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {state.suggestions.filter(s => s.severity === 'high').length}
              </p>
              <p className="text-sm text-gray-600">High Priority Issues</p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Insights</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Most Affected Demographics</h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• Part-time students (75% negatively affected)</li>
              <li>• Working families earning $30-50k (68% affected)</li>
              <li>• Single parents pursuing education (82% affected)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Positive Outcomes</h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• Increased work-study opportunities</li>
              <li>• Better resource allocation for full-time students</li>
              <li>• Potential reduction in program abuse</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Suggestions */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">Recommendations for Improvement</h2>
        
        {state.suggestions.map((suggestion) => {
          const Icon = getSeverityIcon(suggestion.severity);
          
          return (
            <div
              key={suggestion.id}
              className={`border rounded-xl p-6 ${getSeverityColor(suggestion.severity)}`}
            >
              <div className="flex items-start space-x-4">
                <Icon className="h-6 w-6 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold">{suggestion.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      suggestion.severity === 'high' ? 'bg-red-100 text-red-800' :
                      suggestion.severity === 'medium' ? 'bg-amber-100 text-amber-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {suggestion.severity.toUpperCase()} PRIORITY
                    </span>
                  </div>
                  <p className="mb-3">{suggestion.description}</p>
                  <p className="text-sm font-medium">
                    Impact: {suggestion.impactedPopulation}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Next Steps</h2>
        <div className="flex flex-wrap gap-4">
          <button className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="h-4 w-4" />
            <span>Download Full Report</span>
          </button>
          <button
            onClick={() => navigate('/upload')}
            className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Analyze New Policy
          </button>
        </div>
      </div>
    </div>
  );
};

export default Analysis;