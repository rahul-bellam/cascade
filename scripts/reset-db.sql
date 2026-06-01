-- Cascade — Reset local database (drops all Phase 1 tables, then recreates).
DROP TABLE IF EXISTS cascade_sessions CASCADE;
DROP TABLE IF EXISTS user_toolkit CASCADE;
DROP TABLE IF EXISTS lesson_completions CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS users CASCADE;
\i scripts/schema.sql
