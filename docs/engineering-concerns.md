# Engineering Concerns — Complete Map

> *"Systems don't fail because of one big thing. They fail because 17 small things align in the wrong order."*

**233+ concerns · 15 categories · Every one backed by a real incident**

---

## How Concerns Map to Cascade Modes

| Category | Count | Appears In | Example Concern |
|:---|---:|:---|---|
| API Layer | 20 | CU, BR, C | Missing retry → retry storm → circuit breaker trips |
| Caching | 20 | CU, C | Cache stampede → DB crushed → connection pool exhausted |
| Databases | 30 | CU, BR, C | N+1 queries → 100x query load → connection pool exhausted |
| Sharding | 10 | CU, C | Hot shard → one node melts while others idle |
| Networking & Distance | 20 | CU, C | No CDN → every asset hits origin → origin overload |
| Rate Limiting | 14 | CU, C, A | Missing headers → clients retry harder → retry storm |
| Circuit Breaker | 14 | C, A | Wrong threshold → normal blip trips breaker → cascade |
| CI/CD | 22 | BR, C | Migration + code in same deploy → can't roll back |
| Observability | 20 | C, L | No monitoring → outage lasts 4 hours instead of 20min |
| Message Queues | 15 | BR, C, A | No DLQ → poison message blocks queue → data loss |
| Security | 15 | BR | SQL injection → full data exfiltration |
| DNS & LB | 8 | CU, C | DNS TTL too high during failover → hours of downtime |
| File Storage | 8 | BR, CU | No upload size limit → 500GB file fills disk |
| Background Jobs | 9 | CU, C | Cron job overlap → race condition → corrupted data |
| Config & Flags | 8 | BR, C | Config not versioned → change with no audit → incident |

---

## Sample Chains (Micro to Macro)

### Chain: Connection Pool Collapse
```
#41 No connection pooling → TCP conn per request, overhead
  → #43 Pool leak on error path → leaked conns accumulate
    → #42 Pool too small → requests queue, time out
      → #4 No timeout on upstream → requests stuck forever
        → #115 Circuit breaker trips → fail-fast stops all calls
          → #122 No fallback → users see 500 for everything
            → #151 No monitoring → team discovers via Twitter
              → #162 No on-call → 47min outage
```

### Chain: Deployment Disaster
```
#146 Docker image not pinned → latest tag, different versions
  → #131 Flaky tests → team ignores CI, merges broken code
    → #137 Migration + code in same deploy → schema mismatch
      → #136 No rollback plan → stuck, can't revert
        → #133 Friday afternoon deploy → no one available
          → #135 No canary → 100% of users hit the bug
            → #164 No post-mortem culture → repeats next month
```

### Chain: Cache Cascade
```
#21 No cache → every request hits DB
  → #26 TTL too short → cache miss storm → DB overload
    → #24 No TTL on some keys → unbounded growth → evictions
      → #35 Wrong eviction policy → hot keys evicted → more misses
        → #22 Cache stampede → all keys expire at once → DB crushed
          → #32 Cache penetration → non-existent keys always miss DB
            → #37 Inconsistent across regions → user sees old data
```

---

## All Concerns by Category

