import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ScoringMetric {
  id: string;
  metric_name: string;
  weight: number;
  min_value: number | null;
  max_value: number | null;
  description: string | null;
  updated_at: string;
}

export const useScoringConfig = () => {
  return useQuery({
    queryKey: ['scoring-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scoring_config')
        .select('*')
        .order('metric_name');

      if (error) throw error;
      return data as ScoringMetric[];
    }
  });
};

export const useUpdateScoringMetric = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (metric: Partial<ScoringMetric> & { id: string }) => {
      const { error } = await supabase
        .from('scoring_config')
        .update({
          weight: metric.weight,
          min_value: metric.min_value,
          max_value: metric.max_value,
          description: metric.description
        })
        .eq('id', metric.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoring-config'] });
      toast.success('Scoring config updated');
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    }
  });
};

export const useUpdateAllScoringWeights = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (metrics: Array<{ id: string; weight: number }>) => {
      const promises = metrics.map(m =>
        supabase
          .from('scoring_config')
          .update({ weight: m.weight })
          .eq('id', m.id)
      );

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoring-config'] });
      toast.success('All weights updated');
    },
    onError: (error) => {
      toast.error(`Failed to update weights: ${error.message}`);
    }
  });
};
