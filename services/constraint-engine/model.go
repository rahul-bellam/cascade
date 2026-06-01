package main

type ConstraintLevel struct {
	Level       int      `json:"level" yaml:"level"`
	Title       string   `json:"title" yaml:"title"`
	Impact      string   `json:"impact" yaml:"impact"`
	TargetRPS   int      `json:"target_rps" yaml:"target_rps"`
	LatencySLA  int      `json:"latency_sla_ms" yaml:"latency_sla_ms"`
	ErrorSLAPct float64  `json:"error_sla_pct" yaml:"error_sla_pct"`
	ChangeType  string   `json:"change_type" yaml:"change_type"`
	Requires    []string `json:"requires,omitempty" yaml:"requires"`
	RequiresAny []string `json:"requires_any,omitempty" yaml:"requires_any"`
	Hints       []string `json:"hints,omitempty" yaml:"hints"`
}

type Archetype struct {
	Archetype       string            `json:"archetype" yaml:"archetype"`
	Name            string            `json:"name" yaml:"name"`
	Slug            string            `json:"slug" yaml:"slug"`
	StartingMonolith string           `json:"starting_monolith" yaml:"starting_monolith"`
	OriginCode      string            `json:"origin_code" yaml:"origin_code"`
	Constraints     []ConstraintLevel `json:"constraints" yaml:"constraints"`
}

type SimulationResult struct {
	Passed        bool    `json:"passed"`
	P50Latency    float64 `json:"p50_latency"`
	P99Latency    float64 `json:"p99_latency"`
	ErrorRate     float64 `json:"error_rate"`
	Throughput    int     `json:"throughput"`
	CPUPct        float64 `json:"cpu_pct"`
	FailureReason string  `json:"failure_reason,omitempty"`
}

type Capabilities struct {
	Cache      bool `json:"cache"`
	Persistent bool `json:"persistent"`
	Atomic     bool `json:"atomic"`
	Pooling    bool `json:"pooling"`
	Replicas   bool `json:"replicas"`
	Horizontal bool `json:"horizontal"`
	Sharded    bool `json:"sharded"`
}

type Session struct {
	ID           string             `json:"session_id"`
	UserID       string             `json:"user_id"`
	Archetype    string             `json:"archetype"`
	Name         string             `json:"name"`
	CurrentLevel int                `json:"current_level"`
	MaxLevel     int                `json:"max_level"`
	Completed    []SimulationResult `json:"completed"`
	HintsUsed    int                `json:"hints_used"`
	Status       string             `json:"status"`
	Score        int                `json:"score"`
}
