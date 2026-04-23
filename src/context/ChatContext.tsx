"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

export type Chat = {
  id: string;
  title: string;
  messages: Message[];
  pinned: boolean;
  updatedAt: number;
  modelId?: string;
  providerId?: string;
};

interface ChatContextType {
  chats: Chat[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  createNewChat: (providerId?: string | null, modelId?: string | null) => void;
  addMessage: (chatId: string, message: Message) => void;
  updateMessage: (chatId: string, messageId: string, content: string) => void;
  deleteChat: (chatId: string) => void;
  renameChat: (chatId: string, title: string) => void;
  togglePinChat: (chatId: string) => void;
  updateChatModel: (chatId: string, providerId: string, modelId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from LocalStorage
  useEffect(() => {
    const storedChats = localStorage.getItem("mimi_chats");
    const storedActiveChat = localStorage.getItem("mimi_activeChatId");
    
    if (storedChats) {
      try {
        setChats(JSON.parse(storedChats));
      } catch (e) {
        console.error("Failed to parse chats from localStorage");
      }
    }
    if (storedActiveChat) setActiveChatId(storedActiveChat);
    setIsLoaded(true);
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("mimi_chats", JSON.stringify(chats));
    if (activeChatId) {
      localStorage.setItem("mimi_activeChatId", activeChatId);
    } else {
      localStorage.removeItem("mimi_activeChatId");
    }
  }, [chats, activeChatId, isLoaded]);

  const createNewChat = (providerId?: string | null, modelId?: string | null) => {
    const newChat: Chat = {
      id: Date.now().toString() + Math.random().toString(),
      title: "New Chat",
      messages: [],
      pinned: false,
      updatedAt: Date.now(),
      providerId: providerId || undefined,
      modelId: modelId || undefined,
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

  return (
    <ChatContext.Provider value={{
      chats, activeChatId, setActiveChatId,
      createNewChat, addMessage, updateMessage,
      deleteChat, renameChat, togglePinChat, updateChatModel
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider");
  return context;
}
