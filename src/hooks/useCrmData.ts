import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';

type Lead = Database['public']['Tables']['leads']['Row'];
type Agent = Database['public']['Tables']['agents']['Row'];
type Visit = Database['public']['Tables']['visits']['Row'];
type Property = Database['public']['Tables']['properties']['Row'];

// Type for lead with joined agent and property
export type LeadWithRelations = Lead & {
  agents: Pick<Agent, 'id' | 'name'> | null;
  properties: Pick<Property, 'id' | 'name'> | null;
};

export type VisitWithRelations = Visit & {
  leads: Pick<Lead, 'id' | 'name'> | null;
  properties: Pick<Property, 'id' | 'name'> | null;
  agents: Pick<Agent, 'id' | 'name'> | null;
};

const isMockMode = () => !!localStorage.getItem('gharpayy_mock_user');

const MOCK_LEADS: LeadWithRelations[] = [
  { id: '1', name: 'Rahul Sharma', phone: '9602840812', email: 'rahul@gmail.com', source: 'whatsapp', status: 'new', created_at: new Date(Date.now() - 3600000 * 2).toISOString(), updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString(), assigned_agent_id: 'a1', property_id: 'p1', budget: '15k', preferred_location: 'Sector 62', notes: 'Interested in single occupancy', first_response_time_min: 3, lead_score: 85, tags: ['hot'], agents: { id: 'a1', name: 'John Agent' }, properties: { id: 'p1', name: 'Green Valley PG' } },
  { id: '2', name: 'Priya Singh', phone: '9876543210', email: 'priya@example.com', source: 'website', status: 'contacted', created_at: new Date(Date.now() - 3600000 * 24).toISOString(), updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString(), assigned_agent_id: 'a2', property_id: 'p2', budget: '12k', preferred_location: 'Indirapuram', notes: 'Working in Noida', first_response_time_min: 12, lead_score: 45, tags: ['follow-up'], agents: { id: 'a2', name: 'Sarah Agent' }, properties: { id: 'p2', name: 'Zest Living' } },
  { id: '3', name: 'Amit Verma', phone: '9988776655', email: 'amit@verma.com', source: 'instagram', status: 'booked', created_at: new Date(Date.now() - 3600000 * 72).toISOString(), updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString(), assigned_agent_id: 'a1', property_id: 'p1', budget: '18k', preferred_location: 'Sector 62', notes: 'Confirmed booking', first_response_time_min: 2, lead_score: 100, tags: ['vip'], agents: { id: 'a1', name: 'John Agent' }, properties: { id: 'p1', name: 'Green Valley PG' } },
];

const MOCK_AGENTS: Agent[] = [
  { id: 'a1', name: 'John Agent', email: 'john@gharpayy.com', phone: '123', is_active: true, created_at: '', updated_at: '', user_id: '' },
  { id: 'a2', name: 'Sarah Agent', email: 'sarah@gharpayy.com', phone: '456', is_active: true, created_at: '', updated_at: '', user_id: '' },
];

const MOCK_PROPERTIES: Property[] = [
  { id: 'p1', name: 'Green Valley PG', address: 'Sec 62', city: 'Noida', area: 'Noida', price_range: '10k-20k', is_active: true, created_at: '', owner_id: '', amenities: [], gender_allowed: 'any', google_maps_link: '', photos: [], property_manager: '', total_beds: 50, total_rooms: 20, virtual_tour_link: '' },
  { id: 'p2', name: 'Zest Living', address: 'Indirapuram', city: 'Ghaziabad', area: 'Ghaziabad', price_range: '8k-15k', is_active: true, created_at: '', owner_id: '', amenities: [], gender_allowed: 'any', google_maps_link: '', photos: [], property_manager: '', total_beds: 30, total_rooms: 12, virtual_tour_link: '' },
];

// Leads (all — used by Dashboard, Pipeline, etc.)
export const useLeads = () =>
  useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      if (isMockMode()) return MOCK_LEADS;
      const { data, error } = await supabase
        .from('leads')
        .select('*, agents(id, name), properties(id, name)')
        .order('created_at', { ascending: false })
        .limit(200); // Limit full fetch to prevent browser hang
      if (error) throw error;
      return data as LeadWithRelations[];
    },
    staleTime: 5000, 
  });

// Leads (paginated — used by Leads list page)
export const useLeadsPaginated = (page = 0, pageSize = 50) =>
  useQuery({
    queryKey: ['leads-paginated', page, pageSize],
    queryFn: async () => {
      if (isMockMode()) return { leads: MOCK_LEADS, total: MOCK_LEADS.length };
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await supabase
        .from('leads')
        .select('*, agents(id, name), properties(id, name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { leads: data as LeadWithRelations[], total: count || 0 };
    },
  });

export const useLeadsByStatus = (status: string) =>
  useQuery({
    queryKey: ['leads', 'status', status],
    queryFn: async () => {
      if (isMockMode()) return MOCK_LEADS.filter(l => l.status === status);
      const { data, error } = await supabase
        .from('leads')
        .select('*, agents(id, name), properties(id, name)')
        .eq('status', status as any)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LeadWithRelations[];
    },
  });

export const useCreateLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: Database['public']['Tables']['leads']['Insert']) => {
      if (isMockMode()) {
        const newLead = { ...lead, id: Math.random().toString(), created_at: new Date().toISOString() };
        MOCK_LEADS.unshift({ ...newLead, agents: null, properties: null } as any);
        return newLead;
      }
      const { data, error } = await supabase.from('leads').insert(lead).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
    onError: (error, variables) => {
      logger.error('Failed to create lead', error, { variables });
    },
  });
};

