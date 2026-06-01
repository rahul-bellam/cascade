from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


class ConstraintLevel(BaseModel):
    level: int
    title: str
    impact: str
    target_rps: int
    latency_sla_ms: int
    error_sla_pct: float
    change_type: str
    requires: list[str] = []
    requires_any: list[str] = []
    hints: list[str] = []


class Archetype(BaseModel):
    archetype: str
    name: str
    slug: str
    starting_monolith: str
    origin_code: str = ""
    constraints: list[ConstraintLevel] = []


class SimulationResult(BaseModel):
    passed: bool = False
    p50_latency: float = 0.0
    p99_latency: float = 0.0
    error_rate: float = 0.0
    throughput: int = 0
    cpu_pct: float = 0.0
    failure_reason: str = ""


class Capabilities(BaseModel):
    cache: bool = False
    persistent: bool = False
    atomic: bool = False
    pooling: bool = False
    replicas: bool = False
    horizontal: bool = False
    sharded: bool = False


class Session(BaseModel):
    session_id: str
    user_id: str
    archetype: str
    name: str
    current_level: int = 0
    max_level: int = 0
    completed: list[SimulationResult] = []
    hints_used: int = 0
    status: str = "active"
    score: int = 0
