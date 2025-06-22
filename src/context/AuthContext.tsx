import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface Congressman {
  id: string;
  name: string;
  state: string;
  district: string;
  party: string;
  zipCode: string;
  email: string;
  avatar?: string;
}

interface AuthState {
  user: Congressman | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'LOGIN'; payload: Congressman }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
}

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Mock congressman database
const mockCongressmen = [
  {
    id: '1',
    name: 'Rep. Sarah Johnson',
    state: 'California',
    district: 'CA-12',
    party: 'Democratic',
    zipCode: '94110',
    email: 'sarah.johnson@congress.gov',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
  },
  {
    id: '2',
    name: 'Rep. Michael Chen',
    state: 'New York',
    district: 'NY-08',
    party: 'Democratic',
    zipCode: '10001',
    email: 'michael.chen@congress.gov',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  },
  {
    id: '3',
    name: 'Rep. Emily Rodriguez',
    state: 'Texas',
    district: 'TX-29',
    party: 'Democratic',
    zipCode: '77001',
    email: 'emily.rodriguez@congress.gov',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
  },
  {
    id: '4',
    name: 'Rep. David Thompson',
    state: 'Florida',
    district: 'FL-27',
    party: 'Republican',
    zipCode: '33101',
    email: 'david.thompson@congress.gov',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  },
];

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const login = async (email: string, password: string): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock authentication - in real app, this would be an API call
    const congressman = mockCongressmen.find(c => c.email === email);
    
    if (congressman && password === 'password123') { // Mock password
      dispatch({ type: 'LOGIN', payload: congressman });
      return true;
    }
    
    dispatch({ type: 'SET_LOADING', payload: false });
    return false;
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  const value = {
    state,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 