### API Layer (20)
1. Wrong HTTP status codes (200 on error, 500 on success)
2. Missing retry logic (transient failures become permanent)
3. Retry storm (all clients retry simultaneously without backoff)
4. No timeout on upstream calls (one slow service stalls everything)
5. Too-short timeouts (spurious failures under normal load)
6. Missing request IDs (can't trace failures across services)
7. No pagination (DB crash on large result sets)
8. Wrong pagination cursor (duplicate/skipped results)
9. No idempotency keys (duplicate payments/actions)
10. No request validation (SQL injection, malformed payloads)
11. Verbose error messages (stack traces exposed to users)
12. ASCII-only assumption (unicode crashes serialization)
13. No API versioning (backwards-compat breaks mobile clients)
14. No graceful degradation (dependent down = whole API down)
15. Missing Content-Type headers
16. No rate limit headers (clients can't backoff)
17. No keepalive on connections (TCP handshake per request)
18. TLS handshake without session resumption (high latency)
19. WS reconnection without exponential backoff (server storm)
20. No circuit breaker for external API calls (vendor takes you down)

### Caching (20)
21. No cache at all
22. Cache stampede (all keys expire simultaneously)
23. Stale cache (invalidation missing on writes)
24. No TTL on cache keys (infinite growth)
25. TTL too long (stale data for hours)
26. TTL too short (cache miss storm)
27. Wrong caching pattern (cache-aside vs write-through confusion)
28. Local cache without invalidation (inconsistent nodes)
29. Caching wrong thing (user-specific data cached globally)
30. Serializing large objects (bloated cache, eviction)
31. No cache warming (first user after deploy has bad experience)
32. Cache penetration (non-existent keys always miss to DB)
33. Cache breakdown (hot key expires under high traffic)
34. Redis full with no eviction policy (writes fail)
35. Wrong eviction policy (hot keys removed)
36. Redis replication lag
37. Inconsistent cache across regions
38. CDN cache not purged on update
39. CDN cache key includes auth state (no shared caching)
40. HTTP caching headers missing (browsers don't cache)

### Databases (30)
41-70: See the complete list in the companion database-concerns doc.
Key highlights: N+1 queries, missing indexes, deadlocks, connection leaks, unsafe migrations, wrong isolation level, replication lag, auto-increment overflow, no soft deletes, SELECT *, wrong data types, no prepared statements, cross-region DB latency.

### Sharding (10)
71. No sharding (can't scale writes)
72. Wrong shard key (data distributed unevenly)
73. Hot shard (20% data on one shard)
74. Resharding without plan (days of data movement)
75. Cross-shard queries (full scan of every shard)
76. No read-replica per shard
77. Shard count too low (scale ceiling)
78. Shard count too high (overhead)
79. No virtual nodes (add/remove remaps 90%)
80. Manual rebalancing (human error)

### Networking & Distance (20)
81. App server us-east-1, users in Australia (250ms)
82. No CDN
83. No edge computing
84. DNS propagation delay after failover
85. ISP-level DNS caching
86. No TCP keepalive (handshake per request)
87. No HTTP/2 or HTTP/3 (head-of-line blocking)
88. TLS certificate expired
89. TLS 1.0/1.1 only
90. No sticky sessions (user bounces, session lost)
91. LB health check too aggressive (healthy nodes removed)
92. LB health check too lenient (dead nodes get traffic)
93. No connection draining on deploy (in-flight killed)
94. SATCOM/high-latency not considered
95. Mobile 3G not accounted for
96. No Anycast DNS
97. Cross-region data transfer costs (surprise $100k bill)
98. No multi-region active-active
99. Async replication too slow across regions
100. No latency budget

### Rate Limiting (14)
101. No rate limiting at all
102. Rate limit too aggressive (legitimate users blocked)
103. Rate limit too lenient (abuse still happens)
104. Token bucket too small for burst
105. No rate limit headers (429, Retry-After missing)
106. Missing Reset header
107. Distributed rate limit inconsistency
108. Wrong window algorithm (fixed vs sliding)
109. No per-endpoint limits (one endpoint starves others)
110. No per-user limits (user exhausts shared pool)
111. Counter not persisted (restart = fresh limits)
112. No rate limit on auth (brute force succeeds)
113. Rate limit bypass via IP spoofing (X-Forwarded-For)
114. Rate limit adds 50ms to hot path (too slow)

### Circuit Breaker & Resilience (14)
115. No circuit breaker at all
116. Threshold too sensitive (normal blips trip it)
117. Threshold too lenient (system already degraded)
118. Half-open test interval too short
119. No manual override
120. No bulkhead (one client hogs all threads)
121. Bulkhead pool too small
122. No fallback on open (500 instead of degraded)
123. Stale breaker state after deploy
124. No health check on service
125. Health check endpoint too heavy
126. No graceful shutdown (SIGTERM kills in-flight)
127. No startup probe (traffic before ready)
128. No liveness probe (stuck instance stays forever)

### CI/CD & Deployments (22)
129. No CI pipeline
130. CI pipeline too slow (developers bypass)
131. Flaky tests (team ignores red builds)
132. No CD / manual deploys
133. Friday afternoon deploy
134. No blue-green (downtime per release)
135. No canary (bad code hits 100% instantly)
136. No rollback plan
137. Migration + code in same deploy
138. No feature flags
139. Stale feature flags (can't turn off)
140. Wrong deploy order (frontend before API)
141. No IaC (snowflake servers)
142. Config drift (staging ≠ prod)
143. Secrets in code (committed to git)
144. No pre-prod environment
145. Staging not synced with prod data
146. Docker image not pinned (latest tag)
147. No vulnerability scanning
148. Build cache poisoning
149. Dependency confusion attack
150. No lockfile (floating deps)

### Observability (20)
151. No monitoring at all
152. No alerting on key metrics
153. Too many alerts (alert fatigue)
154. No dashboards
155. Dashboard too complex
156. No structured logging
157. Logs too verbose ($10k/month)
158. No distributed tracing
159. Trace sampling too low
160. No SLO definition
161. Error budget = 0 (100% uptime target)
162. No on-call rotation
163. On-call without runbooks
164. No post-mortem culture
165. Metrics granularity too low (1min hides 5s spikes)
166. No client-side monitoring
167. No RUM
168. Logs and metrics not correlated
169. No deploy notifications
170. Monitoring system itself not monitored

### Message Queues & Async (15)
171. No message queue (synchronous everything)
172. No ordering guarantee
173. At-most-once delivery (silent loss)
174. At-least-once without idempotency (duplicates)
175. No DLQ (poison message blocks queue)
176. DLQ never monitored
177. No backpressure (queue grows to OOM)
178. Consumer too slow
179. Queue not partitioned
180. Rebalancing causes reprocessing
181. No message schema (format mismatch)
182. Serialization format mismatch (JSON → Avro)
183. No retention (old messages deleted)
184. Kafka broker failure without replication
185. No async timeout (consumer hangs forever)

### Security (15)
186. No auth on internal APIs (SSRF → full access)
187. No authorization checks (User A reads User B's data)
188. JWT without short expiry
189. No CSRF protection
190. No CORS (or all origins allowed)
191. SQL injection
192. No input sanitization (XSS)
193. API keys in URL (logged, cached, referrer)
194. No rate limiting on auth (brute force)
195. No MFA on sensitive actions
196. Secrets in error pages (exposed on crash)
197. No encryption at rest
198. No encryption in transit (HTTP internal)
199. Overly permissive IAM roles
200. No WAF

### DNS & Load Balancing (8)
201. DNS TTL too high during failover
202. DNS TTL too low (excessive queries)
203. No DNS failover (single point)
204. LB becomes SPOF
205. Wrong routing algorithm
206. No path-based routing
207. SSL termination at wrong layer
208. No PROXY protocol (client IP lost)

### File Storage & Uploads (8)
209. No upload size limit (500GB file)
210. No virus scanning
211. Files stored on app server (lost on deploy)
212. No CDN for file serving
213. CDN cache invalidation slow
214. No checksum on upload
215. No upload resume
216. No file metadata index

### Background Jobs (9)
217. No job queue (inline in HTTP)
218. Cron job overlaps (parallel execution)
219. No job idempotency (double processing)
220. No exponential backoff on retry
221. Max retries too high (poison job runs for days)
222. No job monitoring (silent failure for weeks)
223. Job timeout too short (legitimate slow task killed)
224. No job timeout (stuck task holds worker forever)
225. No distributed scheduler (cron = SPOF)

### Configuration & Feature Flags (8)
226. Config files not versioned
227. Config changes require deploy
228. Feature flags never cleaned up (1000+ flags)
229. A/B test not properly randomized
230. Config rolled out to all servers at once
231. No config validation (typo = undefined behavior)
232. Config per environment diverges
233. Flag evaluation too slow (500 flags = 200ms)

---

## Per-Scenario Concern Maps

### 🏦 Payment Monolith (Blind Refactor)
Concerns baked in: #6, #9, #17, #41, #43, #44, #48, #53, #60, #67, #143, #186, #191, #192, #209

### 📦 E-commerce Spaghetti (Blind Refactor)
Concerns baked in: #10, #12, #29, #44, #48, #55, #67, #137, #138, #143, #191

### 💬 Chat App Legacy (Blind Refactor)
Concerns baked in: #19, #31, #57, #126, #171, #172, #174, #175, #181

---

*233+ concerns across 15 categories. Every one appears as a DAG node in at least one Cascade mode. Every one links to a real production incident.*