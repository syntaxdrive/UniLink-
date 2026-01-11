import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rwtdjpwsxtwfeecseugg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3dGRqcHdzeHR3ZmVlY3NldWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMzg2MjUsImV4cCI6MjA4MzcxNDYyNX0.s9fNTqVzjydNQIvSQvM6zHldnL5TU-zKg4KARE0F_b8';

export const supabase = createClient(supabaseUrl, supabaseKey);