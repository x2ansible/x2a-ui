import React, { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

// Enhanced Analysis Loading Component
const AnalysisLoadingState = ({ 
  technologyType = 'chef', 
  analysisType = 'analysis',
  onComplete 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [pulseIntensity, setPulseIntensity] = useState(1);

  // Technology-specific configurations with proper branding
  const techConfig = {
    chef: {
      icon: '🍳',
      color: 'from-orange-500 to-orange-600',
      bgGlow: 'shadow-orange-500/20',
      steps: ['Parsing recipes', 'Analyzing cookbooks', 'Extracting dependencies', 'Building insights']
    },
    ansible: {
      icon: '🅰️',
      color: 'from-red-500 to-red-600',
      bgGlow: 'shadow-red-500/20',
      steps: ['Reading playbooks', 'Processing roles', 'Analyzing tasks', 'Mapping variables']
    },
    'ansible-upgrade': {
      icon: '🔴',
      color: 'from-red-500 to-red-600',
      bgGlow: 'shadow-red-500/20',
      steps: ['Scanning codebase', 'Detecting versions', 'Finding upgrades', 'Preparing recommendations']
    },
    puppet: {
      icon: '🐕',
      color: 'from-orange-400 to-yellow-500',
      bgGlow: 'shadow-orange-500/20',
      steps: ['Reading manifests', 'Processing modules', 'Analyzing classes', 'Mapping resources']
    },
    salt: {
      icon: '🟢',
      color: 'from-emerald-500 to-green-500',
      bgGlow: 'shadow-green-500/20',
      steps: ['Reading states', 'Processing formulas', 'Mapping configurations', 'Building analysis']
    },
    shell: {
      icon: '💻',
      color: 'from-gray-400 to-gray-600',
      bgGlow: 'shadow-gray-500/20',
      steps: ['Parsing scripts', 'Analyzing commands', 'Detecting patterns', 'Extracting logic']
    },
    bladelogic: {
      icon: '🔵',
      color: 'from-blue-500 to-blue-600',
      bgGlow: 'shadow-blue-500/20',
      steps: ['Reading automation', 'Processing workflows', 'Analyzing operations', 'Generating insights']
    },
    terraform: {
      icon: '🟣',
      color: 'from-purple-500 to-violet-600',
      bgGlow: 'shadow-purple-500/20',
      steps: ['Parsing configurations', 'Analyzing resources', 'Processing modules', 'Building plan']
    }
  };

  const config = techConfig[technologyType] || techConfig.chef;

  // Animated progress simulation
  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        const nextStep = prev + 1;
        if (nextStep >= config.steps.length) {
          if (onComplete) onComplete();
          return prev;
        }
        return nextStep;
      });
    }, 2000);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 15;
        return newProgress > 95 ? 95 : newProgress;
      });
    }, 300);

    const pulseInterval = setInterval(() => {
      setPulseIntensity(prev => prev === 1 ? 1.1 : 1);
    }, 1000);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      clearInterval(pulseInterval);
    };
  }, [config.steps.length, onComplete]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black min-h-[400px] relative overflow-hidden">
      
      {/* Animated Background Particles */}
      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 bg-gradient-to-r ${config.color} rounded-full opacity-60`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 text-center max-w-md mx-auto px-6">
        
        {/* Technology Icon with Glow */}
        <div className="relative mb-8">
          <div 
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r ${config.color} ${config.bgGlow} shadow-2xl transition-transform duration-1000`}
            style={{ transform: `scale(${pulseIntensity})` }}
          >
            <span className="text-3xl filter drop-shadow-lg">{config.icon}</span>
          </div>
          
          {/* Rotating Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-gray-400 animate-spin" style={{ animationDuration: '3s' }}></div>
          <div className="absolute inset-2 rounded-full border border-gray-500 animate-ping"></div>
        </div>

        {/* Main Title */}
        <h2 className="text-2xl font-bold text-white mb-2 capitalize">
          Analyzing {technologyType.replace('-', ' ')} Code
        </h2>
        
        {/* Subtitle */}
        <p className="text-gray-400 mb-8 text-sm">
          Deep code analysis in progress...
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-gray-800 rounded-full h-3 mb-6 overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${config.color} rounded-full transition-all duration-500 ease-out relative`}
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white opacity-30 animate-pulse"></div>
          </div>
        </div>

        {/* Current Step Display */}
        <div className="space-y-3 mb-6">
          {config.steps.map((step, index) => (
            <div 
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                index === currentStep 
                  ? `bg-gradient-to-r ${config.color} bg-opacity-20 border border-opacity-50 border-current scale-105` 
                  : index < currentStep
                  ? 'bg-green-900/30 border border-green-500/30'
                  : 'bg-gray-800/50 border border-gray-700/50'
              }`}
            >
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                index < currentStep 
                  ? 'bg-green-500 text-white'
                  : index === currentStep
                  ? `bg-gradient-to-r ${config.color} text-white animate-pulse`
                  : 'bg-gray-600 text-gray-400'
              }`}>
                {index < currentStep ? (
                  <CheckCircle size={14} />
                ) : index === currentStep ? (
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                ) : (
                  <span className="text-xs font-bold">{index + 1}</span>
                )}
              </div>
              
              <span className={`text-sm font-medium transition-colors duration-300 ${
                index === currentStep 
                  ? 'text-white' 
                  : index < currentStep 
                  ? 'text-green-300'
                  : 'text-gray-400'
              }`}>
                {step}
              </span>

              {/* Animated dots for current step */}
              {index === currentStep && (
                <div className="flex gap-1 ml-auto">
                  {[...Array(3)].map((_, i) => (
                    <div 
                      key={i}
                      className="w-1 h-1 bg-white rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Stats Display */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <div className="text-blue-400 font-bold text-lg">{Math.round(progress)}%</div>
            <div className="text-xs text-gray-500">Complete</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <div className="text-green-400 font-bold text-lg">{currentStep + 1}</div>
            <div className="text-xs text-gray-500">of {config.steps.length}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <div className="text-purple-400 font-bold text-lg">
              {technologyType === 'ansible-upgrade' ? 'UPG' : 
               technologyType === 'shell' ? 'SH' :
               technologyType.slice(0, 3).toUpperCase()}
            </div>
            <div className="text-xs text-gray-500">Engine</div>
          </div>
        </div>
      </div>

      {/* CSS Animation Styles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.6; }
          25% { transform: translateY(-10px) rotate(90deg); opacity: 1; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.8; }
          75% { transform: translateY(-10px) rotate(270deg); opacity: 1; }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

// Main component for your AnalysisPanel.tsx
export const EnhancedAnalysisLoading = ({ technologyType, onComplete }) => {
  return (
    <AnalysisLoadingState 
      technologyType={technologyType}
      analysisType="analysis"
      onComplete={onComplete}
    />
  );
};

// Demo Component (remove this in production)
const LoadingDemo = () => {
  const [currentDemo, setCurrentDemo] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const demos = [
    { tech: 'chef', name: 'Chef' },
    { tech: 'ansible', name: 'Ansible' },
    { tech: 'ansible-upgrade', name: 'Upgrade' },
    { tech: 'puppet', name: 'Puppet' },
    { tech: 'salt', name: 'Salt' },
    { tech: 'shell', name: 'Shell' },
    { tech: 'bladelogic', name: 'BladeLogic' },
    { tech: 'terraform', name: 'Terraform' }
  ];

  const handleComplete = () => {
    setIsLoading(false);
    setTimeout(() => {
      setCurrentDemo((prev) => (prev + 1) % demos.length);
      setIsLoading(true);
    }, 2000);
  };

  useEffect(() => {
    setIsLoading(true);
  }, [currentDemo]);

  return (
    <div className="w-full h-screen bg-black">
      {/* Demo Controls */}
      <div className="absolute top-4 left-4 z-20 flex gap-2 flex-wrap">
        {demos.map((demo, index) => (
          <button
            key={demo.tech}
            onClick={() => {
              setCurrentDemo(index);
              setIsLoading(true);
            }}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              index === currentDemo 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {demo.name}
          </button>
        ))}
      </div>

      {/* Loading Animation */}
      {isLoading ? (
        <AnalysisLoadingState 
          technologyType={demos[currentDemo].tech}
          onComplete={handleComplete}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black">
          <div className="text-center">
            <CheckCircle size={64} className="text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Analysis Complete!</h2>
            <p className="text-gray-400">
              {demos[currentDemo].name} analysis finished successfully
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingDemo;