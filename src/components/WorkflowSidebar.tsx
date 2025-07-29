// WorkflowSidebar.tsx - Complete working code with Ansible Upgrade support
"use client";

import { ChangeEvent, FormEvent, useState, Dispatch, SetStateAction } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import FileTreeSelector, { TreeNode } from "./FileTreeSelector";

interface WorkflowSidebarProps {
  currentStep: number;
  loading: boolean;
  sourceType: "upload" | "existing" | "git";
  setSourceType: Dispatch<SetStateAction<"upload" | "existing" | "git">>;
  uploadKey: number;
  setUploadKey: Dispatch<SetStateAction<number>>;
  code: string;
  setCode: Dispatch<SetStateAction<string>>;
  selectedFile: string;
  setSelectedFile: Dispatch<SetStateAction<string>>;
  selectedFolder: string;
  setSelectedFolder: Dispatch<SetStateAction<string>>;
  folderList: string[];
  fileList: string[];
  gitUrl: string;
  setGitUrl: Dispatch<SetStateAction<string>>;
  // Git-related props that were missing
  gitRepoName?: string;
  gitFolderList?: string[];
  gitFileList?: string[];
  selectedGitFolder?: string;
  setSelectedGitFolder?: Dispatch<SetStateAction<string>>;
  selectedGitFile?: string;
  setSelectedGitFile?: Dispatch<SetStateAction<string>>;
  // Function props with correct signatures
  fetchFolders?: () => void;
  fetchFilesInFolder: (folder: string) => void;
  fetchFileContent: (folder: string, file: string) => void;
  handleUpload: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleCloneRepo: (e: FormEvent) => Promise<void>;
  fetchGitFiles: (repo: string, folder: string) => Promise<void>;
  fetchGitFileContent: (repo: string, folder: string, file: string) => Promise<void>;
  handleManualClassify?: (files?: { path: string; content: string }[], technology?: string) => void;
  // Config props
  contextConfig?: Record<string, unknown>;
  setContextConfig?: (config: Record<string, unknown>) => void;
  conversionConfig?: Record<string, unknown>;
  setConversionConfig?: (config: Record<string, unknown>) => void;
  validationConfig?: Record<string, unknown>;
  setValidationConfig?: (config: Record<string, unknown>) => void;
  deploymentConfig?: Record<string, unknown>;
  setDeploymentConfig?: (config: Record<string, unknown>) => void;
}

