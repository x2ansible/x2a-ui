"use client";

import React, { Suspense, useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import ContextPanel from "@/components/ContextPanel";
import ContextSidebar from "@/components/ContextSidebar";
import WorkflowSidebar from "@/components/WorkflowSidebar";
import ClassificationPanel from "@/components/ClassificationPanel";
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
import { useClassification } from "@/hooks/useClassification";
import { ClassificationResponse } from "@/types/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://host.containers.internal:8000";
const steps = ["Analyze", "Context", "Convert", "Validate", "Deploy"];

interface ValidationResult {
  errors?: unknown[];
  warnings?: unknown[];
  status?: string;
  [key: string]: unknown;
}

function RunWorkflowPageInner() {
  // ========================================
  // 1. ALL REACT HOOKS MUST BE DECLARED FIRST
  // NO CONDITIONAL LOGIC BEFORE HOOKS
  // ========================================
  
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Core navigation state
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showAgentLog, setShowAgentLog] = useState(false);

  // File and source management state
  const [sourceType, setSourceType] = useState<"upload" | "existing" | "git">("upload");
  const [uploadKey, setUploadKey] = useState(Date.now());
  const [code, setCode] = useState("");
  const [analysisFiles, setAnalysisFiles] = useState<Record<string, string>>({}); // NEW: Preserve analyzed files
  const [selectedFile, setSelectedFile] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [folderList, setFolderList] = useState<string[]>([]);
  const [fileList, setFileList] = useState<string[]>([]);

  // Git operations state
  const [gitUrl, setGitUrl] = useState("");
  const [gitRepoName, setGitRepoName] = useState("");
  const [gitFolderList, setGitFolderList] = useState<string[]>([]);
  const [gitFileList, setGitFileList] = useState<string[]>([]);
  const [selectedGitFolder, setSelectedGitFolder] = useState("");
  const [selectedGitFile, setSelectedGitFile] = useState("");

  // Logging state
  const [logMessages, setLogMessages] = useState<string[]>([]);

  // Classification and workflow results
  const [classificationResult, setClassificationResult] = useState<ClassificationResponse | undefined>(undefined);
  const [retrievedContext, setRetrievedContext] = useState<string>("");
  const [generatedPlaybook, setGeneratedPlaybook] = useState<string>("");
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Configuration state for different workflow steps
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

  const [deploymentConfig, setDeploymentConfig] = useState({
    environment: 'development' as 'development' | 'staging' | 'production',
    deploymentMode: 'direct' as 'aap' | 'direct',
    targetHosts: [] as string[],
    rollbackStrategy: 'gradual' as 'immediate' | 'gradual' | 'none',
    notifications: true
  });

  // Utility functions - ALL useCallback hooks MUST be declared here
  const addLogMessage = useCallback((msg: string) => {
    setLogMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const addSidebarMessage = useCallback((msg: string) => {
    console.warn('Sidebar message:', msg);
  }, []);

  const markStepAsCompleted = useCallback((stepIndex: number) => {
    setCompletedSteps(prev => {
      if (!prev.includes(stepIndex)) {
        return [...prev, stepIndex].sort((a, b) => a - b);
      }
      return prev;
    });
  }, []);

  const handleStepClick = useCallback((stepIndex: number) => {
    const isAccessible = stepIndex === 0 ||
      completedSteps.includes(stepIndex) ||
      stepIndex === step ||
      (stepIndex === step + 1 && completedSteps.includes(step));
    if (isAccessible && !loading) {
      setStep(stepIndex);
      setLogMessages([]);
    }
  }, [completedSteps, step, loading]);

  const handleValidationComplete = useCallback((result: ValidationResult) => {
    setValidationResult(result);
    if (result && (!result.errors || (Array.isArray(result.errors) && result.errors.length === 0))) {
      markStepAsCompleted(3);
      addLogMessage("Validation completed successfully - ready for deployment");
    }
  }, [markStepAsCompleted, addLogMessage]);

  const onContextRetrieved = useCallback((context: string) => {
    setRetrievedContext(context);
    markStepAsCompleted(1);
  }, [markStepAsCompleted]);

  const onGenerateComplete = useCallback((playbook: string) => {
    setGeneratedPlaybook(playbook);
    markStepAsCompleted(2);
    addLogMessage("Playbook generated and ready for validation");
  }, [markStepAsCompleted, addLogMessage]);

  const onDeploymentComplete = useCallback((_result: ValidationResult) => {
    markStepAsCompleted(4);
    addLogMessage("Deployment completed successfully!");
  }, [markStepAsCompleted, addLogMessage]);

  // NEW: Store analyzed files for context step
  const handleAnalysisComplete = useCallback((files: Record<string, string>) => {
    setAnalysisFiles(files);
    addLogMessage(`Analysis files preserved: ${Object.keys(files).length} files (${Object.values(files).reduce((sum, content) => sum + content.length, 0)} characters total)`);
  }, [addLogMessage]);

  // Custom hooks - ALL MUST BE DECLARED BEFORE ANY CONDITIONAL LOGIC
  const { fetchFolders, fetchFilesInFolder, fetchFileContent, handleUpload } = useFileOperations({
    BACKEND_URL,
    setFolderList,
    setFileList,
    setCode,
    setSelectedFile,
    setUploadKey,
    addLogMessage,
    addSidebarMessage,
    gitRepoName,
    setLoading
  });

  const { handleCloneRepo, fetchGitFiles, fetchGitFileContent } = useGitOperations({
    BACKEND_URL,
    gitUrl,
    setGitRepoName,
    setGitFolderList,
    setGitFileList,
    setCode,
    setSelectedGitFile,
    addLogMessage,
    addSidebarMessage,
    setLoading
  });

  const { classifyCode } = useClassification({
    BACKEND_URL,
    files: {},
    setClassificationResult: useCallback((result) => {
      try {
        setClassificationResult(result ?? undefined);
        if (result && !(result as Record<string, unknown>).error) {
          markStepAsCompleted(0);
          addLogMessage("Analysis completed - ready for next step");
        }
      } catch (error) {
        console.error('Error setting classification result:', error);
        addLogMessage(`Error processing analysis result: ${error}`);
      }
    }, [markStepAsCompleted, addLogMessage]),
    setStep,
    step,
    setLoading,
    loading,
    addLog: addLogMessage
  });

  // UPDATED: Enhanced multi-file classification with analysis preservation
  const handleManualClassify = useCallback((files?: { path: string; content: string }[]) => {
    if (loading) {
      addLogMessage("Classification already in progress");
      return;
    }

    try {
      if (files && files.length > 0) {
        const filesObj: Record<string, string> = {};
        files.forEach(f => {
          if (f.path && f.content) {
            filesObj[f.path] = f.content;
          }
        });

        if (Object.keys(filesObj).length === 0) {
          addLogMessage("No valid files found for analysis");
          return;
        }

        // PRESERVE the analyzed files for context step
        handleAnalysisComplete(filesObj);

        addLogMessage(`Selected ${files.length} files: ${Object.keys(filesObj).join(", ")}`);
        addLogMessage(`Total size: ${Object.values(filesObj).reduce((sum, c) => sum + c.length, 0)} characters`);

        setTimeout(() => {
          classifyCode(filesObj);
        }, 200);

        return;
      }

      if (!code.trim()) {
        addLogMessage("No code loaded. Please select or upload a file first");
        return;
      }
      
      // For single file, also preserve in structured format
      const singleFileObj = { "input_file": code };
      handleAnalysisComplete(singleFileObj);
      
      addLogMessage("Starting single file analysis...");
      classifyCode(singleFileObj);
    } catch (error) {
      console.error('Error in manual classification:', error);
      addLogMessage(`Classification error: ${error}`);
    }
  }, [loading, addLogMessage, code, classifyCode, handleAnalysisComplete]);

  // ALL useEffect hooks MUST be declared here
  useEffect(() => {
    if (status === "unauthenticated") {
      const t = setTimeout(() => router.replace("/"), 2000);
      return () => clearTimeout(t);
    }
  }, [status, router]);

  useEffect(() => {
    if (sourceType === "existing") {
      fetchFolders();
    }
  }, [sourceType, gitRepoName, fetchFolders]);

  useEffect(() => {
    if (retrievedContext && !completedSteps.includes(1)) {
      markStepAsCompleted(1);
    }
  }, [retrievedContext, completedSteps, markStepAsCompleted]);

  // ========================================
  // 2. NOW WE CAN HAVE CONDITIONAL LOGIC AND EARLY RETURNS
  // ALL HOOKS HAVE BEEN DECLARED ABOVE
  // ========================================

  // Check admin privileges
  const allowedEmails = ["rbanda@redhat.com"];
  const isAdmin = (session?.user?.email && allowedEmails.includes(session.user.email)) ||
                  process.env.NODE_ENV === "development";

  const currentWorkflow = searchParams?.get('workflow') || 'x2ansible';

  // Early returns are now safe
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-center">
          <p className="mb-4 text-gray-800 dark:text-gray-200 font-semibold">Please log in to access this page</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Main component render
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Convert to Ansible - Step by Step</h1>
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
        <div className="x2a-side-panel">
          {step === 1 ? (
            <ContextSidebar
              vectorDbId="iac"
              contextConfig={contextConfig}
              setContextConfig={setContextConfig}
              onDocUploaded={() => {}}
            />
          ) : step === 2 ? (
            <GenerateSidebar
              conversionConfig={conversionConfig}
              setConversionConfig={setConversionConfig}
              contextSummary={{
                tokens: retrievedContext.length,
                docCount: 3,
                topics: ["package install", "systemd", "templating"]
              }}
            />
          ) : step === 3 ? (
            <ValidationSidebar
              validationConfig={validationConfig}
              setValidationConfig={setValidationConfig}
              validationResult={validationResult}
              loading={loading}
            />
          ) : step === 4 ? (
            <DeploymentSidebar
              deploymentConfig={{
                environment: deploymentConfig.environment,
                deploymentMode: deploymentConfig.deploymentMode,
                targetHosts: deploymentConfig.targetHosts,
                rollbackStrategy: deploymentConfig.rollbackStrategy,
                notifications: deploymentConfig.notifications
              }}
              setDeploymentConfig={setDeploymentConfig}
              playbookReady={generatedPlaybook.length > 0}
            />
          ) : (
            <WorkflowSidebar
              currentStep={step}
              sourceType={sourceType}
              setSourceType={setSourceType}
              loading={loading}
              uploadKey={uploadKey}
              handleUpload={handleUpload}
              folderList={folderList}
              selectedFolder={selectedFolder}
              setSelectedFolder={setSelectedFolder}
              selectedFile={selectedFile}
              fileList={fileList}
              fetchFilesInFolder={fetchFilesInFolder}
              fetchFileContent={fetchFileContent}
              gitUrl={gitUrl}
              setGitUrl={setGitUrl}
              handleCloneRepo={handleCloneRepo}
              gitRepoName={gitRepoName}
              gitFolderList={gitFolderList}
              selectedGitFolder={selectedGitFolder}
              setSelectedGitFolder={setSelectedGitFolder}
              gitFileList={gitFileList}
              selectedGitFile={selectedGitFile}
              fetchGitFiles={fetchGitFiles}
              fetchGitFileContent={fetchGitFileContent}
              handleManualClassify={handleManualClassify}
              code={code}
              setCode={setCode}
              contextConfig={contextConfig}
              setContextConfig={setContextConfig}
              conversionConfig={conversionConfig}
              setConversionConfig={setConversionConfig}
              validationConfig={validationConfig}
              setValidationConfig={setValidationConfig}
              deploymentConfig={deploymentConfig}
              setDeploymentConfig={setDeploymentConfig}
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
              onContextRetrieved={onContextRetrieved}
            />
          ) : step === 2 ? (
            <GeneratePanel
              code={code}
              analysisFiles={analysisFiles}
              context={retrievedContext}
              classificationResult={classificationResult}
              onLogMessage={addLogMessage}
              onComplete={onGenerateComplete}
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
              onComplete={onDeploymentComplete}
            />
          ) : (
            <ClassificationPanel
              classificationResult={classificationResult}
              selectedFile={selectedFile}
              selectedGitFile={selectedGitFile}
              code={code}
              loading={loading}
              step={step}
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