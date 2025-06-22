import { Congressman } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface LoginResponse {
  message: string;
  user: Congressman;
  token: string;
}

interface RegisterResponse {
  message: string;
  user: Congressman;
  token: string;
}

interface ProfileResponse {
  user: Congressman;
}

class AuthService {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.loadTokenFromStorage();
  }

  private loadTokenFromStorage(): void {
    try {
      const storedToken = localStorage.getItem('authToken');
      if (storedToken) {
        this.token = storedToken;
      }
    } catch (error) {
      console.warn('Failed to load token from localStorage:', error);
      this.token = null;
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    if (this.token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${this.token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // If token is invalid, clear it
        if (response.status === 401 || response.status === 403) {
          this.clearAuth();
        }
        throw new Error(data.error || 'An error occurred');
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error');
    }
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.makeRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Store token
    this.token = response.token;
    try {
      localStorage.setItem('authToken', response.token);
    } catch (error) {
      console.warn('Failed to store token in localStorage:', error);
    }

    return response;
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
    state?: string;
    district?: string;
    party?: string;
    phone?: string;
    committee?: string;
  }): Promise<RegisterResponse> {
    const response = await this.makeRequest<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    // Store token
    this.token = response.token;
    try {
      localStorage.setItem('authToken', response.token);
    } catch (error) {
      console.warn('Failed to store token in localStorage:', error);
    }

    return response;
  }

  async getProfile(): Promise<ProfileResponse> {
    // Ensure token is loaded from storage before making request
    this.loadTokenFromStorage();
    return this.makeRequest<ProfileResponse>('/auth/profile');
  }

  async updateProfile(profileData: {
    name?: string;
    state?: string;
    district?: string;
    party?: string;
    phone?: string;
    committee?: string;
  }): Promise<ProfileResponse> {
    const response = await this.makeRequest<ProfileResponse>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });

    return response;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async logout(): Promise<{ message: string }> {
    try {
      await this.makeRequest<{ message: string }>('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    }

    // Clear local storage and token
    this.clearAuth();

    return { message: 'Logged out successfully' };
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    // Always check localStorage for the most current token
    this.loadTokenFromStorage();
    return !!this.token;
  }

  // Get current token
  getToken(): string | null {
    this.loadTokenFromStorage();
    return this.token;
  }

  // Clear authentication (for logout)
  clearAuth(): void {
    this.token = null;
    try {
      localStorage.removeItem('authToken');
    } catch (error) {
      console.warn('Failed to remove token from localStorage:', error);
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; environment: string }> {
    return this.makeRequest<{ status: string; timestamp: string; environment: string }>('/health');
  }
}

// Create singleton instance
export const authService = new AuthService();
export default authService; 