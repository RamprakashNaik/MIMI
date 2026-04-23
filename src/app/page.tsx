"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSettings, Provider } from "@/context/SettingsContext";
import { useChat, Message } from "@/context/ChatContext";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { extractTextFromFile, formatDocumentForPrompt, getFileCategory, FileCategory } from "@/lib/fileParser";
import { useArtifacts, Artifact, ArtifactType } from "@/context/ArtifactContext";

// ...

const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const [copied, setCopied] = useState(false);
  const { addOrUpdateArtifact } = useArtifacts();
  
  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleView = () => {
    const content = String(children).replace(/\n$/, '');
    const lang = match ? match[1] : 'html';
    addOrUpdateArtifact({
      id: `temp-${Math.random().toString(36).substr(2, 9)}`,
      type: (lang === 'svg' ? 'svg' : 'html') as any,
      title: 'Code Preview',
      content: content
    });
  };

  if (!inline && match) {
    const isViewable = ['html', 'svg', 'xml'].includes(match[1]);

    return (
      <div className="code-block-wrapper">
        <div className="code-block-header">
          <span className="code-language">{match[1]}</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {isViewable && (
              <button onClick={handleView} className="code-copy-btn" title="View Artifact">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'14px',height:'14px'}}><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                View
              </button>
            )}
            <button onClick={handleCopy} className="code-copy-btn" title="Copy Code">
              {copied ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
        <pre className={className} {...props}>
          <code>{children}</code>
        </pre>
      </div>
    );
  }
  return <code className={className} {...props}>{children}</code>;
};

// ── ArtifactBox ─────────────────────────────────────────────────────────────

