"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import localforage from "localforage";

export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: {
    dataUrl?: string;       // images only
    name: string;
    type: string;
    extractedText?: string; // documents: PDF / Word / Excel / text
    fileSize?: number;      // bytes
  }[];
  searchResults?: {
    title: string;
    url: string;
    content: string;
  }[];
  gmailResults?: any[];
};

export type Chat = {
  id: string;
  title: string;
  messages: Message[];
  pinned: boolean;
  updatedAt: number;
  modelId?: string;
  providerId?: string;
  picoId?: string;
};

interface ChatContextType {
  chats: Chat[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  createNewChat: (providerId?: string | null, modelId?: string | null, picoId?: string | null) => void;
  addMessage: (chatId: string, message: Message) => void;
  updateMessage: (chatId: string, messageId: string, content: string) => void;
  deleteChat: (chatId: string) => void;
  renameChat: (chatId: string, title: string) => void;
  togglePinChat: (chatId: string) => void;
  updateChatModel: (chatId: string, providerId: string, modelId: string) => void;
  deleteAllChats: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localforage (IndexedDB)
  useEffect(() => {
    const loadState = async () => {
      try {
        // Auto-migration from legacy synchronous localStorage
        const legacyChats = localStorage.getItem("mimi_chats");
        if (legacyChats) {
          console.log("Migrating legacy chats to IndexedDB...");
          await localforage.setItem("mimi_chats", JSON.parse(legacyChats));
          localStorage.removeItem("mimi_chats");
        }
        
        const legacyActiveStr = localStorage.getItem("mimi_activeChatId");
        if (legacyActiveStr) {
          await localforage.setItem("mimi_activeChatId", legacyActiveStr);
          localStorage.removeItem("mimi_activeChatId");
        }

        const storedChats = await localforage.getItem<Chat[]>("mimi_chats");
        const storedActiveChat = await localforage.getItem<string>("mimi_activeChatId");
        
        if (storedChats) setChats(storedChats);
        if (storedActiveChat) setActiveChatId(storedActiveChat);
      } catch (e) {
        console.error("Failed to parse chats from localforage", e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadState();
  }, []);

  // Save to localforage
  useEffect(() => {
    if (!isLoaded) return;
    const saveState = async () => {
      try {
        await localforage.setItem("mimi_chats", chats);
        if (activeChatId) {
          await localforage.setItem("mimi_activeChatId", activeChatId);
        } else {
          await localforage.removeItem("mimi_activeChatId");
        }
      } catch (e) {
        console.error("Failed to save to localforage:", e);
      }
    };
    saveState();
  }, [chats, activeChatId, isLoaded]);

  const createNewChat = (providerId?: string | null, modelId?: string | null, picoId?: string | null) => {
    const newChat: Chat = {
      id: Date.now().toString() + Math.random().toString(),
      title: "New Chat",
      messages: [],
      pinned: false,
      updatedAt: Date.now(),
      providerId: providerId || undefined,
      modelId: modelId || undefined,
      picoId: picoId || undefined,
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  };

  const addMessage = (chatId: string, message: Message) => {
    setChats((prev) => prev.map((chat) => {
      if (chat.id === chatId) {
        return {
          ...chat,
          messages: [...chat.messages, message],
          updatedAt: Date.now()
        };
      }
      return chat;
    }));
  };

  const updateMessage = (chatId: string, messageId: string, content: string) => {
    setChats((prev) => prev.map((chat) => {
      if (chat.id === chatId) {
        return {
          ...chat,
          messages: chat.messages.map((msg) => 
            msg.id === messageId ? { ...msg, content } : msg
          ),
          updatedAt: Date.now()
        };
      }
      return chat;
    }));
  };

  const deleteChat = (chatId: string) => {
    setChats((prev) => {
      const filtered = prev.filter((chat) => chat.id !== chatId);
      if (activeChatId === chatId) {
        // Find next chat or set null
        setActiveChatId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  const renameChat = (chatId: string, title: string) => {
    setChats((prev) => prev.map((chat) => 
      chat.id === chatId ? { ...chat, title, updatedAt: Date.now() } : chat
    ));
  };

  const togglePinChat = (chatId: string) => {
    setChats((prev) => prev.map((chat) => 
      chat.id === chatId ? { ...chat, pinned: !chat.pinned, updatedAt: Date.now() } : chat
    ));
  };

  const updateChatModel = (chatId: string, providerId: string, modelId: string) => {
    setChats((prev) => prev.map((chat) => 
      chat.id === chatId ? { ...chat, providerId, modelId, updatedAt: Date.now() } : chat
    ));
  };

  const deleteAllChats = () => {
    setChats([]);
    setActiveChatId(null);
  };

  const contextValue = React.useMemo(() => ({
    chats, activeChatId, setActiveChatId,
    createNewChat, addMessage, updateMessage,
    deleteChat, renameChat, togglePinChat, updateChatModel,
    deleteAllChats
  }), [chats, activeChatId]);

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider");
  return context;
}
