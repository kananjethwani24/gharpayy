import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const isMockMode = () => !!localStorage.getItem('gharpayy_mock_user');

const MOCK_ZONES = [
  { id: 'z1', name: 'Noida North', city: 'Noida', areas: ['Sector 62', 'Sector 63'], manager_id: 'a1', color: 'blue', is_active: true, agents: { id: 'a1', name: 'John Agent' } },
  { id: 'z2', name: 'Ghaziabad South', city: 'Ghaziabad', areas: ['Indirapuram', 'Vaishali'], manager_id: 'a2', color: 'green', is_active: true, agents: { id: 'a2', name: 'Sarah Agent' } },
];

// ─── Zones ──────────────────────────────────────────
export function useZones() {
  return useQuery({
    queryKey: ['zones'],
    queryFn: async () => {
      if (isMockMode()) return MOCK_ZONES;
      const { data, error } = await supabase
        .from('zones')
        .select('*, agents:manager_id(id, name)')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (zone: { name: string; city?: string; areas: string[]; manager_id?: string; color?: string }) => {
      if (isMockMode()) return { ...zone, id: Math.random().toString() };
      const { data, error } = await supabase.from('zones').insert(zone as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['zones'] }); toast.success('Zone created'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      if (isMockMode()) return { ...updates, id };
      const { data, error } = await supabase.from('zones').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['zones'] }); toast.success('Zone updated'); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Team Queues ────────────────────────────────────
export function useTeamQueues(zoneId?: string) {
  return useQuery({
    queryKey: ['team-queues', zoneId],
    queryFn: async () => {
      if (isMockMode()) return [];
      let q = supabase.from('team_queues').select('*, zones(name), agents:owner_agent_id(id, name)').eq('is_active', true);
      if (zoneId) q = q.eq('zone_id', zoneId);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useCreateTeamQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (queue: { zone_id: string; team_name: string; owner_agent_id?: string; member_ids?: string[]; dispatch_rule?: string }) => {
      if (isMockMode()) return { ...queue, id: Math.random().toString() };
      const { data, error } = await supabase.from('team_queues').insert(queue as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team-queues'] }); toast.success('Queue created'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateTeamQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      if (isMockMode()) return { ...updates, id };
      const { data, error } = await supabase.from('team_queues').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team-queues'] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Handoffs ───────────────────────────────────────
export function useHandoffs(leadId?: string) {
  return useQuery({
    queryKey: ['handoffs', leadId],
    queryFn: async () => {
      if (isMockMode()) return [];
      let q = supabase.from('handoffs').select('*, from_agent:from_agent_id(name), to_agent:to_agent_id(name), zones(name)').order('created_at', { ascending: false });
      if (leadId) q = q.eq('lead_id', leadId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useCreateHandoff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (handoff: { lead_id: string; from_agent_id?: string; to_agent_id?: string; zone_id?: string; reason?: string }) => {
      if (isMockMode()) return handoff;
      const { data, error } = await supabase.from('handoffs').insert(handoff as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['handoffs'] }); toast.success('Handoff recorded'); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Escalations ────────────────────────────────────
export function useEscalations(status?: string) {
  return useQuery({
    queryKey: ['escalations', status],
    queryFn: async () => {
      if (isMockMode()) return [];
      let q = supabase.from('escalations').select('*, zones(name), raised:raised_by(name), assigned:assigned_to(name)').order('created_at', { ascending: false });
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useCreateEscalation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (esc: { type?: string; entity_type: string; entity_id: string; zone_id?: string; raised_by?: string; assigned_to?: string; priority?: string; description?: string }) => {
      if (isMockMode()) return esc;
      const { data, error } = await supabase.from('escalations').insert(esc as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['escalations'] }); toast.success('Escalation raised'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateEscalation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      if (isMockMode()) return { ...updates, id };
      const { data, error } = await supabase.from('escalations').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['escalations'] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Zone Routing ───────────────────────────────────
export function useRouteLeadToZone() {
  return useMutation({
    mutationFn: async (location: string) => {
      if (isMockMode()) return { zone_id: 'z1', team_id: 't1' };
      const { data, error } = await supabase.rpc('route_lead_to_zone', { p_location: location });
      if (error) throw error;
      return data?.[0] || null;
    },
  });
}

// ─── DB Matching ────────────────────────────────────
export function useDbMatchBeds() {
  return useMutation({
    mutationFn: async (params: { location: string; budget: number; roomType?: string }) => {
      if (isMockMode()) {
        const mockBeds = [
          {
            bed_id: 'b1',
            property_name: 'Green Valley PG',
            property_area: 'Sector 62',
            room_number: '101',
            bed_number: '101-A',
            room_type: 'Single Occupancy',
            rent_per_bed: 12000,
            match_score: 95
          },
          {
            bed_id: 'b2',
            property_name: 'Zest Living',
            property_area: 'Indirapuram',
            room_number: '204',
            bed_number: '204-B',
            room_type: 'Double Occupancy',
            rent_per_bed: 8500,
            match_score: 82
          },
          {
            bed_id: 'b3',
            property_name: 'Sunrise Homes',
            property_area: 'Sector 62',
            room_number: '302',
            bed_number: '302-A',
            room_type: 'Single Occupancy',
            rent_per_bed: 15000,
            match_score: 75
          }
        ];

        // Simple filtering to make it feel "real"
        const filtered = mockBeds.filter(b => 
          !params.location || b.property_area.toLowerCase().includes(params.location.toLowerCase()) || 
          params.location.toLowerCase().includes(b.property_area.toLowerCase())
        );

        // Sort by match score
        return filtered.length > 0 ? filtered : mockBeds.slice(0, 2);
      }

      const { data, error } = await supabase.rpc('match_beds_for_lead', {
        p_location: params.location,
        p_budget: params.budget,
        p_room_type: params.roomType || null,
      });
      if (error) throw error;
      return data;
    },
  });
}
