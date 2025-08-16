import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Types
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name?: string;
    roles: string[];
    permissions: string[];
  };
}

interface User {
  id: string;
  email: string;
  name?: string;
  roles: string[];
  permissions: string[];
}

// Auth API functions
const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    return response.json();
  },

  logout: async (refreshToken?: string): Promise<void> => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  },

  getCurrentUser: async (accessToken: string): Promise<User> => {
    const response = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    const data = await response.json();
    return data.user;
  },

  refreshToken: async (refreshToken: string): Promise<LoginResponse> => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    return response.json();
  },
};

// Storage helpers
const tokenStorage = {
  getAccessToken: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  },
  
  getRefreshToken: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  },
  
  setTokens: (accessToken: string, refreshToken: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  },
  
  clearTokens: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

// Custom hooks
export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      tokenStorage.setTokens(data.accessToken, data.refreshToken);
      queryClient.setQueryData(['user'], data.user);
      toast.success('Đăng nhập thành công!');
      router.push('/admin');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Đăng nhập thất bại');
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      const refreshToken = tokenStorage.getRefreshToken();
      return authApi.logout(refreshToken || undefined);
    },
    onSuccess: () => {
      tokenStorage.clearTokens();
      queryClient.clear();
      toast.success('Đã đăng xuất');
      router.push('/login');
    },
    onError: () => {
      // Always clear tokens and redirect even if logout API fails
      tokenStorage.clearTokens();
      queryClient.clear();
      router.push('/login');
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: () => {
      const accessToken = tokenStorage.getAccessToken();
      if (!accessToken) throw new Error('No access token');
      return authApi.getCurrentUser(accessToken);
    },
    enabled: !!tokenStorage.getAccessToken(),
    retry: false,
  });
}

export function useRefreshToken() {
  return useMutation({
    mutationFn: (refreshToken: string) => authApi.refreshToken(refreshToken),
    onSuccess: (data) => {
      tokenStorage.setTokens(data.accessToken, data.refreshToken);
    },
  });
}