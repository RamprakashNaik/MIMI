"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
}

interface SettingsContextType {
  providers: Provider[];
  setProviders: React.Dispatch<React.SetStateAction<Provider[]>>;
  selectedModelId: string | null;
  setSelectedModelId: (modelId: string | null) => void;
  selectedProviderId: string | null;
  setSelectedProviderId: (providerId: string | null) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from LocalStorage on mount
  useEffect(() => {
    const storedProviders = localStorage.getItem("mimi_providers");
    const storedModel = localStorage.getItem("mimi_selectedModelId");
    const storedProvider = localStorage.getItem("mimi_selectedProviderId");

    if (storedProviders) {
      try {
        setProviders(JSON.parse(storedProviders));
      } catch (e) {
        console.error("Failed to parse providers from localStorage");
      }
    } else {
      // Auto-Migration from Legacy Single API logic
      const legacyApiKey = localStorage.getItem("mimi_apiKey");
      const legacyBaseUrl = localStorage.getItem("mimi_baseUrl");
      
      if (legacyBaseUrl) {
        const legacyProvider: Provider = {
          id: 'legacy-provider-1',
          name: 'Default Provider',
          baseUrl: legacyBaseUrl,
          apiKey: legacyApiKey || ''
        };
        setProviders([legacyProvider]);
        
        const legacyModel = localStorage.getItem("mimi_selectedModel");
        if (legacyModel) {
            setSelectedModelId(legacyModel);
            setSelectedProviderId('legacy-provider-1');
        }
      } else {
        // Absolute fresh install fallback
        setProviders([{
          id: Date.now().toString(),
          name: "Local Ollama",
          baseUrl: "http://localhost:11434/v1",
          apiKey: ""
        }]);
      }
    }

    if (storedModel) setSelectedModelId(storedModel);
    if (storedProvider) setSelectedProviderId(storedProvider);
    setIsLoaded(true);
  }, []);

  // Sync to LocalStorage
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("mimi_providers", JSON.stringify(providers));
    if (selectedModelId) localStorage.setItem("mimi_selectedModelId", selectedModelId);
    else localStorage.removeItem("mimi_selectedModelId");
    
    if (selectedProviderId) localStorage.setItem("mimi_selectedProviderId", selectedProviderId);
    else localStorage.removeItem("mimi_selectedProviderId");
  }, [providers, selectedModelId, selectedProviderId, isLoaded]);

  return (
    <SettingsContext.Provider value={{
      providers, setProviders,
      selectedModelId, setSelectedModelId,
      selectedProviderId, setSelectedProviderId
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