const ArtifactBox = ({ type, title, identifier, children }: any) => {
  const { artifacts, addOrUpdateArtifact } = useArtifacts();
  const [copied, setCopied] = useState(false);
  
  // Find the actual artifact data from our context (parsed in the useEffect)
  const artifactData = artifacts.find(a => a.id === identifier);
  
  const content = artifactData ? artifactData.content : "";

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleView = () => {
    if (artifactData) {
      addOrUpdateArtifact(artifactData);
    }
  };

  if (!artifactData) return null; // Or show a placeholder

  return (
    <div className={`artifact-chat-box ${artifactData.status === 'generating' ? 'generating' : ''}`}>
      <div className="artifact-chat-header">
        <div className="artifact-chat-info">
          <div className="artifact-chat-icon">
            {artifactData.status === 'generating' ? (
              <div className="generating-spinner">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
            )}
          </div>
          <div className="artifact-chat-details">
            <span className="artifact-chat-title">{artifactData.title || title || 'Untitled Artifact'}</span>
            <span className="artifact-chat-type">
              {artifactData.status === 'generating' ? 'Generating Content...' : (artifactData.type || type)}
            </span>
          </div>
        </div>
        <div className="artifact-chat-actions">
          {artifactData.status !== 'generating' && (
            <>
              <button className="artifact-chat-btn" onClick={handleView}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                View
              </button>
              <button className="artifact-chat-btn" onClick={handleCopy}>
                {copied ? 'Copied!' : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Copy
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const CustomModelSelect = ({ availableModels, selectedProviderId, selectedModelId, onSelect }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredModels = availableModels.filter((m: any) => 
    m.name?.toLowerCase().includes(search.toLowerCase()) || 
    m.id.toLowerCase().includes(search.toLowerCase()) ||
    m.providerName.toLowerCase().includes(search.toLowerCase())
  );

  const groupedModels = filteredModels.reduce((acc: any, m: any) => {
    if (!acc[m.providerName]) acc[m.providerName] = [];
    acc[m.providerName].push(m);
    return acc;
  }, {});

  const selectedModelInfo = availableModels.find((m: any) => m.id === selectedModelId && m.providerId === selectedProviderId);

  return (
    <div className="model-dropdown-wrapper" ref={dropdownRef}>
      <button className="model-dropdown-button" onClick={() => setIsOpen(!isOpen)}>
        <span>{selectedModelInfo ? `${selectedModelInfo.name || selectedModelInfo.id}` : "Select a model..."}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '16px', height: '16px', marginLeft: '0.5rem'}}><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>

      {isOpen && (
        <div className="model-dropdown-menu">
          <div className="model-dropdown-search-wrapper">
            <input 
              type="text" 
              className="model-dropdown-search" 
              placeholder="Search models..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="model-dropdown-list">
            {Object.keys(groupedModels).length === 0 ? (
              <div style={{padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem'}}>No models found</div>
            ) : (
              Object.keys(groupedModels).map((providerName) => (
                <div key={providerName}>
                  <div className="model-dropdown-group-title">{providerName}</div>
                  {groupedModels[providerName].map((m: any) => (
                    <div 
                      key={`${m.providerId}::${m.id}`} 
                      className={`model-dropdown-item ${selectedModelId === m.id && selectedProviderId === m.providerId ? 'selected' : ''}`}
                      onClick={() => {
                        onSelect(m.providerId, m.id);
                        setIsOpen(false);
                        setSearch("");
                      }}
                    >
                      <span className="model-dropdown-item-name">{m.name || m.id}</span>
                      {m.name && m.name !== m.id && <span className="model-dropdown-item-id">{m.id}</span>}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── DocChip ──────────────────────────────────────────────────────────────────
// Renders a coloured chip for non-image document attachments

const DOC_COLORS: Record<string, { bg: string; border: string; label: string; icon: React.ReactNode }> = {
  pdf: {
    bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', label: 'PDF',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'18px',height:'18px',color:'#ef4444'}}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  },
  word: {
    bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', label: 'DOCX',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'18px',height:'18px',color:'#3b82f6'}}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  },
  excel: {
    bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)', label: 'XLSX',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'18px',height:'18px',color:'#22c55e'}}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><rect x="8" y="13" width="8" height="6" rx="1"/><line x1="10" y1="13" x2="10" y2="19"/><line x1="14" y1="13" x2="14" y2="19"/></svg>
  },
  text: {
    bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.35)', label: 'TXT',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'18px',height:'18px',color:'#9ca3af'}}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
  },
};

function formatBytes(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getDocKey(type: string, name: string): keyof typeof DOC_COLORS {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (type === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (ext === 'docx' || ext === 'doc') return 'word';
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return 'excel';
  return 'text';
}

const DocChip = ({ name, type, fileSize, compact }: { name: string; type: string; fileSize?: number; compact?: boolean }) => {
  const key = getDocKey(type, name);
  const config = DOC_COLORS[key] || DOC_COLORS.text;
  const shortName = name.length > 24 ? name.slice(0, 21) + '…' : name;
  return (
    <div
      className="doc-chip"
      style={{ background: config.bg, borderColor: config.border }}
      title={name}
    >
      {config.icon}
      <div className="doc-chip-info">
        <span className="doc-chip-name">{compact ? shortName : name}</span>
        {!compact && fileSize && <span className="doc-chip-size">{formatBytes(fileSize)}</span>}
        <span className="doc-chip-label" style={{ color: Object.values(config.border.match(/\d+,\d+,\d+/) || [''])[0] ? undefined : '#9ca3af' }}>{config.label}</span>
      </div>
      {!compact && fileSize && <span className="doc-chip-size-inline">{formatBytes(fileSize)}</span>}
    </div>
  );
};

// ── SourcePanel ─────────────────────────────────────────────────────────────

const SourcePanel = ({ sources }: { sources: { title: string; url: string; content: string }[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  if (!sources || sources.length === 0) return null;

  return (
    <div className="source-panel">
      <button className="source-toggle" onClick={() => setIsOpen(!isOpen)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:'14px',height:'14px'}}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
        <span>Sources ({sources.length})</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:'14px',height:'14px', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s'}}>
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      {isOpen && (
        <div className="source-list">
          {sources.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="source-item">
              <span className="source-index">{i + 1}</span>
              <div className="source-meta">
                <span className="source-title">{s.title}</span>
                <span className="source-url">{new URL(s.url).hostname}</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:'12px',height:'12px', marginLeft:'auto'}}><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

// ── ArtifactPanel ─────────────────────────────────────────────────────────────



const ArtifactPanel = ({ width }: { width: number }) => {
  const { activeArtifact, isPanelOpen, setIsPanelOpen } = useArtifacts();

  if (!activeArtifact || !isPanelOpen) return null;

  const downloadArtifact = () => {
    const ext = activeArtifact.type === 'html' ? 'html' : activeArtifact.type === 'svg' ? 'svg' : 'txt';
    const blob = new Blob([activeArtifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeArtifact.title || 'artifact'}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getIframeSrc = () => {
    if (activeArtifact.type === 'svg') {
      return `
        <html>
          <head>
            <style>
              body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #ffffff; }
              svg { max-width: 100%; max-height: 100vh; height: auto; }
            </style>
          </head>
          <body>${activeArtifact.content}</body>
        </html>
      `;
    }
    return activeArtifact.content;
  };

  return (
    <div 
      className={`artifact-view ${isPanelOpen ? 'open' : ''}`} 
      style={{ width: `${width}px`, transition: isPanelOpen ? 'width 0.3s ease' : 'none' }}
    >
      <div className="artifact-header">
        <div className="logo-box" style={{width: '2rem', height: '2rem'}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: '1.2rem', height: '1.2rem', stroke: 'white'}}>
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
        </div>
        <h3 className="artifact-title">{activeArtifact.title}</h3>
        <div className="artifact-actions">
          <button className="artifact-btn" onClick={downloadArtifact} title="Download">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '16px', height: '16px'}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </button>
          <button className="artifact-btn" onClick={() => setIsPanelOpen(false)} title="Close Preview">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '16px', height: '16px'}}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
      <div className="artifact-content-container">
        {activeArtifact.type === 'html' || activeArtifact.type === 'svg' ? (
          <iframe 
            srcDoc={getIframeSrc()}
            className="artifact-iframe"
            sandbox="allow-scripts"
            title={activeArtifact.title}
            style={{ background: '#ffffff' }}
          />
        ) : (
          <pre className="artifact-code-view">
            <code>{activeArtifact.content}</code>
          </pre>
        )}
      </div>
    </div>
  );
};

export default function Home() {
  // Contexts
  const { 
    providers, setProviders, 
    picos, setPicos,
    selectedPicoId, setSelectedPicoId,
    selectedModelId, setSelectedModelId, 
    selectedProviderId, setSelectedProviderId,
    tavilyApiKey, setTavilyApiKey,
    defaultWebSearch, setDefaultWebSearch
  } = useSettings();
  const { chats, activeChatId, setActiveChatId, createNewChat, addMessage, updateMessage, deleteChat, renameChat, togglePinChat, updateChatModel, deleteAllChats } = useChat();
  const { 
    activeArtifact, setActiveArtifact, 
    isPanelOpen, setIsPanelOpen, 
    artifacts, addOrUpdateArtifact 
  } = useArtifacts();
  
  const lastProcessedContentRef = useRef<string>("");

  // Local State
  const [panelWidth, setPanelWidth] = useState(600); // Default width
  const [isResizing, setIsResizing] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deletePicoId, setDeletePicoId] = useState<string | null>(null);
  const [showPicoModal, setShowPicoModal] = useState(false);
  const [picoForm, setPicoForm] = useState({ name: "", systemPrompt: "", firstMessage: "" });
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chatSearch, setChatSearch] = useState("");
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isParsing, setIsParsing] = useState(false); // true while extracting doc text
  const [pendingAttachments, setPendingAttachments] = useState<{
    dataUrl?: string;
    name: string;
    type: string;
    extractedText?: string;
    fileSize?: number;
    category?: FileCategory;
  }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Available models format: { id, name, providerId, providerName }
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelError, setModelError] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, chatId: string } | null>(null);

  // Custom Modal States
  const [renameModal, setRenameModal] = useState<{chatId: string, title: string} | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Derived state
  const activeChat = chats.find(c => c.id === activeChatId);
  const messages = activeChat?.messages || [];

  // Sync Global Model Dropdown to Active Chat's Memory
  useEffect(() => {
    if (activeChat && activeChat.modelId && activeChat.providerId) {
      if (activeChat.modelId !== selectedModelId || activeChat.providerId !== selectedProviderId) {
        setSelectedModelId(activeChat.modelId);
        setSelectedProviderId(activeChat.providerId);
      }
    }
  }, [activeChat, selectedModelId, selectedProviderId, setSelectedModelId, setSelectedProviderId]);

  // Sort chats: Pinned first, then by updatedAt
  const sortedChats = [...chats].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updatedAt - a.updatedAt;
  }).filter(chat => chat.title.toLowerCase().includes(chatSearch.toLowerCase()));

  // Auto-inject Pico First Message Greeting
  useEffect(() => {
    if (activeChat && activeChat.messages.length === 0 && activeChat.picoId) {
      const pico = picos.find(p => p.id === activeChat.picoId);
      if (pico && pico.firstMessage) {
        addMessage(activeChat.id, {
          id: Date.now().toString(),
          role: "assistant", // Pretend it comes from the AI
          content: pico.firstMessage
        });
      }
    }
  }, [activeChatId, chats, picos, addMessage, activeChat]);

  const fetchModels = async () => {
    if (!providers || providers.length === 0) return;
    setIsFetchingModels(true);
    setModelError("");
    
    let allModels: any[] = [];
    let hadError = false;

    // Parallel fetching from all providers
    const fetchPromises = providers.map(async (provider) => {
      if (!provider.baseUrl) return;
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (provider.apiKey) headers["Authorization"] = `Bearer ${provider.apiKey}`;

        // Route request through internal proxy to bypass CORS
        const res = await fetch("/api/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: `${provider.baseUrl.replace(/\/$/, '')}/models`,
            method: "GET",
            headers
          })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        const modelsList = data.data || data.models || [];
        
        // Tag models with provider info
        modelsList.forEach((m: any) => {
          allModels.push({
            id: m.id,
            name: m.name,
            providerId: provider.id,
            providerName: provider.name
          });
        });
      } catch (err: any) {
        console.warn(`Failed to fetch from ${provider.name}:`, err);
        hadError = true;
      }
    });

    await Promise.allSettled(fetchPromises);
    
    setAvailableModels(allModels);

    if (allModels.length > 0 && !selectedModelId) {
      setSelectedModelId(allModels[0].id);
      setSelectedProviderId(allModels[0].providerId);
    }

    if (hadError && allModels.length === 0) {
      setModelError("Failed to fetch models from any provider.");
    } else if (hadError) {
      setModelError("Partially fetched models. Some providers failed.");
    }
    
    setIsFetchingModels(false);
  };

  useEffect(() => {
    if (providers.length > 0) {
      fetchModels();
    }
  }, [providers]); // Fetch when providers change or on mount

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // ── Artifact Detection ──
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'assistant' && lastMsg.content) {
      const content = lastMsg.content;
      
      // Prevent redundant processing if content hasn't changed
      if (content === lastProcessedContentRef.current) return;
      lastProcessedContentRef.current = content;

      const completeIds = new Set<string>();

      // 1. Match COMPLETE artifacts
      const completeRegex = /<artifact\s+type="([^"]+)"\s+title="([^"]+)"\s+identifier="([^"]+)"[^>]*>([\s\S]*?)<\/artifact>/gi;
      let match;
      while ((match = completeRegex.exec(content)) !== null) {
        const [, type, title, id, artifactContent] = match;
        const trimmed = artifactContent.trim();
        completeIds.add(id);
        
        // Only update if it's new or content changed
        const existing = artifacts.find(a => a.id === id);
        if (!existing || existing.content !== trimmed || existing.status !== 'complete') {
          addOrUpdateArtifact({
            id,
            type: type as ArtifactType,
            title,
            content: trimmed,
            status: 'complete'
          });
        }
      }

      // 2. Match INCOMPLETE (generating) artifacts
      const openRegex = /<artifact\s+type="([^"]+)"\s+title="([^"]+)"\s+identifier="([^"]+)"[^>]*>([\s\S]*?)$/gi;
      while ((match = openRegex.exec(content)) !== null) {
        const [, type, title, id, artifactContent] = match;
        const trimmed = artifactContent.trim();
        if (!completeIds.has(id)) {
          const existing = artifacts.find(a => a.id === id);
          if (!existing || existing.content !== trimmed || existing.status !== 'generating') {
            addOrUpdateArtifact({
              id,
              type: type as ArtifactType,
              title,
              content: trimmed,
              status: 'generating'
            });
          }
        }
      }
    }
  }, [messages, addOrUpdateArtifact, artifacts]);

  // ── Auto-reset/sync Web Search on Chat Switch ──
  useEffect(() => {
    setWebSearchEnabled(defaultWebSearch);
  }, [activeChatId, defaultWebSearch]);

  // ── Auto-close Panel on Chat Switch ──
  useEffect(() => {
    setIsPanelOpen(false);
  }, [activeChatId, setIsPanelOpen]);

  // ── Resize Logic ──
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 300 && newWidth < window.innerWidth * 0.8) {
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const generateTitleForChat = async (chatId: string, userMessage: string, provider: Provider, modelId: string) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (provider.apiKey) headers["Authorization"] = `Bearer ${provider.apiKey}`;

      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`,
          method: "POST",
          headers,
          body: {
            model: modelId,
            messages: [
              { role: "system", content: "You are a helpful assistant that generates extremely concise 3-4 word titles for a chat. Read the user's prompt and output ONLY a short title. Do not use quotes, punctuation, or conversational text. Just the title." },
              { role: "user", content: userMessage }
            ],
            stream: false,
            max_tokens: 15
          }
        })
      });

      if (!res.ok) return;
      
      const data = await res.json();
      let generatedTitle = data.choices[0]?.message?.content?.replace(/["']/g, "")?.trim();
      
      if (generatedTitle) {
        renameChat(chatId, generatedTitle);
      }
    } catch (e) {
      console.warn("Auto-titler failed:", e);
    }
  };

  const sendMessage = async (overrideInput?: string) => {
    const textToSend = overrideInput !== undefined ? overrideInput : input;
    if (isTyping || !textToSend.trim() || !selectedModelId || !selectedProviderId) {
      if (!selectedModelId || !selectedProviderId) setShowSettings(true);
      return;
    }

    const activeProvider = providers.find(p => p.id === selectedProviderId);
    if (!activeProvider) {
      alert("Selected provider not found. Please check your settings.");
      setShowSettings(true);
      return;
    }

    let targetChatId = activeChatId;
    if (!targetChatId) {
      createNewChat(selectedProviderId, selectedModelId, selectedPicoId);
      // We must briefly wait for the react cycle to map the new chat, or mock it dynamically. 
      // For synchronous safety, we can't reliably rely on targetChatId here without blocking, but createNewChat triggers state which re-renders. 
      // We will let the useEffect handle empty states securely next time or manually pull it via Context refs.
      // To strictly avoid a race condition, we return and require the user to hit send again on a perfectly fresh state, OR we mock it.
      // Since createNewChat triggers an instant dispatch, we'll gracefully return and alert the user it is ready.
      return;
    }

    const attachmentsToSend = [...pendingAttachments];
    setPendingAttachments([]); // Clear visually immediately

    const userId = Date.now().toString() + Math.random().toString();
    const userMessage: Message = { id: userId, role: "user", content: textToSend, attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined };
    
    // Check if this is the first message in the chat to trigger AI auto-title
    const isFirstMessage = !activeChatId || (activeChat && activeChat.messages.length === 0);

    addMessage(targetChatId, userMessage);
    if (overrideInput === undefined) {
      setInput("");
    }
    setIsTyping(true);

    if (isFirstMessage) {
      generateTitleForChat(targetChatId, textToSend, activeProvider, selectedModelId);
    }

    let searchData: any[] = [];
    if (webSearchEnabled) {
      setIsSearching(true);
      try {
        const searchRes = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: textToSend, apiKey: tavilyApiKey })
        });
        if (searchRes.ok) {
          const { results } = await searchRes.json();
          searchData = results;
        }
      } catch (err) {
        console.warn("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }

    let formattedMessages = [...messages, userMessage].map(({ role, content, attachments }) => {
      if (attachments && attachments.length > 0) {
        const images = attachments.filter(a => a.dataUrl && !a.extractedText);
        const docs = attachments.filter(a => a.extractedText);

        // Prepend extracted document text to message content
        let enrichedContent = content;
        if (docs.length > 0) {
          const docBlocks = docs
            .map(d => formatDocumentForPrompt(d.name, d.extractedText!))
            .join("\n\n");
          enrichedContent = `${docBlocks}\n\n${content}`;
        }

        if (images.length > 0) {
          // Multimodal: text + image_url parts
          const multimodalContent = [
            { type: "text", text: enrichedContent },
            ...images.map(att => ({
              type: "image_url",
              image_url: { url: att.dataUrl }
            }))
          ];
          return { role, content: multimodalContent as any };
        }

        return { role, content: enrichedContent };
      }
      return { role, content };
    });

    const ARTIFACT_INSTRUCTIONS = `
Whenever you are creating a standalone piece of content like a website, a document template, a diagram (SVG), or a substantial code snippet, you MUST wrap it in an <artifact> tag.
Format:
<artifact type="html|svg|code" title="Descriptive Title" identifier="unique-id">
... content here ...
</artifact>

- Use 'html' for web pages, 'svg' for vector graphics, and 'code' for general snippets.
- The user will see this in a premium side panel for preview and download.
`;

    const activePicoId = activeChat ? activeChat.picoId : selectedPicoId;
    const activePico = picos.find(p => p.id === activePicoId);
    
    const SEARCH_INSTRUCTIONS = searchData.length > 0 
      ? `\n\nYou have access to real-time search results for the user's query. Use this information to provide a factual, up-to-date answer. Cite your sources if relevant.\n\n<search_results>\n${searchData.map((r, i) => `[${i+1}] ${r.title}: ${r.content}`).join("\n\n")}\n</search_results>`
      : "";

    const systemContent = activePico && activePico.systemPrompt 
      ? `${activePico.systemPrompt}\n\n${ARTIFACT_INSTRUCTIONS}${SEARCH_INSTRUCTIONS}`
      : `${ARTIFACT_INSTRUCTIONS}${SEARCH_INSTRUCTIONS}`;

    formattedMessages = [
      { role: "system", content: systemContent },
      ...formattedMessages
    ];
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const assistantId = Date.now().toString() + Math.random().toString();
    addMessage(targetChatId, { 
      id: assistantId, 
      role: "assistant", 
      content: "",
      searchResults: searchData.length > 0 ? searchData : undefined
    });

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (activeProvider.apiKey) headers["Authorization"] = `Bearer ${activeProvider.apiKey}`;

      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          url: `${activeProvider.baseUrl.replace(/\/$/, '')}/chat/completions`,
          method: "POST",
          headers,
          body: {
            model: selectedModelId,
            messages: formattedMessages,
            stream: true,
          }
        })
      });

      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let done = false;
      let accumulatedContent = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter(line => line.trim() !== "");
          
          for (const line of lines) {
            if (line.replace(/^data: /, "").trim() === "[DONE]") {
              done = true;
              break;
            }
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.replace(/^data: /, ""));
                const contentChunk = data.choices[0]?.delta?.content || "";
                accumulatedContent += contentChunk;
                
                updateMessage(targetChatId, assistantId, accumulatedContent);
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream stopped by user');
      } else {
        console.warn(err);
        updateMessage(targetChatId, assistantId, "Sorry, I encountered an error connecting to the API.");
      }
    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  const stopMessage = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isTyping) sendMessage();
    }
  };

  const autoResizeTextarea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  const addFilesToAttachments = (files: FileList | File[]) => {
    Array.from(files).forEach(async (file) => {
      const category = getFileCategory(file);
      if (category === "unknown") return; // ignore unsupported types

      if (category === "image") {
        // Images: store as dataUrl for multimodal API
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          setPendingAttachments(prev => [
            ...prev,
            { dataUrl, name: file.name || "pasted_image", type: file.type, fileSize: file.size, category }
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        // Documents: extract text client-side
        setIsParsing(true);
        try {
          const extractedText = await extractTextFromFile(file);
          setPendingAttachments(prev => [
            ...prev,
            { name: file.name, type: file.type, extractedText, fileSize: file.size, category }
          ]);
        } catch (err) {
          console.warn("Failed to parse file:", err);
          const errMsg = err instanceof Error ? err.message : String(err);
          alert(`Could not read "${file.name}".\n\nDetails: ${errMsg}`);
        } finally {
          setIsParsing(false);
        }
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFilesToAttachments(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    
    if (imageFiles.length > 0) {
      e.preventDefault(); // Prevent default text-pasting if it's purely an image
      addFilesToAttachments(imageFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToAttachments(e.dataTransfer.files);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, chatId });
  };

  useEffect(() => {
    if (chats.length === 0 && !activeChatId && selectedProviderId && selectedModelId) {
      createNewChat(selectedProviderId, selectedModelId, selectedPicoId);
    }
  }, [chats, activeChatId, selectedProviderId, selectedModelId, selectedPicoId, createNewChat]);

  return (
    <>
      <aside className={`sidebar ${isSidebarOpen ? '' : 'closed'}`}>
        <div className="sidebar-header" style={{ marginBottom: '1.5rem' }}>
          <div className="logo-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="logo-icon">
              <path d="M12 2a10 10 0 1 0 10 10H12V2Z"></path>
              <path d="M12 12 2.1 7.1"></path>
              <path d="m12 12 9.9 4.9"></path>
            </svg>
          </div>
          <h1 className="sidebar-title">MIMI</h1>
        </div>

        <button className="new-chat-btn" onClick={() => createNewChat(selectedProviderId, selectedModelId, selectedPicoId)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: '20px', height: '20px'}}>
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Chat
        </button>
        
        {/* Pico Selector Section */}
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem', background: 'var(--bg-deep)', borderRadius: '0.75rem', border: '1px solid var(--border-light)' }}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
            <span style={{fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Persona (Pico)</span>
            <button 
              onClick={() => setShowPicoModal(true)} 
              title="Create new Pico Persona"
              style={{background: 'none', border: 'none', color: 'var(--accent-base)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'}}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '12px', height: '12px'}}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              New
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select 
              className="form-input" 
              value={selectedPicoId || ''} 
              onChange={(e) => {
                 const newPicoId = e.target.value || null;
                 setSelectedPicoId(newPicoId);
                 createNewChat(selectedProviderId, selectedModelId, newPicoId);
              }}
              style={{flex: 1, padding: '0.5rem', borderRadius: '0.5rem', background: 'var(--bg-surface)', fontSize: '0.875rem', color: 'var(--text-primary)', border: '1px solid transparent', outline: 'none', cursor: 'pointer'}}
            >
              <option value="">Vanilla (No Persona)</option>
              {picos.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {selectedPicoId && (
              <button 
                onClick={() => setDeletePicoId(selectedPicoId)}
                title="Delete Persona"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', color: '#ef4444', width: '2rem', height: '2rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: '14px', height: '14px'}}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            )}
          </div>
        </div>

        <div className="sidebar-search-wrapper" style={{ position: 'relative', marginBottom: '1.25rem' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--text-tertiary)' }}>
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            placeholder="Search chats..."
            value={chatSearch}
            onChange={(e) => setChatSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.25rem', paddingRight: chatSearch ? '2.25rem' : '0.75rem', paddingBottom: '0.5rem', paddingTop: '0.5rem', fontSize: '0.875rem', borderRadius: '0.75rem', background: 'var(--bg-deep)' }}
          />
          {chatSearch && (
            <button 
              onClick={() => setChatSearch("")}
              style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-tertiary)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
              title="Clear Search"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: '14px', height: '14px'}}>
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        <div className="history-section">
          <h2 className="history-title">Your Chats</h2>
          <div className="history-list">
            {sortedChats.length === 0 ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', textAlign: 'center', marginTop: '1rem' }}>No chats found.</div>
            ) : (
              sortedChats.map(chat => (
                <div 
                  key={chat.id}
                  className={`history-item ${activeChatId === chat.id ? 'active' : ''}`}
                  onClick={() => setActiveChatId(chat.id)}
                  onContextMenu={(e) => handleContextMenu(e, chat.id)}
                >
                  <div className="history-item-content">
                    <span className="history-item-title">{chat.title}</span>
                    {chat.pinned && (
                      <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="pin-indicator" style={{width: '12px', height: '12px'}}>
                        <path d="M16 11V5.5a4 4 0 00-8 0V11l-2 3v1h5.5v5h1v-5H18v-1l-2-3zm-6-5.5a2 2 0 014 0V11H10V5.5z"></path>
                      </svg>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <button className="settings-btn" style={{marginTop: 'auto', marginBottom: 0}} onClick={() => setShowSettings(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="settings-icon">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          Settings
        </button>
      </aside>

      <main className="main-content" onDragOver={handleDragOver} onDrop={handleDrop}>
        <div className="top-bar">
          <button 
            className="sidebar-toggle-btn"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title="Toggle Sidebar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </button>
          <div className="model-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Model:
            <CustomModelSelect 
              availableModels={availableModels}
              selectedProviderId={selectedProviderId}
              selectedModelId={selectedModelId}
              onSelect={(pId: string, mId: string) => {
                setSelectedProviderId(pId);
                setSelectedModelId(mId);
                if (activeChatId) {
                  updateChatModel(activeChatId, pId, mId);
                }
              }}
            />
          </div>
          <span style={{marginLeft: 'auto', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-tertiary)'}}>{activeChat?.title}</span>
        </div>

        <div className={`main-layout-container ${isResizing ? 'resizing' : ''}`}>
          <div className={`chat-view ${isPanelOpen ? 'panel-open' : ''}`}>
            <div className="chat-area">
              {messages.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🤖</div>
                  <h2 className="empty-title">
                    {activeChat?.picoId ? `Pico: ${picos.find(p => p.id === activeChat.picoId)?.name}` : "Hi, I'm MIMI"}
                  </h2>
                  <p className="empty-subtitle">Your secure, local AI running beautifully on your terms.</p>
                  
                  <div className="suggestions-grid">
                     <button onClick={() => sendMessage("Write a 5-step plan to launch a successful app")} className="suggestion-btn">
                        "Write a 5-step plan to launch a successful app..."
                     </button>
                     <button onClick={() => sendMessage("Explain how local LLMs work under the hood")} className="suggestion-btn">
                        "Explain how local LLMs work under the hood..."
                     </button>
                  </div>
                </div>
              ) : (
                <div className="message-list">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`message-wrapper ${msg.role}`}>
                      <span className="message-label">{msg.role === 'user' ? 'You' : 'MIMI'}</span>
                      <div className="message-bubble">
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="message-attachments-display">
                            {msg.attachments.map((att, i) => (
                              att.dataUrl
                                ? <img key={i} src={att.dataUrl} alt={att.name} className="message-attachment-img" />
                                : <DocChip key={i} name={att.name} type={att.type} fileSize={att.fileSize} />
                            ))}
                          </div>
                        )}

                        {msg.role === 'assistant' && msg.searchResults && (
                          <SourcePanel sources={msg.searchResults} />
                        )}
                        
                        {msg.role === 'assistant' && !msg.content ? (
                          <span style={{display:'flex', gap:'0.4rem', alignItems:'center', padding:'0.1rem 0'}}>
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                          </span>
                        ) : (
                          <div className="markdown-content">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex, rehypeRaw]}
                              components={{ 
                                code: CodeBlock,
                                artifact: ArtifactBox
                              } as any}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {isSearching && (
                    <div className="searching-indicator">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spinning" style={{width: '14px', height: '14px'}}>
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                      <span>Searching the web...</span>
                    </div>
                  )}
                  
                  {isTyping && messages[messages.length - 1]?.role === 'user' && (
                    <div className="message-wrapper assistant typing-indicator">
                      <span className="message-label">MIMI</span>
                      <div className="message-bubble">
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="input-area-wrapper">
              {(pendingAttachments.length > 0 || isParsing) && (
                <div className="attachment-preview-tray">
                  {isParsing && (
                    <div className="doc-chip parsing">
                      <span style={{display:'flex',gap:'0.3rem',alignItems:'center'}}>
                        <span className="typing-dot" style={{width:'6px',height:'6px'}}></span>
                        <span className="typing-dot" style={{width:'6px',height:'6px'}}></span>
                        <span className="typing-dot" style={{width:'6px',height:'6px'}}></span>
                      </span>
                      <span>Parsing…</span>
                    </div>
                  )}
                  {pendingAttachments.map((att, i) => (
                    <div key={i} className={`attachment-preview-item ${att.category !== 'image' ? 'doc-preview-item' : ''}`}>
                      {att.dataUrl
                        ? <img src={att.dataUrl} alt={att.name} className="attachment-thumbnail" />
                        : <DocChip name={att.name} type={att.type} fileSize={att.fileSize} compact />
                      }
                      <button onClick={() => setPendingAttachments(prev => prev.filter((_, idx) => idx !== i))} className="attachment-remove-btn" title="Remove attachment">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="input-container">
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="attach-button" onClick={() => fileInputRef.current?.click()} title="Attach File">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: "1.25rem", height: "1.25rem"}}>
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                    </svg>
                  </button>
                  <button 
                    className={`search-toggle-btn ${webSearchEnabled ? 'active' : ''}`} 
                    onClick={() => setWebSearchEnabled(!webSearchEnabled)} 
                    title="Enable Web Search"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: "1.1rem", height: "1.1rem"}}>
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </button>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md" multiple hidden />
                
                <textarea 
                  value={input}
                  onChange={autoResizeTextarea}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="Message MIMI..." 
                  rows={1}
                  className="chat-input"
                />
                {isTyping ? (
                  <button 
                    onClick={stopMessage}
                    className="send-button"
                    style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)' }}
                    title="Stop Generating"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{width: "1rem", height: "1rem"}}>
                      <rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect>
                    </svg>
                  </button>
                ) : (
                  <button 
                    onClick={() => sendMessage()}
                    disabled={!input.trim() && pendingAttachments.length === 0}
                    className="send-button"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: "1.25rem", height: "1.25rem"}}>
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </button>
                )}
              </div>
              <div className="disclaimer-text">
                AI can make mistakes. Verify important information.
              </div>
            </div>
          </div>

          {isPanelOpen && (
            <div 
              className={`resize-handle ${isResizing ? 'active' : ''}`} 
              onMouseDown={() => setIsResizing(true)}
            />
          )}

          <ArtifactPanel width={panelWidth} />

          {/* Overlay to prevent iframe from swallowing mouse events during resize */}
          {isResizing && <div className="resize-overlay" />}
        </div>
      </main>

      {/* Pico Modals */}
      {showPicoModal && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setShowPicoModal(false)}></div>
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Create Pico Persona</h2>
              <button onClick={() => setShowPicoModal(false)} className="modal-close">&times;</button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Picos are custom AI personas. Supply a system prompt to define their behavior.
            </p>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Pico Name <span style={{color: '#ef4444'}}>*</span></label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="ex. Python Mentor"
                value={picoForm.name}
                onChange={e => setPicoForm({...picoForm, name: e.target.value})}
                autoFocus
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">System Instructions <span style={{color: '#ef4444'}}>*</span></label>
              <textarea 
                className="form-input" 
                placeholder="ex. You are an expert Python developer. Always output concise, optimized code snippets without markdown headers."
                rows={4}
                value={picoForm.systemPrompt}
                onChange={e => setPicoForm({...picoForm, systemPrompt: e.target.value})}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Greeting Message (Optional)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="ex. Hello! Share some python code with me."
                value={picoForm.firstMessage}
                onChange={e => setPicoForm({...picoForm, firstMessage: e.target.value})}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem', display: 'block' }}>
                If provided, this message automatically injects into the chat upon creation.
              </span>
            </div>

            <div className="modal-footer" style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
              <button 
                className="submit-btn" 
                style={{ flex: 1, background: 'var(--bg-surface-elevated)', boxShadow: 'none' }}
                onClick={() => setShowPicoModal(false)}
              >
                Cancel
              </button>
              <button 
                className="submit-btn" 
                style={{ flex: 1 }}
                onClick={() => {
                  if (!picoForm.name.trim() || !picoForm.systemPrompt.trim()) {
                    alert("Name and System Prompt are required.");
                    return;
                  }
                  const newPico = {
                    id: Date.now().toString(),
                    name: picoForm.name.trim(),
                    systemPrompt: picoForm.systemPrompt.trim(),
                    firstMessage: picoForm.firstMessage.trim(),
                    createdAt: Date.now()
                  };
                  setPicos([...picos, newPico]);
                  setSelectedPicoId(newPico.id);
                  setShowPicoModal(false);
                  setPicoForm({ name: "", systemPrompt: "", firstMessage: "" });
                  
                  // Instantly spawn a new chat governed by this Pico
                  createNewChat(selectedProviderId, selectedModelId, newPico.id);
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings & API Modal */}
      {showSettings && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setShowSettings(false)}></div>
          
          <div className="modal-content" style={{ maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title">Settings & API</h2>
              <button onClick={() => setShowSettings(false)} className="modal-close">&times;</button>
            </div>

            <div className="providers-list" style={{ marginBottom: '1.5rem' }}>
              {providers.map((provider, index) => (
                <div key={provider.id} className="provider-card">
                  <div className="provider-header">
                    <span>{provider.name || `Provider ${index + 1}`}</span>
                    <div className="provider-actions">
                      <button 
                        onClick={() => {
                          const newProviders = providers.filter(p => p.id !== provider.id);
                          setProviders(newProviders);
                        }}
                        title="Delete Provider"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: '16px', height: '16px'}}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                    <input 
                      type="text" 
                      value={provider.name}
                      onChange={(e) => {
                        const newProviders = [...providers];
                        newProviders[index].name = e.target.value;
                        setProviders(newProviders);
                      }}
                      placeholder="Provider Name (e.g. Ollama, OpenRouter)"
                      className="form-input"
                      style={{ padding: '0.5rem' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                    <input 
                      type="text" 
                      value={provider.baseUrl}
                      onChange={(e) => {
                        const newProviders = [...providers];
                        newProviders[index].baseUrl = e.target.value;
                        setProviders(newProviders);
                      }}
                      placeholder="http://localhost:11434/v1"
                      className="form-input"
                      style={{ padding: '0.5rem' }}
                    />
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input 
                      type="password" 
                      value={provider.apiKey}
                      onChange={(e) => {
                        const newProviders = [...providers];
                        newProviders[index].apiKey = e.target.value;
                        setProviders(newProviders);
                      }}
                      placeholder="API Key (sk-...)"
                      className="form-input"
                      style={{ padding: '0.5rem' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="settings-section" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
              <label className="form-label">Web Search (Tavily API)</label>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <input 
                  type="password" 
                  value={tavilyApiKey}
                  onChange={(e) => setTavilyApiKey(e.target.value)}
                  placeholder="Tavily API Key (tvly-...)"
                  className="form-input"
                  style={{ padding: '0.75rem' }}
                />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                  Get a free key at <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-base)', textDecoration: 'underline' }}>tavily.com</a> to enable real-time search.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Enabled by default for new chats</span>
                  <button 
                    className={`search-toggle-btn ${defaultWebSearch ? 'active' : ''}`}
                    onClick={() => setDefaultWebSearch(!defaultWebSearch)}
                    style={{ padding: '0.2rem 0.5rem', width: 'auto', height: 'auto', borderRadius: '1rem', fontSize: '0.75rem' }}
                  >
                    {defaultWebSearch ? "ON" : "OFF"}
                  </button>
                </div>
              </div>
            </div>

            <button 
              className="add-provider-btn"
              onClick={() => {
                const newProvider: Provider = {
                  id: Date.now().toString(),
                  name: "",
                  baseUrl: "",
                  apiKey: ""
                };
                setProviders([...providers, newProvider]);
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '16px', height: '16px'}}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add Another Provider
            </button>

            <div className="model-select-wrapper" style={{ marginTop: '2rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
              <div className="model-header-row">
                <label className="form-label" style={{marginBottom: 0}}>Default Active Model</label>
                <button onClick={fetchModels} disabled={isFetchingModels} className="fetch-btn">
                  {isFetchingModels ? "Fetching..." : "Fetch All Models"}
                </button>
              </div>
              
              {modelError && <div className="error-text">{modelError}</div>}
              
              <div style={{ marginTop: '0.5rem' }}>
                <CustomModelSelect 
                  availableModels={availableModels}
                  selectedProviderId={selectedProviderId}
                  selectedModelId={selectedModelId}
                  onSelect={(pId: string, mId: string) => {
                    setSelectedProviderId(pId);
                    setSelectedModelId(mId);
                  }}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                onClick={() => setShowDeleteAllConfirm(true)} 
                className="submit-btn" 
                style={{ width: '100%', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', boxShadow: 'none' }}
              >
                Delete All Chats
              </button>
              <button onClick={() => setShowSettings(false)} className="submit-btn" style={{ width: '100%' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Context Menus */}
      {contextMenu && (
        <div 
          className="context-menu" 
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="context-menu-item"
            onClick={() => {
              const chat = chats.find(c => c.id === contextMenu.chatId);
              setRenameModal({ chatId: contextMenu.chatId, title: chat?.title || "" });
              setContextMenu(null);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: '16px', height: '16px'}}><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            Rename
          </button>
          <button 
            className="context-menu-item"
            onClick={() => {
              togglePinChat(contextMenu.chatId);
              setContextMenu(null);
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{width: '16px', height: '16px'}}>
              <path d="M16 11V5.5a4 4 0 00-8 0V11l-2 3v1h5.5v5h1v-5H18v-1l-2-3zm-6-5.5a (2 2 0 014 0V11H10V5.5z"></path>
            </svg>
            Pin / Unpin
          </button>
          <button 
            className="context-menu-item danger"
            onClick={() => {
              setDeleteModalId(contextMenu.chatId);
              setContextMenu(null);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: '16px', height: '16px'}}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Delete
          </button>
        </div>
      )}

      {/* Custom Modals for Rename and Delete */}
      {renameModal && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setRenameModal(null)}></div>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Rename Chat</h2>
              <button onClick={() => setRenameModal(null)} className="modal-close">&times;</button>
            </div>
            <div className="form-group">
              <input 
                type="text" 
                value={renameModal.title}
                onChange={(e) => setRenameModal({ ...renameModal, title: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && renameModal.title.trim()) {
                    renameChat(renameModal.chatId, renameModal.title.trim());
                    setRenameModal(null);
                  }
                }}
                placeholder="Enter new chat name..."
                className="form-input"
                autoFocus
              />
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button onClick={() => setRenameModal(null)} className="submit-btn" style={{ background: 'var(--bg-surface-elevated)', boxShadow: 'none' }}>
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (renameModal.title.trim()) {
                    renameChat(renameModal.chatId, renameModal.title.trim());
                    setRenameModal(null);
                  }
                }} 
                className="submit-btn"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModalId && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setDeleteModalId(null)}></div>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Delete Chat</h2>
              <button onClick={() => setDeleteModalId(null)} className="modal-close">&times;</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Are you sure you want to permanently delete this chat? This action cannot be undone.
            </p>
            <div className="modal-footer" style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setDeleteModalId(null)} className="submit-btn" style={{ background: 'var(--bg-surface-elevated)', boxShadow: 'none' }}>
                Cancel
              </button>
              <button 
                onClick={() => {
                  deleteChat(deleteModalId);
                  setDeleteModalId(null);
                }} 
                className="submit-btn"
                style={{ background: '#ef4444', boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeleteAllConfirm && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setShowDeleteAllConfirm(false)}></div>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Delete All Chats</h2>
              <button onClick={() => setShowDeleteAllConfirm(false)} className="modal-close">&times;</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Are you sure you want to delete ALL chats? This action cannot be undone.
            </p>
            <div className="modal-footer" style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShowDeleteAllConfirm(false)} className="submit-btn" style={{ background: 'var(--bg-surface-elevated)', boxShadow: 'none' }}>
                Cancel
              </button>
              <button 
                onClick={() => {
                  deleteAllChats();
                  setShowDeleteAllConfirm(false);
                  setShowSettings(false);
                }} 
                className="submit-btn"
                style={{ background: '#ef4444', boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)' }}
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {deletePicoId && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setDeletePicoId(null)}></div>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Delete Persona</h2>
              <button onClick={() => setDeletePicoId(null)} className="modal-close">&times;</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Are you sure you want to permanently delete the persona <strong>"{picos.find(p => p.id === deletePicoId)?.name}"</strong>? This action cannot be undone.
            </p>
            <div className="modal-footer" style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setDeletePicoId(null)} className="submit-btn" style={{ background: 'var(--bg-surface-elevated)', boxShadow: 'none' }}>
                Cancel
              </button>
              <button 
                onClick={() => {
                  setPicos(picos.filter(p => p.id !== deletePicoId));
                  if (selectedPicoId === deletePicoId) setSelectedPicoId(null);
                  setDeletePicoId(null);
                }} 
                className="submit-btn"
                style={{ background: '#ef4444', boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)' }}
              >
                Delete Persona
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
