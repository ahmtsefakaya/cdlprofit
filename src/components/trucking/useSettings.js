import { useQuery } from '@tanstack/react-query';
import AppSettings from '../../api/entities/AppSettings';

const DEFAULT_SETTINGS = {
  earning_profile: 'owner_operator',
  rate_per_mile: 0,
  percentage_rate: 0,
  dark_mode: false,
  driver_name: '',
  company_name: '',
};

export function useSettings() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: () => AppSettings.list(),
  });

  const settings = (data && data[0]) ? { ...DEFAULT_SETTINGS, ...data[0] } : DEFAULT_SETTINGS;

  return { settings, isLoading, error, raw: data };
}

export default useSettings;
