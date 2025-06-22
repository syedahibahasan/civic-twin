import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { Congressman } from '../types';
import authService from '../services/authService';

interface AuthState {
  user: Congressman | null;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'SET_USER'; payload: Congressman | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'CLEAR_USER' };

const initialState: AuthState = {
  user: null,
  isLoading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isLoading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'CLEAR_USER':
      return {
        ...state,
        user: null,
        isLoading: false,
      };
    default:
      return state;
  }
}

interface AuthContextType {
  state: AuthState;
  isAuthenticated: () => boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: {
    email: string;
    password: string;
    name: string;
    state?: string;
    district?: string;
    party?: string;
    phone?: string;
    committee?: string;
  }) => Promise<boolean>;
  logout: () => void;
  updateProfile: (profileData: {
    name?: string;
    state?: string;
    district?: string;
    party?: string;
    phone?: string;
    committee?: string;
  }) => Promise<boolean>;
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const { user } = await authService.getProfile();
          dispatch({ type: 'SET_USER', payload: user });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        authService.clearAuth();
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuth();
  }, []);

  // Always check token directly instead of relying on state
  const isAuthenticated = (): boolean => {
    return authService.isAuthenticated();
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const { user } = await authService.login(email, password);
      dispatch({ type: 'SET_USER', payload: user });
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
      return false;
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    name: string;
    state?: string;
    district?: string;
    party?: string;
    phone?: string;
    committee?: string;
  }): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const { user } = await authService.register(userData);
      dispatch({ type: 'SET_USER', payload: user });
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
    dispatch({ type: 'SET_LOADING', payload: false });
    return false;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
    dispatch({ type: 'CLEAR_USER' });
  };

  const updateProfile = async (profileData: {
    name?: string;
    state?: string;
    district?: string;
    party?: string;
    phone?: string;
    committee?: string;
  }): Promise<boolean> => {
    try {
      const { user } = await authService.updateProfile(profileData);
      dispatch({ type: 'SET_USER', payload: user });
      return true;
    } catch (error) {
      console.error('Profile update failed:', error);
      return false;
    }
  };

  const value = {
    state,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 