import { useState, useEffect } from 'react';
import { DigitalTwin, CensusData } from '../types';
import { useAuth } from '../context/AuthContext';
import constituentService from '../services/constituentService';

interface UseConstituentsReturn {
  constituents: DigitalTwin[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refreshCommonTypes: () => Promise<void>;
  stats: ReturnType<typeof constituentService.getConstituentStats>;
  censusData: CensusData[];
  totalPopulation: number;
  censusDemographics: ReturnType<typeof constituentService.getCensusDemographics>;
  censusOccupations: ReturnType<typeof constituentService.getCensusOccupations>;
  censusAgeGroups: ReturnType<typeof constituentService.getCensusAgeGroups>;
  censusEconomicIndicators: ReturnType<typeof constituentService.getCensusEconomicIndicators>;
}

export function useConstituents(count: number = 10, useCommonTypes: boolean = false): UseConstituentsReturn {
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
      console.log(`Fetching ${useCommonTypes ? 'common constituent types' : 'constituents'} for district: ${state.user.district}`);
      
      let data: DigitalTwin[];
      if (useCommonTypes) {
        data = await constituentService.getCommonConstituentTypes(state.user.district);
      } else {
        data = await constituentService.getConstituents(state.user.district, count);
      }
      
      console.log(`Successfully fetched ${data.length} ${useCommonTypes ? 'common constituent types' : 'constituents'}`);
      setConstituents(data);
    } catch (err) {
      console.error('Error fetching constituents:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch constituents');
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async () => {
    if (!state.user?.district) return;
    
    console.log('🔄 Refresh button clicked for district:', state.user.district);
    setIsLoading(true);
    
    try {
      console.log('📞 Calling constituentService.refreshConstituents...');
      const data = await constituentService.refreshConstituents(state.user.district, count);
      console.log('✅ Refresh completed, got', data.length, 'constituents');
      setConstituents(data);
      setError(null);
    } catch (err) {
      console.error('❌ Refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh constituents');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCommonTypes = async () => {
    if (!state.user?.district) return;
    
    try {
      const data = await constituentService.getCommonConstituentTypes(state.user.district);
      setConstituents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh common constituent types');
    }
  };

  useEffect(() => {
    if (state.user?.district) {
      fetchConstituents();
    }
  }, [state.user?.district, count, useCommonTypes]);

  const stats = constituentService.getConstituentStats();
  const censusData = constituentService.getCensusData();
  const totalPopulation = constituentService.getDistrictPopulation();
  const censusDemographics = constituentService.getCensusDemographics();
  const censusOccupations = constituentService.getCensusOccupations();
  const censusAgeGroups = constituentService.getCensusAgeGroups();
  const censusEconomicIndicators = constituentService.getCensusEconomicIndicators();

  return {
    constituents,
    isLoading,
    error,
    refresh,
    refreshCommonTypes,
    stats,
    censusData,
    totalPopulation,
    censusDemographics,
    censusOccupations,
    censusAgeGroups,
    censusEconomicIndicators
  };
}

export default useConstituents; 