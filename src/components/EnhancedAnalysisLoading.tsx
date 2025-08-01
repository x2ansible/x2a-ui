import React, { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

// TypeScript interfaces
interface AnalysisLoadingProps {
  technologyType: string;
  onComplete?: () => void;
}

// Analysis Loading Component
const AnalysisLoading: React.FC<AnalysisLoadingProps> = ({ technologyType, onComplete }) => {
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

  const config = techConfig[technologyType as keyof typeof techConfig] || techConfig.chef;

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
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl border border-slate-700/50 backdrop-blur-sm">
      {/* Header with technology branding */}
      <div className="text-center mb-8">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${config.color} ${config.bgGlow} mb-4 transform transition-transform duration-300`} style={{transform: `scale(${pulseIntensity})`}}>
          <span className="text-2xl">{config.icon}</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">
          Analyzing {technologyType.charAt(0).toUpperCase() + technologyType.slice(1)} Code
        </h2>
        <p className="text-slate-400 text-sm">
          Processing and analyzing your configuration files...
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md mb-8">
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${config.color} transition-all duration-300 ease-out`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current step indicator */}
      <div className="w-full max-w-md">
        <div className="flex items-center space-x-3 mb-4">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${config.color} flex items-center justify-center text-white text-sm font-bold`}>
            {currentStep + 1}
          </div>
          <div className="flex-1">
            <div className="text-slate-200 font-medium">
              {config.steps[currentStep] || 'Complete'}
            </div>
            <div className="text-xs text-slate-400">
              Step {currentStep + 1} of {config.steps.length}
            </div>
          </div>
          {currentStep >= config.steps.length - 1 && (
            <CheckCircle className="w-6 h-6 text-green-400" />
          )}
        </div>
      </div>

      {/* Animated dots */}
      <div className="flex space-x-2 mt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full bg-gradient-to-r ${config.color} animate-pulse`}
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
};

// Export the main component
export { AnalysisLoading };