// =========================================================
//  Подключение к Supabase
//  Settings -> Data API -> Project URL   (без /rest/v1)
//  Settings -> API Keys  -> Publishable key
//  createClient сам добавляет /rest/v1 и /auth/v1 — не дописывай их сюда.
// =========================================================
const SUPABASE_URL = 'https://rguqfdqmhstojxmktfdc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5Nbiyx2_dwWzYT4b-FNgPA_V6vFKnut';

// Библиотека с CDN регистрирует глобал `supabase`; наш клиент называем `sb`,
// чтобы не было конфликта имён.
const { createClient } = window.supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.sb = sb;
