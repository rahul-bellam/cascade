CREATE TABLE lessons (
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
