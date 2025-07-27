"use client";

import React, { Suspense, useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import ContextPanel from "@/components/ContextPanel";
import ContextSidebar from "@/components/ContextSidebar";
import WorkflowSidebar from "@/components/WorkflowSidebar";
import AnalysisPanel from "@/components/analyse";
import AgentLogPanel from "@/components/AgentLogPanel";
import ThemeToggle from "@/components/ThemeToggle";
import GatedProgressSteps from "@/components/GatedProgressSteps";
import GeneratePanel from "@/components/GeneratePanel";
import GenerateSidebar from "@/components/GenerateSidebar";
import ValidationPanel from "@/components/ValidationPanel";
import ValidationSidebar from "@/components/ValidationSidebar";
import DeploymentPanel from "@/components/DeploymentPanel";
import DeploymentSidebar from "@/components/DeploymentSidebar";

import { useFileOperations } from "@/hooks/useFileOperations";
import { useGitOperations } from "@/hooks/useGitOperations";
import { useChefAnalyse } from "@/hooks/analyse/chef/useChefAnalyse";
import { useBladeLogicAnalyse } from "@/hooks/analyse/bladelogic/useBladeLogicAnalyse";
import { useShellAnalyse } from "@/hooks/analyse/shell/useShellAnalyse";
import { useSaltAnalyse } from "@/hooks/analyse/salt/useSaltAnalyse";
import { useAnsibleUpgradeAnalyse } from "@/hooks/analyse/ansible-upgrade/useAnsibleUpgradeAnalyse";
import { usePuppetAnalyse } from "@/hooks/analyse/puppet/usePuppetAnalyse";

import { BackendAnalysisResponse } from "@/components/analyse/types/BackendTypes";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const steps = ["Analyze", "Context", "Convert", "Validate", "Deploy"];

function RunWorkflowPageInner() {
  // State declarations
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showAgentLog, setShowAgentLog] = useState(false);

  const [sourceType, setSourceType] = useState<"upload" | "existing" | "git">("upload");
  const [uploadKey, setUploadKey] = useState(Date.now());
  const [code, setCode] = useState("");
  const [analysisFiles, setAnalysisFiles] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [folderList, setFolderList] = useState<string[]>([]);
  const [fileList, setFileList] = useState<string[]>([]);
  const [gitUrl, setGitUrl] = useState("");
  const [gitRepoName, setGitRepoName] = useState("");
  const [gitFolderList, setGitFolderList] = useState<string[]>([]);
  const [gitFileList, setGitFileList] = useState<string[]>([]);
  const [selectedGitFolder, setSelectedGitFolder] = useState("");
  const [selectedGitFile, setSelectedGitFile] = useState("");

  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<BackendAnalysisResponse | undefined>(undefined);
  const [retrievedContext, setRetrievedContext] = useState<string>("");
  const [generatedPlaybook, setGeneratedPlaybook] = useState<string>("");
  const [validationResult, setValidationResult] = useState<Record<string, unknown> | null>(null);

  // UPDATED: Add puppet to technology type
  const [technologyType, setTechnologyType] = useState<"chef" | "bladelogic" | "puppet" | "shell" | "salt" | "ansible-upgrade">("chef");

  // Add vectorDbId state
  const [vectorDbId] = useState<string>("iac"); // Default to "iac" knowledge base

  // Add state for the selected database ID
  const [selectedVectorDbId, setSelectedVectorDbId] = useState<string>("iac");

  // Config states
  const [contextConfig, setContextConfig] = useState({
    includeComments: false,
    analyzeDependencies: true,
    environmentType: 'development' as 'development' | 'staging' | 'production',
    scanDepth: 'medium' as 'shallow' | 'medium' | 'deep'
  });
  const [conversionConfig, setConversionConfig] = useState({
    targetFormat: 'ansible' as 'ansible' | 'terraform' | 'docker' | 'kubernetes',
    outputStyle: 'detailed' as 'minimal' | 'detailed' | 'enterprise',
    includeComments: true,
    validateSyntax: true,
    useHandlers: false,
    useRoles: false,
    useVars: false
  });
  const [validationConfig, setValidationConfig] = useState({
    checkSyntax: true,
    securityScan: true,
    performanceCheck: false,
    bestPractices: true,
    customRules: [] as string[]
  });
  const [validationProfile, setValidationProfile] = useState<string>('basic');
  const [deploymentConfig, setDeploymentConfig] = useState({
    environment: 'development' as 'development' | 'staging' | 'production',
    deploymentMode: 'direct' as 'aap' | 'direct',
    targetHosts: [] as string[],
    rollbackStrategy: 'gradual' as 'immediate' | 'gradual' | 'none',
    notifications: true
  });

  // Utility functions
  const addLogMessage = useCallback((msg: string) =>
    setLogMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]), []);
  const addSidebarMessage = useCallback((msg: string) => { console.warn('Sidebar message:', msg); }, []);
  const markStepAsCompleted = useCallback((stepIndex: number) => {
    setCompletedSteps(prev => (!prev.includes(stepIndex) ? [...prev, stepIndex].sort((a, b) => a - b) : prev));
  }, []);

  // Step navigation logic
  const handleStepClick = useCallback((stepIndex: number) => {
    if (stepIndex === 0) {
      setStep(stepIndex);
      setLogMessages([]);
      return;
    }

    const isPreviousStepCompleted = completedSteps.includes(stepIndex - 1);
    const isCurrentStep = stepIndex === step;
    const isAlreadyCompleted = completedSteps.includes(stepIndex);
    
    const isAccessible = 
      isCurrentStep ||
      isAlreadyCompleted ||
      isPreviousStepCompleted;

    console.log(`Step ${stepIndex} click:`, {
      isPreviousStepCompleted,
      isCurrentStep,
      isAlreadyCompleted,
      isAccessible,
      completedSteps,
      loading
    });

    if (isAccessible && !loading) {
      setStep(stepIndex);
      setLogMessages([]);
      addLogMessage(`Switched to step ${stepIndex + 1}: ${steps[stepIndex]}`);
    } else {
      addLogMessage(`Step ${stepIndex + 1} (${steps[stepIndex]}) is not accessible yet`);
    }
  }, [completedSteps, step, loading, addLogMessage]);

  // Custom hooks
  const { fetchFolders, fetchFilesInFolder, fetchFileContent, handleUpload } = useFileOperations({
    BACKEND_URL, setFolderList, setFileList, setCode, setSelectedFile, setUploadKey, addLogMessage, addSidebarMessage, gitRepoName, setLoading
  });
  const { handleCloneRepo, fetchGitFiles, fetchGitFileContent } = useGitOperations({
    BACKEND_URL, gitUrl, setGitRepoName, setGitFolderList, setGitFileList, setCode, setSelectedGitFile, addLogMessage, addSidebarMessage, setLoading
  });
  
  // Analysis hooks
  const { analyseChef } = useChefAnalyse({
    BACKEND_URL,
    files: {},
    setAnalysisResult: useCallback((result) => {
      setAnalysisResult(result);
      if (result && result.success !== false) {
        markStepAsCompleted(0);
        addLogMessage("Chef analysis completed - ready for next step");
      }
    }, [markStepAsCompleted, addLogMessage]),
    setLoading,
    addLog: addLogMessage
  });
  
  const { analyseBladeLogic } = useBladeLogicAnalyse({
    BACKEND_URL,
    files: {},
    setAnalysisResult: useCallback((result) => {
      setAnalysisResult(result);
      if (result && result.success !== false) {
        markStepAsCompleted(0);
        addLogMessage("BladeLogic analysis completed - ready for next step");
      }
    }, [markStepAsCompleted, addLogMessage]),
    setLoading,
    addLog: addLogMessage
  });

  const { analyseShell } = useShellAnalyse({
    BACKEND_URL,
    files: {},
    setAnalysisResult: useCallback((result) => {
      setAnalysisResult(result);
      if (result && result.success !== false) {
        markStepAsCompleted(0);
        addLogMessage("Shell script analysis completed - ready for next step");
      }
    }, [markStepAsCompleted, addLogMessage]),
    setLoading,
    addLog: addLogMessage
  });

  // Salt analysis hook
  const { analyseSalt } = useSaltAnalyse({
    BACKEND_URL,
    files: {},
    setAnalysisResult: useCallback((result) => {
      setAnalysisResult(result);
      if (result && result.success !== false) {
        markStepAsCompleted(0);
        addLogMessage("Salt analysis completed - ready for next step");
      }
    }, [markStepAsCompleted, addLogMessage]),
    setLoading,
    addLog: addLogMessage
  });

  // Ansible Upgrade analysis hook
  const { analyseAnsibleUpgrade } = useAnsibleUpgradeAnalyse({
    BACKEND_URL,
    files: {},
    setAnalysisResult: useCallback((result) => {
      setAnalysisResult(result);
      if (result && result.success !== false) {
        markStepAsCompleted(0);
        addLogMessage("Ansible upgrade analysis completed - ready for next step");
      }
    }, [markStepAsCompleted, addLogMessage]),
    setLoading,
    addLog: addLogMessage
  });

  // Puppet analysis hook
  const { analysePuppet } = usePuppetAnalyse({
    BACKEND_URL,
    files: {},
    setAnalysisResult: useCallback((result) => {
      setAnalysisResult(result);
      if (result && result.success !== false) {
        markStepAsCompleted(0);
        addLogMessage("Puppet analysis completed - ready for next step");
      }
    }, [markStepAsCompleted, addLogMessage]),
    setLoading,
    addLog: addLogMessage
  });

  // UPDATED: Smart technology detection with puppet support
  const detectTechnologyType = (files: { path: string; content: string }[]): "chef" | "bladelogic" | "puppet" | "shell" | "salt" | "ansible-upgrade" => {
    // Check for Puppet manifests first
    if (files.some(f => 
      f.path.endsWith('.pp') || 
      f.path.includes('puppet') ||
      /class\s+\w+|define\s+\w+|node\s+['"]?\w+['"]?/i.test(f.content) ||
      /package\s*{|service\s*{|file\s*{|exec\s*{|user\s*{|group\s*{/i.test(f.content) ||
      /ensure\s*=>|require\s*=>|before\s*=>|notify\s*=>|subscribe\s*=>/i.test(f.content)
    )) {
      return "puppet";
    }
    
    // Check for Ansible playbooks/roles first
    if (files.some(f => 
      f.path.endsWith('.yml') || 
      f.path.endsWith('.yaml') ||
      f.path.includes('playbook') ||
      f.path.includes('roles/') ||
      f.path.includes('ansible') ||
      /- name:|hosts:|tasks:|vars:|become:/i.test(f.content) ||
      /ansible\.builtin\.|community\.|ansible\.posix\./i.test(f.content) ||
      /register:|when:|with_items:|loop:|include:|import_/i.test(f.content) ||
      /gather_facts:|remote_user:|connection:/i.test(f.content)
    )) {
      return "ansible-upgrade";
    }
    
    // Check for Salt states
    if (files.some(f => 
      f.path.endsWith('.sls') || 
      f.path.includes('salt') ||
      /pkg\.installed|service\.running|file\.managed|cmd\.run/i.test(f.content) ||
      /salt:\/\/|pillar\[|grains\[/i.test(f.content)
    )) {
      return "salt";
    }
    
    // Check for shell scripts
    if (files.some(f => 
      f.path.endsWith('.sh') || 
      f.path.endsWith('.bash') || 
      f.path.endsWith('.zsh') || 
      f.content.startsWith('#!/bin/bash') ||
      f.content.startsWith('#!/bin/sh') ||
      f.content.startsWith('#!/usr/bin/bash') ||
      f.content.startsWith('#!/bin/zsh') ||
      /^#!/.test(f.content) // Any shebang
    )) {
      return "shell";
    }
    
    // Check for BladeLogic
    if (files.some(f => 
      f.path.includes('bladelogic') || 
      /bladelogic|rscd|nsh|blcli/i.test(f.content)
    )) {
      return "bladelogic";
    }
    
    // Default to chef
    return "chef";
  };

  // UPDATED: Main analysis trigger with puppet support
  const handleManualClassify = useCallback((files?: { path: string; content: string }[], technology?: string) => {
    if (loading) {
      addLogMessage("Analysis already in progress");
      return;
    }
    let detectedTech: "chef" | "bladelogic" | "puppet" | "shell" | "salt" | "ansible-upgrade" = technologyType;
    let filesObj: Record<string, string> = {};

    if (files && files.length > 0) {
      filesObj = {};
      files.forEach(f => {
        if (f.path && f.content) filesObj[f.path] = f.content;
      });
      if (Object.keys(filesObj).length === 0) {
        addLogMessage("No valid files found for analysis");
        return;
      }
      setAnalysisFiles(filesObj);
      addLogMessage(`Selected ${files.length} files: ${Object.keys(filesObj).join(", ")}`);
      addLogMessage(`Total size: ${Object.values(filesObj).reduce((sum, c) => sum + c.length, 0)} characters`);
      detectedTech = (technology as "chef" | "bladelogic" | "puppet" | "shell" | "salt" | "ansible-upgrade") || detectTechnologyType(files);
      setTechnologyType(detectedTech);
    } else if (code.trim()) {
      const fileName = selectedFile || selectedGitFile || "uploaded_file";
      filesObj = { [fileName]: code };
      setAnalysisFiles(filesObj);
      addLogMessage(`Starting single file analysis...`);
      detectedTech = (technology as "chef" | "bladelogic" | "puppet" | "shell" | "salt" | "ansible-upgrade") || detectTechnologyType([{ path: fileName, content: code }]);
      setTechnologyType(detectedTech);
    } else {
      addLogMessage("No code loaded. Please select or upload a file first");
      return;
    }
    
    // Route to appropriate analysis including puppet
    if (detectedTech === "puppet") {
      console.log('🎭 Routing to Puppet analysis with filesObj:', filesObj);
      analysePuppet(filesObj);
    } else if (detectedTech === "ansible-upgrade") {
      analyseAnsibleUpgrade(filesObj);
    } else if (detectedTech === "salt") {
      analyseSalt(filesObj);
    } else if (detectedTech === "shell") {
      analyseShell(filesObj);
    } else if (detectedTech === "bladelogic") {
      analyseBladeLogic(filesObj);
    } else {
      analyseChef(filesObj);
    }
  }, [loading, addLogMessage, code, analyseChef, analyseBladeLogic, analysePuppet, analyseShell, analyseSalt, analyseAnsibleUpgrade, selectedFile, selectedGitFile, technologyType]);

  // Mark Convert step completed when playbook is generated
  const handleGenerateComplete = useCallback((playbook: string) => {
    setGeneratedPlaybook(playbook);
    markStepAsCompleted(2);
    addLogMessage("Playbook generated and ready for validation");
  }, [setGeneratedPlaybook, markStepAsCompleted, addLogMessage]);

  // Mark Validate step completed when validation finishes
  const handleValidationComplete = useCallback((result: unknown) => {
    setValidationResult(result as Record<string, unknown>);
    markStepAsCompleted(3);
    addLogMessage("Validation completed - ready for deployment");
  }, [setValidationResult, markStepAsCompleted, addLogMessage]);

  // UI Effects
  useEffect(() => {
    if (status === "unauthenticated") {
      const t = setTimeout(() => router.replace("/"), 2000);
      return () => clearTimeout(t);
    }
  }, [status, router]);
  useEffect(() => { if (sourceType === "existing") fetchFolders(); }, [sourceType, gitRepoName, fetchFolders]);
  useEffect(() => { if (retrievedContext && !completedSteps.includes(1)) markStepAsCompleted(1); }, [retrievedContext, completedSteps, markStepAsCompleted]);

  // Debug logging for completed steps
  useEffect(() => {
    console.log("Completed steps updated:", completedSteps);
  }, [completedSteps]);

  // Admin logic
  const allowedEmails = ["rbanda@redhat.com"];
  const isAdmin = (session?.user?.email && allowedEmails.includes(session.user.email)) ||
    process.env.NODE_ENV === "development";
  const currentWorkflow = searchParams?.get('workflow') || 'x2ansible';

  // Render loading and unauthenticated states
  if (status === "loading") return (<div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center"><div className="text-center"><div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4"></div><p className="text-gray-600 dark:text-gray-400">Loading...</p></div></div>);
  if (status === "unauthenticated") return (<div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center"><div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-center"><p className="mb-4 text-gray-800 dark:text-gray-200 font-semibold">Please log in to access this page</p><p className="text-sm text-gray-600 dark:text-gray-400">Redirecting to login...</p></div></div>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            x2Ansible - Agents in Action
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Welcome, {session?.user?.name || session?.user?.email}
            {isAdmin && (
              <Link
                href={`/admin?from=${currentWorkflow}`}
                className="ml-2 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors cursor-pointer"
                title="Access Admin Panel"
              >
                Admin
              </Link>
            )}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors rh-btn-primary"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Step Progress */}
      <GatedProgressSteps
        steps={steps}
        currentStep={step}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
        loading={loading}
      />

      {/* Mobile Log Toggle */}
      <button
        className="fixed bottom-4 right-4 z-40 bg-gray-900 text-white rounded-full px-4 py-2 shadow-lg lg:hidden"
        onClick={() => setShowAgentLog((prev) => !prev)}
        aria-label="Toggle Agent Log"
      >
        {showAgentLog ? "Hide Agent Log" : "Show Agent Log"}
      </button>

      {/* === 3-PANEL LAYOUT === */}
      <div className="x2a-3panel-layout">
        {/* LEFT SIDEBAR */}
        <div className="x2a-side-panel rh-scrollbar overflow-auto">
          {step === 1 ? (
            <ContextSidebar
              vectorDbId={vectorDbId}
              contextConfig={contextConfig}
              setContextConfig={setContextConfig}
              onDocUploaded={() => {
                addLogMessage("Conversion pattern uploaded successfully");
                // Optionally refresh context or trigger other actions
              }}
              onDatabaseChange={setSelectedVectorDbId} // NEW: Add this prop
            />
          ) : step === 2 ? (
            <GenerateSidebar
              conversionConfig={conversionConfig}
              setConversionConfig={setConversionConfig as (config: unknown) => void}
              contextSummary={retrievedContext}
              code={code}
              analysisFiles={analysisFiles}
              context={retrievedContext}
              classificationResult={analysisResult}
              onLogMessage={addLogMessage}
              onComplete={handleGenerateComplete}
            />
          ) : step === 3 ? (
            <ValidationSidebar
              playbook={generatedPlaybook}
              validationConfig={validationConfig}
              setValidationConfig={setValidationConfig as (config: unknown) => void}
              validationResult={validationResult}
              loading={loading}
              selectedProfile={validationProfile}
              onProfileChange={setValidationProfile}
              onLogMessage={addLogMessage}
              onValidationComplete={handleValidationComplete}
            />
          ) : step === 4 ? (
            <DeploymentSidebar
              playbook={generatedPlaybook}
              deploymentConfig={deploymentConfig}
              onLogMessage={addLogMessage}
              onComplete={() => markStepAsCompleted(4)}
            />
          ) : (
            <WorkflowSidebar
              currentStep={step}
              loading={loading}
              sourceType={sourceType}
              setSourceType={setSourceType}
              uploadKey={uploadKey}
              setUploadKey={setUploadKey}
              code={code}
              setCode={setCode}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              selectedFolder={selectedFolder}
              setSelectedFolder={setSelectedFolder}
              folderList={folderList}
              fileList={fileList}
              gitUrl={gitUrl}
              setGitUrl={setGitUrl}
              gitRepoName={gitRepoName}
              gitFolderList={gitFolderList}
              gitFileList={gitFileList}
              selectedGitFolder={selectedGitFolder}
              setSelectedGitFolder={setSelectedGitFolder}
              selectedGitFile={selectedGitFile}
              setSelectedGitFile={setSelectedGitFile}
              fetchFolders={fetchFolders}
              fetchFilesInFolder={fetchFilesInFolder}
              fetchFileContent={fetchFileContent}
              handleUpload={handleUpload}
              handleCloneRepo={handleCloneRepo}
              fetchGitFiles={fetchGitFiles}
              fetchGitFileContent={fetchGitFileContent}
              handleManualClassify={handleManualClassify}
              contextConfig={contextConfig}
              setContextConfig={setContextConfig as (config: unknown) => void}
              conversionConfig={conversionConfig}
              setConversionConfig={setConversionConfig as (config: unknown) => void}
              validationConfig={validationConfig}
              setValidationConfig={setValidationConfig as (config: unknown) => void}
              deploymentConfig={deploymentConfig}
              setDeploymentConfig={setDeploymentConfig as (config: unknown) => void}
            />
          )}
        </div>

        {/* CENTER PANEL */}
        <div className="x2a-main-panel">
          {step === 1 ? (
            <ContextPanel
              code={code}
              analysisFiles={analysisFiles}
              onLogMessage={addLogMessage}
              onContextRetrieved={setRetrievedContext}
              vectorDbId={selectedVectorDbId} // NEW: Add this prop
            />
          ) : step === 2 ? (
            <GeneratePanel
              code={code}
              analysisFiles={analysisFiles}
              context={retrievedContext}
              classificationResult={analysisResult}
              onLogMessage={addLogMessage}
              onComplete={handleGenerateComplete}
            />
          ) : step === 3 ? (
            <ValidationPanel
              playbook={generatedPlaybook}
              validationConfig={validationConfig}
              onLogMessage={addLogMessage}
              onValidationComplete={handleValidationComplete}
            />
          ) : step === 4 ? (
            <DeploymentPanel
              playbook={generatedPlaybook}
              deploymentConfig={{
                environment: deploymentConfig.environment,
                deploymentMode: deploymentConfig.deploymentMode,
                directConfig: {
                  targetHosts: deploymentConfig.targetHosts,
                  sshCredentials: 'default',
                  becomeMethod: 'sudo'
                },
                aapConfig: {
                  controllerUrl: 'https://aap.example.com',
                  projectName: 'Generated Project',
                  jobTemplateName: 'Generated Job Template',
                  inventory: 'default-inventory',
                  credentials: 'default-credentials'
                },
                rollbackStrategy: deploymentConfig.rollbackStrategy,
                notifications: deploymentConfig.notifications
              }}
              onLogMessage={addLogMessage}
              onComplete={() => markStepAsCompleted(4)}
            />
          ) : (
            <AnalysisPanel
              result={analysisResult}
              loading={loading}
              error={null}
              technologyType={technologyType}
            />
          )}
        </div>

        {/* RIGHT LOG PANEL */}
        <div className={`x2a-log-panel ${showAgentLog ? "" : "hidden"} lg:flex`}>
          <AgentLogPanel
            logMessages={logMessages}
            setLogMessages={setLogMessages}
          />
        </div>
      </div>
    </div>
  );
}

export default function RunWorkflowPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-300">Loading workflow...</p>
        </div>
      </div>
    }>
      <RunWorkflowPageInner />
    </Suspense>
  );
}