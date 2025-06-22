import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload as UploadIcon, FileText, AlertCircle, CheckCircle, MessageCircle, MapPin, DollarSign, GraduationCap, Briefcase, User } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { summarizePolicy, generateDigitalTwins } from '../services/aiService';
import { fetchCensusData } from '../services/censusApi';
import LoadingSpinner from '../components/LoadingSpinner';
import ChatModal from '../components/ChatModal';
import { DigitalTwin } from '../types';

const Upload: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [policyText, setPolicyText] = useState('');
  const [summary, setSummary] = useState('');
  const [isGeneratingTwins, setIsGeneratingTwins] = useState(false);
  const [selectedTwin, setSelectedTwin] = useState<DigitalTwin | null>(null);
  const [inputMethod, setInputMethod] = useState<'upload' | 'text'>('upload');
  const [textInput, setTextInput] = useState('');

  useEffect(() => {
    if (uploadStatus === 'complete' && state.censusData && state.digitalTwins.length === 0) {
      generateTwins();
    }
  }, [uploadStatus, state.censusData]);

  const generateTwins = async () => {
    if (!state.currentPolicy || !state.censusData) return;
    
    setIsGeneratingTwins(true);
    try {
      const twins = await generateDigitalTwins(state.censusData, state.currentPolicy);
      dispatch({ type: 'SET_DIGITAL_TWINS', payload: twins });
    } catch (error) {
      console.error('Error generating digital twins:', error);
    } finally {
      setIsGeneratingTwins(false);
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
      setPolicyText(text);
      setUploadStatus('processing');

      // Simulate policy processing
      const generatedSummary = await summarizePolicy(text);
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

      // Fetch census data
      const censusData = await fetchCensusData(state.currentZipCode);
      dispatch({ type: 'SET_CENSUS_DATA', payload: censusData });

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

  const handleContinue = () => {
    navigate('/analysis');
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    
    setPolicyText(textInput);
    setUploadStatus('processing');

    try {
      // Simulate policy processing
      const generatedSummary = await summarizePolicy(textInput);
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

      // Fetch census data
      const censusData = await fetchCensusData(state.currentZipCode);
      dispatch({ type: 'SET_CENSUS_DATA', payload: censusData });

      setUploadStatus('complete');
    } catch (error) {
      console.error('Error processing text:', error);
      setUploadStatus('error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">AI Summary</h3>
                <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                  {summary}
                </p>
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
                  These are realistic constituents generated from Census data for ZIP code {state.currentZipCode}. 
                  Click "Chat with me" to understand how your policy affects them personally.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {state.digitalTwins.map((twin) => (
                  <div
                    key={twin.id}
                    className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{twin.name}</h3>
                          <p className="text-sm text-gray-500">Age {twin.age} • {twin.demographics}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedTwin(twin)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>Chat with me</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2 text-sm">
                          <GraduationCap className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{twin.education}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Briefcase className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{twin.occupation}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">${twin.annualIncome.toLocaleString()}/year</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">ZIP {twin.zipCode}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-600 mb-2 font-medium">Personal Story:</p>
                        <p className="text-sm text-gray-700">{twin.personalStory}</p>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-800 font-medium mb-1">Policy Impact:</p>
                        <p className="text-sm text-amber-700">{twin.policyImpact}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center pt-8">
                <button
                  onClick={handleContinue}
                  className="px-8 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  View Analysis & Suggestions
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {selectedTwin && (
        <ChatModal
          twin={selectedTwin}
          onClose={() => setSelectedTwin(null)}
        />
      )}
    </div>
  );
};

export default Upload;