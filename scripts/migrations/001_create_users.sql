CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    elo_rating INT DEFAULT 1000,
    reputation_points INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT NOW()
);