export const useUpdateLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Database['public']['Tables']['leads']['Update']) => {
      if (isMockMode()) return { ...updates, id };
      const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
    onError: (error, variables) => {
      logger.error('Failed to update lead', error, { variables });
    },
  });
};

// Agents
export const useAgents = () =>
  useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      if (isMockMode()) return MOCK_AGENTS;
      const { data, error } = await supabase.from('agents').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
  });

// Properties
export const useProperties = () =>
  useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      if (isMockMode()) return MOCK_PROPERTIES;
      const { data, error } = await supabase.from('properties').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
  });

// Visits
export const useVisits = () =>
  useQuery({
    queryKey: ['visits'],
    queryFn: async () => {
      if (isMockMode()) return [];
      const { data, error } = await supabase
        .from('visits')
        .select('*, leads(id, name), properties(id, name), agents:assigned_staff_id(id, name)')
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      return data as VisitWithRelations[];
    },
    staleTime: 1000 * 10, // 10 seconds stale for visits
  });

export const useCreateVisit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (visit: Database['public']['Tables']['visits']['Insert']) => {
      if (isMockMode()) return visit;
      const { data, error } = await supabase.from('visits').insert(visit).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visits'] }),
  });
};

// Dashboard stats
export const useDashboardStats = () =>
  useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      if (isMockMode()) {
        return {
          totalLeads: 128,
          newToday: 12,
          avgResponseTime: 4.2,
          slaCompliance: 94,
          slaBreaches: 3,
          conversionRate: 18.5,
          visitsScheduled: 8,
          visitsCompleted: 42,
          bookingsClosed: 24,
        };
      }
      const [leadsRes, visitsRes] = await Promise.all([
        supabase.from('leads').select('id, status, first_response_time_min, source, created_at'),
        supabase.from('visits').select('id, outcome, scheduled_at'),
      ]);

      if (leadsRes.error) throw leadsRes.error;
      if (visitsRes.error) throw visitsRes.error;

      const leads = leadsRes.data;
      const visits = visitsRes.data;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const totalLeads = leads.length;
      const newToday = leads.filter(l => new Date(l.created_at) >= today).length;
      const responseTimes = leads.filter(l => l.first_response_time_min !== null).map(l => l.first_response_time_min!);
      const avgResponseTime = responseTimes.length ? +(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1) : 0;
      const withinSLA = responseTimes.filter(t => t <= 5).length;
      const slaCompliance = responseTimes.length ? Math.round((withinSLA / responseTimes.length) * 100) : 0;
      const slaBreaches = responseTimes.filter(t => t > 5).length;
      const bookedLeads = leads.filter(l => l.status === 'booked').length;
      const conversionRate = totalLeads ? +((bookedLeads / totalLeads) * 100).toFixed(1) : 0;
      const upcomingVisits = visits.filter(v => new Date(v.scheduled_at) >= today && !v.outcome).length;
      const completedVisits = visits.filter(v => v.outcome !== null).length;

      return {
        totalLeads,
        newToday,
        avgResponseTime,
        slaCompliance,
        slaBreaches,
        conversionRate,
        visitsScheduled: upcomingVisits,
        visitsCompleted: completedVisits,
        bookingsClosed: bookedLeads,
      };
    },
    staleTime: 1000 * 60, // 1 minute stale for dashboard stats
  });

// Agent performance stats
export const useAgentStats = () =>
  useQuery({
    queryKey: ['agent-stats'],
    queryFn: async () => {
      if (isMockMode()) {
        return MOCK_AGENTS.map(agent => ({
          ...agent,
          totalLeads: 24,
          activeLeads: 12,
          avgResponseTime: 3.5,
          conversions: 4,
        }));
      }
      const [agentsRes, leadsRes] = await Promise.all([
        supabase.from('agents').select('*').eq('is_active', true),
        supabase.from('leads').select('id, status, assigned_agent_id, first_response_time_min'),
      ]);
      if (agentsRes.error) throw agentsRes.error;
      if (leadsRes.error) throw leadsRes.error;

      return agentsRes.data.map(agent => {
        const agentLeads = leadsRes.data.filter(l => l.assigned_agent_id === agent.id);
        const responseTimes = agentLeads.filter(l => l.first_response_time_min !== null).map(l => l.first_response_time_min!);
        const avgResponse = responseTimes.length ? +(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1) : 0;
        const conversions = agentLeads.filter(l => l.status === 'booked').length;
        const active = agentLeads.filter(l => !['booked', 'lost'].includes(l.status)).length;

        return {
          ...agent,
          totalLeads: agentLeads.length,
          activeLeads: active,
          avgResponseTime: avgResponse,
          conversions,
        };
      });
    },
    staleTime: 1000 * 60 * 2, // 2 minutes stale for performance metrics
  });
