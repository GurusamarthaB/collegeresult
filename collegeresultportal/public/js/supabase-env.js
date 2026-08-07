// Runtime Supabase environment configuration
// This file is served dynamically by the server to inject environment variables at runtime
// The server endpoint /js/supabase-env.js provides the actual configuration

window.__supabaseClientConfig = {
  url: window.__supabaseClientConfig?.url || null,
  anonKey: window.__supabaseClientConfig?.anonKey || null
};
