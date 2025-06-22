import { useState, useEffect } from 'react';
import { DigitalTwin } from '../types';
import { useAuth } from '../context/AuthContext';
import constituentService from '../services/constituentService';

interface UseConstituentsReturn {
  constituents: DigitalTwin[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  stats: ReturnType<typeof constituentService.getConstituentStats>;
}

export function useConstituents(count: number = 10): UseConstituentsReturn {
  const { state } = useAuth();
  const [constituents, setConstituents] = useState<DigitalTwin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConstituents = async () => {
    if (!state.user?.district) {
      setError('No district information available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await constituentService.getConstituents(state.user.district, count);
      setConstituents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch constituents');
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async () => {
    if (!state.user?.district) return;
    
    try {
      const data = await constituentService.refreshConstituents(state.user.district, count);
      setConstituents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh constituents');
    }
  };

  useEffect(() => {
    if (state.user?.district) {
      fetchConstituents();
    }
  }, [state.user?.district, count]);

  const stats = constituentService.getConstituentStats();

  return {
    constituents,
    isLoading,
    error,
    refresh,
    stats
  };
}

export default useConstituents; 