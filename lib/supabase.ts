import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export type MapData = {
  destination: string;
  center: [number, number];
  zoom: number;
  places: Place[];
};

export type Place = {
  id: string;
  name: string;
  description: string;
  coordinates: [number, number];
  type: string;
  day?: number;
};

export type Trip = {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  messages: Message[];
  map_data: MapData | null;
  created_at: string;
  updated_at: string;
};