// Clean fetchTree function
async function fetchTree(path: string = ""): Promise<TreeNode[]> {
  try {
    const baseUrl = "";

    const url = path
      ? `${baseUrl}/api/files/tree?path=${encodeURIComponent(path)}`
      : `${baseUrl}/api/files/tree`;

    const res = await fetch(url);

    if (!res.ok) {
      console.error(`File tree fetch failed: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    return data.items || [];
  } catch (e) {
    console.error("File tree fetch exception:", e);
    return [];
  }
}

export default function WorkflowSidebar(props: WorkflowSidebarProps) {
  const { currentStep } = props;

  // Multi-file explorer state
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Technology selection state
  const [selectedTechnology, setSelectedTechnology] = useState<string>("chef");

  // Technology options - UPDATED: Added Ansible Upgrade support
  const technologies = [
    { id: "chef", name: "Chef", icon: "👨‍🍳", description: "Chef cookbooks and recipes" },
    // { id: "bladelogic", name: "BladeLogic", icon: "⚔️", description: "BMC BladeLogic automation" },
    // { id: "puppet", name: "Puppet", icon: "🎭", description: "Puppet manifests and modules" },
    // { id: "shell", name: "Shell Scripts", icon: "🐚", description: "Shell scripts and automation" },
    // { id: "salt", name: "Salt", icon: "🧂", description: "SaltStack states and formulas" },
    // { id: "ansible-upgrade", name: "Ansible Upgrade", icon: "🔄", description: "Upgrade existing Ansible code" },
    // { id: "terraform", name: "Terraform", icon: "🏗️", description: "Terraform configurations" }
  ];

  // Handle multi-file analyze with technology selection
  async function handleAnalyzeFiles(selectedFiles: string[]) {
    if (selectedFiles.length === 0) {
      alert("Please select at least one file first!");
      return;
    }

    setAnalyzing(true);

    try {
      const baseUrl = "";

      const response = await fetch(`${baseUrl}/api/files/get_many`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedFiles),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.files && Array.isArray(data.files) && data.files.length > 0) {
        const fileList = data.files.map((f: { path: string }) => f.path).join(", ");
        const combinedContent = `# Combined Analysis of ${data.files.length} files: ${fileList}

${data.files
  .map((file: { path: string; content: string }) => `
# ========================================
# File: ${file.path}
# ========================================
${file.content}`)
  .join('\n\n')}`;

        if (props.setCode) {
          props.setCode(combinedContent);
        }
        
        // Pass the files directly (not the combined content) along with technology
        props.handleManualClassify?.(data.files, selectedTechnology);
      } else {
        throw new Error("No files received from server or invalid format");
      }
    } catch (error: unknown) {
      console.error("Analysis failed:", error);
      alert(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setAnalyzing(false);
    }
  }

  // Wrapper for steps 1-4
  const SidebarWrapper = ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div className="w-80 bg-gray-900 dark:bg-gray-950 text-white rounded-lg border border-gray-700 dark:border-gray-600 flex flex-col h-[75vh]">
      <div className="px-4 py-3 border-b border-gray-700 bg-gray-800 rounded-t-lg flex-shrink-0">
        <h3 className="font-semibold text-sm text-gray-200">{title}</h3>
      </div>
      <div className="flex-1 overflow-auto rh-scrollbar">
        <div className="p-4">{children}</div>
      </div>
    </div>
  );

  // Step 0: Source Selection with fixed layout
  if (currentStep === 0) {
    return (
      <div className="w-80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-lg flex flex-col h-[75vh]">
        
        {/* Header - Source Type Buttons */}
        <div className="border-b border-slate-700 p-3 flex-shrink-0">
          <div className="flex gap-2 mb-3">
            {[
              { key: "upload", label: "Upload", icon: "📁" },
              { key: "existing", label: "Select", icon: "📂" },
              { key: "git", label: "Git", icon: "🔗" },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                disabled={props.loading}
                className={`flex-1 px-3 py-2 text-sm rounded-lg font-medium border transition-colors disabled:opacity-50 text-center flex items-center justify-center gap-1 ${
                  props.sourceType === key
                    ? "bg-blue-600/90 text-white border-blue-500 shadow"
                    : "bg-slate-800/70 text-slate-300 hover:bg-slate-700 border-slate-700"
                }`}
                onClick={() => props.setSourceType(key as "upload" | "existing" | "git")}
              >
                <span>{icon}</span>
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>

          {/* Technology Selection */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 mb-2 flex items-center gap-2">
              🎯 Technology Type
            </h4>
            <select
              value={selectedTechnology}
              onChange={(e) => setSelectedTechnology(e.target.value)}
              disabled={props.loading}
              className="w-full p-2 rounded-lg border border-slate-700 text-sm bg-slate-800 text-slate-200 disabled:opacity-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {technologies.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.icon} {tech.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-auto p-4">
          {/* Upload Option */}
          {props.sourceType === "upload" && (
            <div className="space-y-3">
              <label className="block bg-blue-600 hover:bg-blue-700 text-white text-sm text-center py-2 rounded cursor-pointer transition-colors shadow-md">
                Upload File
                <input
                  key={props.uploadKey}
                  type="file"
                  onChange={props.handleUpload}
                  className="hidden"
                  disabled={props.loading}
                  accept="*/*"
                />
              </label>
              {props.code && (
                <div className="p-3 bg-slate-800 rounded text-xs border border-slate-700">
                  <div className="text-slate-300">📄 File loaded: {props.code.length} characters</div>
                </div>
              )}
            </div>
          )}

          {/* Existing Files Option */}
          {props.sourceType === "existing" && (
            <div className="space-y-3">
              <FileTreeSelector
                fetchTree={fetchTree}
                selectedFiles={selectedFiles}
                setSelectedFiles={setSelectedFiles}
                technologyType={selectedTechnology}
              />
            </div>
          )}

          {/* Git Option */}
          {props.sourceType === "git" && (
            <div className="space-y-3">
              <form onSubmit={props.handleCloneRepo} className="space-y-2">
                <input
                  type="url"
                  value={props.gitUrl}
                  onChange={(e) => props.setGitUrl(e.target.value)}
                  placeholder="https://github.com/user/repo.git"
                  className="w-full p-2 border border-slate-700 rounded-lg text-sm bg-slate-800 text-slate-200 disabled:opacity-50"
                  disabled={props.loading}
                />
                <button
                  disabled={props.loading || !props.gitUrl.trim()}
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm transition-colors disabled:opacity-50 shadow-md"
                >
                  {props.loading ? "⏳ Cloning..." : "🔗 Clone Repository"}
                </button>
              </form>
              
              {props.selectedGitFolder && (
                <div className="space-y-2">
                  <select
                    disabled={props.loading}
                    className="w-full p-2 rounded-lg border border-slate-700 text-sm bg-slate-800 text-slate-200 disabled:opacity-50"
                    value={props.selectedGitFolder}
                    onChange={(e) => {
                      props.setSelectedGitFolder?.(e.target.value);
                      if (e.target.value) props.fetchGitFiles?.(props.gitRepoName || '', e.target.value);
                    }}
                  >
                    <option value="">-- Select Folder --</option>
                    {props.folderList?.map((f, i) => (
                      <option key={i} value={f}>📁 {f}</option>
                    ))}
                  </select>
                  
                  {props.selectedGitFolder && (
                    <select
                      disabled={props.loading}
                      className="w-full p-2 rounded-lg border border-slate-700 text-sm bg-slate-800 text-slate-200 disabled:opacity-50"
                      value={props.selectedGitFile}
                      onChange={(e) => {
                        if (e.target.value)
                          props.fetchGitFileContent?.(props.gitRepoName || '', props.selectedGitFolder || '', e.target.value);
                      }}
                    >
                      <option value="">-- Select File --</option>
                      {props.fileList?.map((f, i) => (
                        <option key={i} value={f}>📄 {f}</option>
                      ))}
                    </select>
                  )}
                  
                  {props.code && (
                    <div className="p-3 bg-slate-800 rounded text-xs border border-slate-700">
                      <div className="text-slate-300">📄 File loaded: {props.code.length} characters</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed Analyze Button at Bottom */}
        <div className="border-t border-slate-700 p-4 flex-shrink-0">
          {/* Show analyze button based on source type and content */}
          {((props.sourceType === "upload" && props.code) ||
            (props.sourceType === "existing" && selectedFiles.length > 0) ||
            (props.sourceType === "git" && props.code)) && (
            <button
              onClick={() => {
                if (props.sourceType === "existing") {
                  handleAnalyzeFiles(selectedFiles);
                } else {
                  props.handleManualClassify?.();
                }
              }}
              disabled={
                props.loading || 
                analyzing ||
                (props.sourceType === "upload" && !props.code.trim()) ||
                (props.sourceType === "existing" && selectedFiles.length === 0) ||
                (props.sourceType === "git" && !props.code.trim())
              }
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full font-semibold text-base bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {(props.loading || analyzing) ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon className="w-5 h-5" />
                  <span>
                    Analyze {props.sourceType === "existing" ? `${selectedFiles.length} Files` : "File"} with {technologies.find(t => t.id === selectedTechnology)?.name}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Step 1: Context Configuration
  if (currentStep === 1) {
    return (
      <SidebarWrapper title=" Context Configuration">
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={(props.contextConfig as any)?.includeComments || false}
                onChange={(e) => props.setContextConfig?.({
                  ...props.contextConfig,
                  includeComments: e.target.checked
                })}
                className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
              />
              Include code comments
            </label>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={(props.contextConfig as any)?.analyzeDependencies ?? true}
                onChange={(e) => props.setContextConfig?.({
                  ...props.contextConfig,
                  analyzeDependencies: e.target.checked
                })}
                className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
              />
              Analyze dependencies
            </label>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Environment Type</label>
            <select
              value={(props.contextConfig as any)?.environmentType || 'development'}
              onChange={(e) => props.setContextConfig?.({
                ...props.contextConfig,
                environmentType: e.target.value
              })}
              className="w-full p-2 rounded border border-gray-600 text-sm bg-gray-800 text-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            >
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Scan Depth</label>
            <select
              value={(props.contextConfig as any)?.scanDepth || 'medium'}
              onChange={(e) => props.setContextConfig?.({
                ...props.contextConfig,
                scanDepth: e.target.value
              })}
              className="w-full p-2 rounded border border-gray-600 text-sm bg-gray-800 text-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            >
              <option value="shallow">Shallow (Fast)</option>
              <option value="medium">Medium (Recommended)</option>
              <option value="deep">Deep (Thorough)</option>
            </select>
          </div>
          <div className="pt-2">
            <div className="p-3 bg-gray-800 rounded text-xs border border-gray-700">
              <div className="text-gray-300">🎯 Context analysis examines code structure, dependencies, and environment requirements for optimal conversion.</div>
            </div>
          </div>
        </div>
      </SidebarWrapper>
    );
  }

  // Step 2: Conversion Options
  if (currentStep === 2) {
    return (
      <SidebarWrapper title="⚙️ Conversion Options">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Target Framework</label>
            <select
              value={(props.conversionConfig as any)?.targetFramework || 'ansible'}
              onChange={(e) => props.setConversionConfig?.({
                ...props.conversionConfig,
                targetFramework: e.target.value
              })}
              className="w-full p-2 rounded border border-gray-600 text-sm bg-gray-800 text-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            >
              <option value="ansible">Ansible</option>
              <option value="terraform">Terraform</option>
              <option value="kubernetes">Kubernetes</option>
            </select>
          </div>
        </div>
      </SidebarWrapper>
    );
  }

  // Step 3: Validation Config
  if (currentStep === 3) {
    return (
      <SidebarWrapper title=" Validation Settings">
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={(props.validationConfig as any)?.syntaxCheck ?? true}
                onChange={(e) => props.setValidationConfig?.({
                  ...props.validationConfig,
                  syntaxCheck: e.target.checked
                })}
                className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
              />
              Syntax validation
            </label>
          </div>
        </div>
      </SidebarWrapper>
    );
  }

  // Step 4: Deployment Config
  if (currentStep === 4) {
    return (
      <SidebarWrapper title="🚀 Deployment Settings">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Deployment Target</label>
            <select
              value={(props.deploymentConfig as any)?.target || 'local'}
              onChange={(e) => props.setDeploymentConfig?.({
                ...props.deploymentConfig,
                target: e.target.value
              })}
              className="w-full p-2 rounded border border-gray-600 text-sm bg-gray-800 text-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            >
              <option value="local">Local</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>
          </div>
        </div>
      </SidebarWrapper>
    );
  }

  return null;
}