import React from 'react';
import { Link } from 'react-router-dom';
import { Upload, Users, BarChart3, ArrowRight, CheckCircle } from 'lucide-react';

const Landing: React.FC = () => {
  const features = [
    {
      icon: Upload,
      title: 'Upload & Analyze',
      description: 'Upload any policy document and get AI-powered summaries in plain English',
    },
    {
      icon: Users,
      title: 'Meet Digital Twins',
      description: 'Interact with realistic constituents based on real Census data',
    },
    {
      icon: BarChart3,
      title: 'Impact Analysis',
      description: 'Receive actionable suggestions to improve policy outcomes',
    },
  ];

  const benefits = [
    'Understand human impact before implementation',
    'Reduce unintended consequences',
    'Improve constituent engagement',
    'Make data-driven policy decisions',
  ];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-gray-900 leading-tight">
            See How Policies Affect
            <span className="text-blue-600 block">Real People</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            CivicTwin uses AI and Census data to simulate how your policies impact real constituents. 
            Upload a bill, meet digital twins, and get actionable feedback before implementation.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/login"
            className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Sign In
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          <button className="text-blue-600 font-medium hover:text-blue-700 transition-colors">
            Watch Demo Video
          </button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-8 mt-16">
        {features.map(({ icon: Icon, title, description }, index) => (
          <div
            key={index}
            className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-100"
          >
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-6">
              <Icon className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
            <p className="text-gray-600 leading-relaxed">{description}</p>
          </div>
        ))}
      </div>

      {/* Benefits Section */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            Why Congressional Staff Love CivicTwin
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <span className="text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">Ready to Transform Policy Making?</h2>
        <p className="text-blue-100 mb-6 text-lg">
          Join hundreds of congressional offices using CivicTwin to create better policies.
        </p>
        <Link
          to="/upload"
          className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-lg"
        >
          Get Started Now
          <ArrowRight className="ml-2 h-5 w-5" />
        </Link>
      </div>
    </div>
  );
};

export default Landing;