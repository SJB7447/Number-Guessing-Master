
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nedtvbnodkdmofhvhpbm.supabase.co';
const supabaseKey = 'sb_publishable_H3BVdjIEBss5tSAu-oD0Pg_CixIDHV-'; // API Key provided in prompt

export const supabase = createClient(supabaseUrl, supabaseKey);
