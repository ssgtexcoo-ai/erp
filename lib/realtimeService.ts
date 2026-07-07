import { supabase } from '@/lib/supabaseClient';

type Unsubscribe = () => void;

export function subscribeToTable(table: string, onChange: () => void): Unsubscribe {
  // Demo mode doesn't have realtime
  if (!supabase.channel) return () => {};

  const channel = supabase
    .channel(`rt:${table}:${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
