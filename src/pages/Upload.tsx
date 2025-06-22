import React, { useState, useEffect } from 'react';
import { Upload as UploadIcon, FileText, AlertCircle, CheckCircle, MessageCircle, DollarSign, GraduationCap, BarChart3, AlertTriangle, TrendingUp, Users, Download, Database } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { summarizePolicy, generateDigitalTwins, generatePolicySuggestions } from '../services/aiService';
import { fetchCensusData } from '../services/censusApi';
import LoadingSpinner from '../components/LoadingSpinner';
import ChatModal from '../components/ChatModal';
import { DigitalTwin } from '../types';

const Upload: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { state: authState } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState('');
  const [isGeneratingTwins, setIsGeneratingTwins] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [selectedTwin, setSelectedTwin] = useState<DigitalTwin | null>(null);
  const [inputMethod, setInputMethod] = useState<'upload' | 'text'>('upload');
  const [textInput, setTextInput] = useState('');

  useEffect(() => {
    if (uploadStatus === 'complete' && state.censusData && state.digitalTwins.length === 0) {
      generateTwins();
    }
  }, [uploadStatus, state.censusData]);

  useEffect(() => {
    if (state.digitalTwins.length > 0 && state.suggestions.length === 0) {
      generateSuggestions();
    }
  }, [state.digitalTwins]);

  // Set the current district from the authenticated user
  useEffect(() => {
    if (authState.user?.district && !state.currentDistrict) {
      dispatch({ type: 'SET_DISTRICT', payload: authState.user.district });
    }
  }, [authState.user, state.currentDistrict, dispatch]);

  const generateTwins = async () => {
    console.log('generateTwins called with:', { 
      currentPolicy: !!state.currentPolicy, 
      censusData: !!state.censusData,
      currentDistrict: state.currentDistrict 
    });
    
    if (!state.currentPolicy || !state.censusData) {
      console.log('Missing required data for twin generation:', { 
        hasPolicy: !!state.currentPolicy, 
        hasCensusData: !!state.censusData 
      });
      return;
    }
    
    setIsGeneratingTwins(true);
    try {
      console.log('Generating digital twins...');
      const twins = await generateDigitalTwins(state.censusData, state.currentPolicy);
      console.log('Generated twins:', twins);
      dispatch({ type: 'SET_DIGITAL_TWINS', payload: twins });
    } catch (error) {
      console.error('Error generating digital twins:', error);
    } finally {
      setIsGeneratingTwins(false);
    }
  };

  const generateSuggestions = async () => {
    if (!state.currentPolicy) return;
    
    setIsGeneratingSuggestions(true);
    try {
      const suggestions = await generatePolicySuggestions(state.digitalTwins, state.currentPolicy);
      dispatch({ type: 'SET_SUGGESTIONS', payload: suggestions });
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setIsGeneratingSuggestions(false);
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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setUploadStatus('uploading');

    try {
      const text = await readFileContent(uploadedFile);
      setSummary(text);
      setUploadStatus('processing');

      // Ensure district is set before fetching Census data
      const district = state.currentDistrict || authState.user?.district;
      if (!district) {
        console.error('No district available for Census data fetch');
        setUploadStatus('error');
        return;
      }

      // Fetch census data first
      const censusData = await fetchCensusData(district);
      if (censusData) {
        dispatch({ type: 'SET_CENSUS_DATA', payload: censusData });
      }

      // Generate structured summary with congressman and census data
      const generatedSummary = await summarizePolicy(text, authState.user || undefined, censusData || undefined);
      setSummary(generatedSummary);

      // Create policy object
      const policy = {
        id: Date.now().toString(),
        title: uploadedFile.name.replace(/\.[^/.]+$/, ''),
        content: text,
        summary: generatedSummary,
        uploadedAt: new Date(),
      };

      dispatch({ type: 'SET_POLICY', payload: policy });

      setUploadStatus('complete');
    } catch (error) {
      console.error('Error processing file:', error);
      setUploadStatus('error');
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    
    setSummary(textInput);
    setUploadStatus('processing');

    try {
      // Ensure district is set before fetching Census data
      const district = state.currentDistrict || authState.user?.district;
      if (!district) {
        console.error('No district available for Census data fetch');
        setUploadStatus('error');
        return;
      }

      // Fetch census data first
      const censusData = await fetchCensusData(district);
      if (censusData) {
        dispatch({ type: 'SET_CENSUS_DATA', payload: censusData });
      }

      // Generate structured summary with congressman and census data
      const generatedSummary = await summarizePolicy(textInput, authState.user || undefined, censusData || undefined);
      setSummary(generatedSummary);

      // Create policy object
      const policy = {
        id: Date.now().toString(),
        title: 'Policy Text Input',
        content: textInput,
        summary: generatedSummary,
        uploadedAt: new Date(),
      };

      dispatch({ type: 'SET_POLICY', payload: policy });

      setUploadStatus('complete');
    } catch (error) {
      console.error('Error processing text:', error);
      setUploadStatus('error');
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-gray-900">Policy Impact Analysis</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Upload a policy document to analyze its impact on constituents using AI-powered digital twins
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-gray-900">Upload Policy Document</h1>
            <p className="text-gray-600">
              Upload a bill, policy document, or legislative text to analyze its impact on your constituents.
            </p>
          </div>

          {/* Input Method Toggle */}
          <div className="flex justify-center">
            <div className="bg-white rounded-lg p-1 shadow-sm border border-slate-200">
              <button
                onClick={() => setInputMethod('upload')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  inputMethod === 'upload'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                Upload File
              </button>
              <button
                onClick={() => setInputMethod('text')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  inputMethod === 'text'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                Type/Paste Text
              </button>
            </div>
          </div>

          {uploadStatus === 'idle' && (
            <>
              {inputMethod === 'upload' ? (
                <div
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                    dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <UploadIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Drop your policy document here, or click to browse
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Supports PDF, DOC, DOCX, and TXT files up to 10MB
                  </p>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <UploadIcon className="h-4 w-4 mr-2" />
                    Choose File
                  </label>
                </div>
              ) : (
                <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="policy-text" className="block text-sm font-medium text-gray-700 mb-2">
                        Policy Text
                      </label>
                      <textarea
                        id="policy-text"
                        rows={12}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        placeholder="Paste or type your policy document, bill text, or legislative content here..."
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        {textInput.length} characters
                      </span>
                      <button
                        onClick={handleTextSubmit}
                        disabled={!textInput.trim()}
                        className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Analyze Policy
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100">
              <LoadingSpinner
                text={uploadStatus === 'uploading' ? 'Uploading file...' : 'Processing with AI...'}
              />
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <div>
                  <h3 className="text-lg font-medium text-red-800">Processing Failed</h3>
                  <p className="text-red-600">
                    There was an error processing your content. This might be due to rate limiting or network issues. The app will use a fallback analysis method.
                  </p>
                </div>
              </div>
            </div>
          )}

          {uploadStatus === 'complete' && (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                  <div>
                    <h3 className="text-lg font-medium text-emerald-800">Processing Complete</h3>
                    <p className="text-emerald-600">
                      Your policy document has been analyzed and summarized.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100">
                <div className="flex items-center space-x-3 mb-6">
                  <FileText className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    {file ? file.name : 'Policy Text Input'}
                  </h2>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Policy Analysis Report</h3>
                    <div className="prose prose-sm max-w-none bg-gray-50 p-6 rounded-lg">
                      {summary.split('\n').map((line, index) => {
                        // Handle headers
                        if (line.startsWith('## ')) {
                          return (
                            <h2 key={index} className="text-xl font-bold text-gray-900 mt-6 mb-3 first:mt-0">
                              {line.replace('## ', '')}
                            </h2>
                          );
                        }
                        
                        // Handle bold text
                        if (line.includes('**')) {
                          const parts = line.split('**');
                          return (
                            <p key={index} className="mb-2">
                              {parts.map((part, partIndex) => 
                                partIndex % 2 === 1 ? (
                                  <strong key={partIndex} className="font-semibold text-gray-900">{part}</strong>
                                ) : (
                                  <span key={partIndex}>{part}</span>
                                )
                              )}
                            </p>
                          );
                        }
                        
                        // Handle bullet points
                        if (line.trim().startsWith('•')) {
                          return (
                            <li key={index} className="ml-4 text-gray-700">
                              {line.trim().substring(1).trim()}
                            </li>
                          );
                        }
                        
                        // Handle empty lines
                        if (line.trim() === '') {
                          return <div key={index} className="h-2"></div>;
                        }
                        
                        // Handle regular text
                        return (
                          <p key={index} className="text-gray-700 mb-2">
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Digital Twins Section */}
          {uploadStatus === 'complete' && (
            <div className="space-y-8">
              {isGeneratingTwins && (
                <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100">
                  <LoadingSpinner text="Generating digital twins from Census data..." />
                </div>
              )}

              {!isGeneratingTwins && state.digitalTwins.length > 0 && (
                <>
                  <div className="text-center space-y-4">
                    <h2 className="text-3xl font-bold text-gray-900">Meet Your Digital Twins</h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                      These are realistic constituents generated from Census data for district {state.currentDistrict}. 
                      Click "Chat with me" to understand how your policy affects them personally.
                    </p>
                    {/* Data Source Indicator */}
                    <div className="flex items-center justify-center space-x-2 px-3 py-1 rounded-full text-sm">
                      {state.censusData ? (
                        <div className="flex items-center space-x-1 text-green-700 bg-green-50 px-2 py-1 rounded-full">
                          <Database className="h-4 w-4" />
                          <span>Real Census Data</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-orange-700 bg-orange-50 px-2 py-1 rounded-full">
                          <AlertCircle className="h-4 w-4" />
                          <span>Fallback Data</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {state.digitalTwins.map((twin) => (
                      <div
                        key={twin.id}
                        className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{twin.name}</h3>
                            <p className="text-sm text-gray-600">{twin.age} years old</p>
                          </div>
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {twin.demographics}
                          </span>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <GraduationCap className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-700">{twin.education}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-700">${twin.annualIncome.toLocaleString()}/year</span>
                          </div>
                          
                          <div className="text-sm text-gray-600">
                            <p className="font-medium">{twin.occupation}</p>
                            <p className="text-xs mt-1 flex items-center space-x-1">
                              <span>
                                {twin.zipCode.includes('-') ? `District: ${twin.zipCode}` : `ZIP: ${twin.zipCode}`}
                              </span>
                              {state.censusData && (
                                <Database className="h-3 w-3 text-green-600" />
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-sm text-gray-600 font-medium mb-2">Personal Story:</p>
                          <p className="text-sm text-gray-700">{twin.personalStory}</p>
                        </div>
                        
                        {twin.policyImpact !== 'To be determined based on policy analysis' && (
                          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                            <p className="text-xs text-green-800 font-medium">Policy Impact:</p>
                            <p className="text-xs text-green-700">{twin.policyImpact}</p>
                          </div>
                        )}

                        {/* Chat Button */}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <button
                            onClick={() => setSelectedTwin(twin)}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span>Chat with {twin.name.split(' ')[0]}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Analysis & Suggestions Section */}
                  <div className="space-y-8 pt-8">
                    {isGeneratingSuggestions && (
                      <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100">
                        <LoadingSpinner text="Analyzing policy impact and generating suggestions..." />
                      </div>
                    )}

                    {!isGeneratingSuggestions && state.suggestions.length > 0 && (
                      <>
                        <div className="text-center space-y-4">
                          <h2 className="text-3xl font-bold text-gray-900">Impact Analysis & Suggestions</h2>
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
                              onClick={() => window.location.reload()}
                              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Analyze New Policy
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Modal - Rendered outside main container */}
      {selectedTwin && (
        <ChatModal
          twin={selectedTwin}
          onClose={() => setSelectedTwin(null)}
        />
      )}
    </>
  );
};

export default Upload;