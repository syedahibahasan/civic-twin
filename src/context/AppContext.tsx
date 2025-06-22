import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Policy, CensusData, DigitalTwin, ChatMessage, PolicySuggestion } from '../types';

interface AppState {
  currentPolicy: Policy | null;
  censusData: CensusData | null;
  digitalTwins: DigitalTwin[];
  chatMessages: { [twinId: string]: ChatMessage[] };
  suggestions: PolicySuggestion[];
  currentZipCode: string;
  isLoading: boolean;
}

type AppAction =
  | { type: 'SET_POLICY'; payload: Policy }
  | { type: 'SET_CENSUS_DATA'; payload: CensusData }
  | { type: 'SET_DIGITAL_TWINS'; payload: DigitalTwin[] }
  | { type: 'ADD_CHAT_MESSAGE'; payload: { twinId: string; message: ChatMessage } }
  | { type: 'SET_SUGGESTIONS'; payload: PolicySuggestion[] }
  | { type: 'SET_ZIP_CODE'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: AppState = {
  currentPolicy: null,
  censusData: null,
  digitalTwins: [],
  chatMessages: {},
  suggestions: [],
  currentZipCode: '94110',
  isLoading: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_POLICY':
      return { ...state, currentPolicy: action.payload };
    case 'SET_CENSUS_DATA':
      return { ...state, censusData: action.payload };
    case 'SET_DIGITAL_TWINS':
      return { ...state, digitalTwins: action.payload };
    case 'ADD_CHAT_MESSAGE':
      return {
        ...state,
        chatMessages: {
          ...state.chatMessages,
          [action.payload.twinId]: [
            ...(state.chatMessages[action.payload.twinId] || []),
            action.payload.message,
          ],
        },
      };
    case 'SET_SUGGESTIONS':
      return { ...state, suggestions: action.payload };
    case 'SET_ZIP_CODE':
      return { ...state, currentZipCode: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};