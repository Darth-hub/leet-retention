import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zpiyeiqmwihjbaairwie.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwaXllaXFtd2loamJhYWlyd2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyODQ4NTgsImV4cCI6MjA5NDg2MDg1OH0.NSBCrbNp0aodR-idI-Lx7FpwxNNlXXVEJHWxtmIoDn4";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);