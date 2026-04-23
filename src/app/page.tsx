"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSettings, Provider } from "@/context/SettingsContext";
import { useChat, Message } from "@/context/ChatContext";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// ...

const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="code-block-wrapper">
        <div className="code-block-header">
          <span className="code-language">{match[1]}</span>
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
        <pre className={className} {...props}>
          <code>{children}</code>
        </pre>
      </div>
    );
  }
  return <code className={className} {...props}>{children}</code>;
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

export default function Home() {
  // Contexts
  const { providers, setProviders, selectedModelId, setSelectedModelId, selectedProviderId, setSelectedProviderId } = useSettings();
  const { chats, activeChatId, setActiveChatId, createNewChat, addMessage, updateMessage, deleteChat, renameChat, togglePinChat, updateChatModel } = useChat();

  // Local State
  const [showSettings, setShowSettings] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chatSearch, setChatSearch] = useState("");
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
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

  // Sorting chats: Pinned first, then by updatedAt
  const sortedChats = [...chats].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updatedAt - a.updatedAt;
  }).filter(chat => chat.title.toLowerCase().includes(chatSearch.toLowerCase()));

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
      createNewChat(selectedProviderId, selectedModelId);
      return;
    }

    const userId = Date.now().toString() + Math.random().toString();
    const userMessage: Message = { id: userId, role: "user", content: textToSend };
    
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

    const activeMessages = [...messages, userMessage].map(({ role, content }) => ({ role, content }));
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const assistantId = Date.now().toString() + Math.random().toString();
    addMessage(targetChatId, { id: assistantId, role: "assistant", content: "" });

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
            messages: activeMessages,
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

  const handleContextMenu = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, chatId });
  };

  useEffect(() => {
    if (chats.length === 0 && !activeChatId && selectedProviderId && selectedModelId) {
      createNewChat(selectedProviderId, selectedModelId);
    }
  }, [chats, activeChatId, selectedProviderId, selectedModelId, createNewChat]);

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

        <button className="new-chat-btn" onClick={() => createNewChat(selectedProviderId, selectedModelId)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: '20px', height: '20px'}}>
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Chat
        </button>
        
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

      <main className="main-content">
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

        <div className="chat-area">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🤖</div>
              <h2 className="empty-title">Hi, I'm MIMI</h2>
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
                    {msg.role === 'assistant' && !msg.content ? (
                      <span style={{opacity: 0.5}}>...</span>
                    ) : (
                      <div className="markdown-content">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{ code: CodeBlock }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
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
          <div className="input-container">
            <textarea 
              value={input}
              onChange={autoResizeTextarea}
              onKeyDown={handleKeyDown}
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
                disabled={!input.trim()}
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
      </main>

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

            <div className="modal-footer">
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
    </>
  );
}
