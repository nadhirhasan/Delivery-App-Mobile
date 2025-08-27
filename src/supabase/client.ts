import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tzhjwtohtppqykskunpr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6aGp3dG9odHBwcXlrc2t1bnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MTM2NDcsImV4cCI6MjA3MTQ4OTY0N30.u51nTd4B2KJgZ-ZSF2vcMHejQrrb4eKoBHENbg2QJcM"; // Replace with your real anon/public key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);