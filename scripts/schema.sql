-- Cascade — Database Schema (Phase 1: Learn Mode MVP)
-- Target: PostgreSQL 16. Run with: psql "$DATABASE_URL" -f scripts/schema.sql
-- Matches docs/build-phases.md Step 1.1.

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- for gen_random_uuid()

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    elo_rating INT DEFAULT 1000,
    reputation_points INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    prerequisite_slugs TEXT[] DEFAULT '{}',
    estimated_minutes INT DEFAULT 10,
    concept_content JSONB NOT NULL,
    snippet_prompt TEXT NOT NULL,
    snippet_starter_code TEXT NOT NULL,
    snippet_test_cases JSONB NOT NULL,
    hint_levels JSONB NOT NULL,
    toolkit_key VARCHAR(100),
    order_index INT NOT NULL
);

CREATE TABLE IF NOT EXISTS lesson_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    lesson_id UUID REFERENCES lessons(id),
    snippet_code TEXT NOT NULL,
    tests_passed INT DEFAULT 0,
    tests_total INT NOT NULL,
    hints_used INT DEFAULT 0,
    completed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_toolkit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    toolkit_key VARCHAR(100) NOT NULL,
    code TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Cascade sessions (rate-limiter chain) -------------------------------------
CREATE TABLE IF NOT EXISTS cascade_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    archetype VARCHAR(100) NOT NULL,
    current_node VARCHAR(100) NOT NULL,
    path JSONB NOT NULL DEFAULT '[]',
    depth INT DEFAULT 0,
    hints_used INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    score INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cascade_sessions_user ON cascade_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_user ON lesson_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_toolkit_user ON user_toolkit(user_id);
