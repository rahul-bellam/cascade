CREATE TABLE cascade_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    archetype VARCHAR(100) NOT NULL,
    current_node VARCHAR(100) NOT NULL,
    path JSONB NOT NULL DEFAULT '[]',
    depth INT DEFAULT 0,
    hints_used INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    score INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
