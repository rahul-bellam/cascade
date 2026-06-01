CREATE TABLE arena_duels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player1_id UUID REFERENCES users(id),
    player2_id UUID REFERENCES users(id),
    archetype VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'completed',
    player1_score INT DEFAULT 0,
    player2_score INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
