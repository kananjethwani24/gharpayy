import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const isMockMode = () => !!localStorage.getItem('gharpayy_mock_user');

const MOCK_OWNERS = [
  { id: 'o1', name: 'Alok Gupta', phone: '9812345678', email: 'alok@pgowners.com', company_name: 'Gupta Properties', created_at: new Date().toISOString() },
  { id: 'o2', name: 'Suman Lata', phone: '9876543210', email: 'suman@homestay.com', created_at: new Date().toISOString() },
];

const MOCK_ROOMS = [
  { id: 'r1', property_id: 'p1', room_number: '101', floor: '1st', bed_count: 2, status: 'vacant', actual_rent: 12000, expected_rent: 12000, room_type: 'Single', properties: { name: 'Green Valley PG', owner_id: 'o1', owners: { name: 'Alok Gupta' } } },
  { id: 'r2', property_id: 'p1', room_number: '102', floor: '1st', bed_count: 3, status: 'occupied', actual_rent: 8000, expected_rent: 8000, room_type: 'Triple', properties: { name: 'Green Valley PG', owner_id: 'o1', owners: { name: 'Alok Gupta' } } },
];

const MOCK_BEDS = [
  { id: 'b1', room_id: 'r1', bed_number: '101-A', status: 'vacant', current_rent: 12000, rooms: { room_number: '101', property_id: 'p1', properties: { name: 'Green Valley PG', area: 'Sector 62' } } },
  { id: 'b2', room_id: 'r1', bed_number: '101-B', status: 'vacant', current_rent: 12000, rooms: { room_number: '101', property_id: 'p1', properties: { name: 'Green Valley PG', area: 'Sector 62' } } },
];

// ─── Owners ──────────────────────────────────────────────────────────
export function useOwners() {
  return useQuery({
    queryKey: ['owners'],
    queryFn: async () => {
      if (isMockMode()) return MOCK_OWNERS;
      const { data, error } = await supabase.from('owners').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (owner: { name: string; phone: string; email?: string | null; company_name?: string | null; notes?: string | null }) => {
      if (isMockMode()) return { ...owner, id: Math.random().toString() };
      const { data, error } = await supabase.from('owners').insert(owner).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owners'] }); toast.success('Owner created'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      if (isMockMode()) return { ...updates, id };
      const { data, error } = await supabase.from('owners').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owners'] }); },
  });
}

// ─── Rooms ───────────────────────────────────────────────────────────
export function useRooms(propertyId?: string) {
  return useQuery({
    queryKey: ['rooms', propertyId],
    queryFn: async () => {
      if (isMockMode()) return propertyId ? MOCK_ROOMS.filter(r => r.property_id === propertyId) : MOCK_ROOMS;
      let q = supabase.from('rooms').select('*, properties(name, owner_id, owners:owner_id(name))').order('room_number');
      if (propertyId) q = q.eq('property_id', propertyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useAllRoomsWithDetails() {
  return useQuery({
    queryKey: ['rooms', 'all-details'],
    queryFn: async () => {
      if (isMockMode()) return MOCK_ROOMS;
      const { data, error } = await supabase
        .from('rooms')
        .select('*, properties(id, name, area, city, owner_id, owners:owner_id(id, name, phone))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (room: {
      property_id: string; room_number: string; floor?: string | null;
      bed_count?: number; status?: string; actual_rent?: number | null;
      expected_rent?: number | null; room_type?: string | null; notes?: string | null;
      rent_per_bed?: number | null; bathroom_type?: string | null; furnishing?: string | null;
    }) => {
      if (isMockMode()) return { ...room, id: Math.random().toString() };
      const { data, error } = await supabase.from('rooms').insert(room as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rooms'] }); qc.invalidateQueries({ queryKey: ['beds'] }); toast.success('Room added'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      if (isMockMode()) return { ...updates, id };
      const { data, error } = await supabase.from('rooms').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rooms'] }); },
  });
}

// ─── Beds ────────────────────────────────────────────────────────────
export function useBeds(roomId?: string) {
  return useQuery({
    queryKey: ['beds', roomId],
    queryFn: async () => {
      if (isMockMode()) return roomId ? MOCK_BEDS.filter(b => b.room_id === roomId) : MOCK_BEDS;
      let q = supabase.from('beds').select('*, rooms(room_number, property_id, properties(name, area))').order('bed_number');
      if (roomId) q = q.eq('room_id', roomId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useAllBeds() {
  return useQuery({
    queryKey: ['beds', 'all'],
    queryFn: async () => {
      if (isMockMode()) return MOCK_BEDS;
      const { data, error } = await supabase
        .from('beds')
        .select('*, rooms(room_number, expected_rent, rent_per_bed, room_type, property_id, properties(id, name, area, city, owner_id))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useUpdateBed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      if (isMockMode()) return { ...updates, id };
      const { data, error } = await supabase.from('beds').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['beds'] }); toast.success('Bed updated'); },
  });
}

// ─── Room Status Confirmation ────────────────────────────────────────
export function useConfirmRoomStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: { room_id: string; status: string; confirmed_by?: string | null; notes?: string | null; rent_updated?: boolean }) => {
      if (isMockMode()) return entry;
      const { data, error } = await supabase.from('room_status_log').insert(entry as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Status confirmed');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Soft Locks ──────────────────────────────────────────────────────
export function useSoftLocks(roomId?: string) {
  return useQuery({
    queryKey: ['soft_locks', roomId],
    queryFn: async () => {
      if (isMockMode()) return [];
      let q = supabase.from('soft_locks').select('*, leads(name, phone), agents:locked_by(name)').eq('is_active', true).gt('expires_at', new Date().toISOString());
      if (roomId) q = q.eq('room_id', roomId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 10, // 10 seconds, needs to be relatively fresh
  });
}

export function useCreateSoftLock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lock: { room_id: string; lead_id?: string | null; lock_type: string; locked_by?: string | null; expires_at: string; notes?: string | null; bed_id?: string | null }) => {
      if (isMockMode()) return lock;
      const { data, error } = await supabase.from('soft_locks').insert(lock as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['soft_locks'] }); toast.success('Locked'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useReleaseSoftLock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lockId: string) => {
      if (isMockMode()) return;
      const { error } = await supabase.from('soft_locks').update({ is_active: false }).eq('id', lockId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['soft_locks'] }); toast.success('Lock released'); },
  });
}

// ─── Properties with owner info ──────────────────────────────────────
export function usePropertiesWithOwners() {
  return useQuery({
    queryKey: ['properties', 'with-owners'],
    queryFn: async () => {
      if (isMockMode()) return [];
      const { data, error } = await supabase
        .from('properties')
        .select('*, owners:owner_id(id, name, phone)')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      if (isMockMode()) return { ...updates, id };
      const { data, error } = await supabase.from('properties').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['properties'] }); },
  });
}
