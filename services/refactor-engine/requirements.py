import random

class RequirementInjector:
    def __init__(self, scenario_id: str):
        self.scenario_id = scenario_id
        self.requirements = {
            "payment-monolith": {
                "title": "Add Fraud Detection",
                "description": "The business needs real-time fraud detection before processing payments. "
                    "This involves checking transaction velocity, geographic anomalies, and device fingerprinting. "
                    "If flagged, the transaction enters manual review queue instead of processing.",
                "accommodation_easy": [
                    "Extracted a separate FraudDetectionService",
                    "Communicates asynchronously via queue",
                    "Added <50 lines to accommodate"
                ],
                "accommodation_hard": [
                    "Still in the monolith — all logic in charge()",
                    "Adds 200+ lines of nested if-statements",
                    "Makes the god function even worse"
                ]
            }
        }

    def get_requirement(self) -> dict:
        return self.requirements.get(self.scenario_id, {
            "title": "Add a New Feature",
            "description": "The PM just dropped a new requirement. Good luck."
        })

    def evaluate_accommodation(self, dep_graph: dict) -> dict:
        modules = dep_graph.get("files", {})
        coupling = dep_graph.get("metrics", {}).get("avg_coupling", 100)
        imports = dep_graph.get("imports", [])

        # Add small random noise to prevent identical scores from different analyses
        noise = random.uniform(-2.0, 2.0)
        n_modules = len(modules)
        n_imports = len(imports)
        god_functions = dep_graph.get("metrics", {}).get("god_functions", [])
        global_state = dep_graph.get("global_state", [])

        coupling_score = min(coupling / 5, 100)
        module_score = min(n_modules * 20, 100)
        god_func_penalty = len(god_functions) * 15
        global_state_penalty = len(global_state) * 10
        import_penalty = max(0, (n_imports - n_modules * 2)) * 5

        score = coupling_score + module_score - god_func_penalty - global_state_penalty - import_penalty + noise
        score = max(0, min(100, int(score)))

        if score >= 70:
            verdict = "Easily accommodated — clean architecture"
        elif score >= 40:
            verdict = "Partially accommodated — some rewiring needed"
        else:
            verdict = "Poorly accommodated — still spaghetti"

        return {
            "score": score,
            "verdict": verdict,
            "details": {
                "n_modules": n_modules,
                "n_imports": n_imports,
                "god_functions": len(god_functions),
                "global_state_vars": len(global_state),
                "coupling_score": round(coupling, 1),
            }
        }
