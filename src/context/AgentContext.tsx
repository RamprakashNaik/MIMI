"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Task {
  id: string;
  tool: 'gmail' | 'search' | 'memory' | 'files' | 'final_answer' | 'planning';
  description: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: any;
}

export interface TaskPlan {
  goal: string;
  tasks: Task[];
}

interface AgentContextType {
  currentPlan: TaskPlan | null;
  isPlanning: boolean;
  isExecuting: boolean;
  setPlan: (plan: TaskPlan | null) => void;
  setIsPlanning: (val: boolean) => void;
  setIsExecuting: (val: boolean) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  resetAgent: () => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPlan, setCurrentPlan] = useState<TaskPlan | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const setPlan = useCallback((plan: TaskPlan | null) => {
    setCurrentPlan(plan);
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setCurrentPlan(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
      };
    });
  }, []);

  const resetAgent = useCallback(() => {
    setCurrentPlan(null);
    setIsPlanning(false);
    setIsExecuting(false);
  }, []);

  return (
    <AgentContext.Provider value={{
      currentPlan,
      isPlanning,
      isExecuting,
      setPlan,
      setIsPlanning,
      setIsExecuting,
      updateTask,
      resetAgent
    }}>
      {children}
    </AgentContext.Provider>
  );
};

export const useAgent = () => {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
};
