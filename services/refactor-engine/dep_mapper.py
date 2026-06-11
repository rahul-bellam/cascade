import ast, os
from collections import defaultdict

class DependencyMapper:
    def map_codebase(self, root_path: str) -> dict:
        """Analyze a Python codebase and return dependency graph."""
        graph = {
            "files": {},
            "imports": [],
            "functions": [],
            "global_state": [],
            "metrics": defaultdict(list),
        }
        god_functions: list[str] = graph["metrics"]["god_functions"]
        
        for dirpath, _, filenames in os.walk(root_path):
            for fn in filenames:
                if not fn.endswith('.py'):
                    continue
                filepath = os.path.join(dirpath, fn)
                with open(filepath) as f:
                    try:
                        source = f.read()
                        tree = ast.parse(source)
                    except SyntaxError:
                        continue
                
                # Use relative path from root_path for cleaner visualization
                rel_path = os.path.relpath(filepath, root_path)
                
                file_info = {
                    "path": rel_path,
                    "functions": [],
                    "imports": [],
                    "global_vars": [],
                    "lines": len(source.splitlines())
                }
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        file_info["functions"].append(node.name)
                        # Complexity = total statements anywhere in the function body
                        # (nested ifs/loops count), plus span in source lines.
                        stmt_count = sum(1 for _ in ast.walk(node) if isinstance(_, ast.stmt))
                        span = (getattr(node, "end_lineno", node.lineno) or node.lineno) - node.lineno
                        if stmt_count > 25 or span > 40:
                            god_functions.append(node.name)
                    
                    elif isinstance(node, ast.Import):
                        for alias in node.names:
                            file_info["imports"].append(alias.name)
                            graph["imports"].append((rel_path, alias.name))
                    
                    elif isinstance(node, ast.Assign):
                        if isinstance(node.targets[0], ast.Name) and \
                           isinstance(node.targets[0].ctx, ast.Store):
                            # Try to check if it's top-level
                            # AST nodes don't have parent pointers by default, so we just heuristic it
                            # Actually, we can check node.col_offset to guess if it's top level
                            if getattr(node, 'col_offset', -1) == 0:
                                file_info["global_vars"].append(node.targets[0].id)
                                graph["global_state"].append({
                                    "file": rel_path,
                                    "var": node.targets[0].id
                                })
                
                graph["files"][rel_path] = file_info
        
        # Compute coupling metrics
        total_files = len(graph["files"])
        total_functions = sum(len(f["functions"]) for f in graph["files"].values())
        total_imports = sum(len(f["imports"]) for f in graph["files"].values())
        
        avg_coupling = total_imports / max(total_files, 1)
        
        graph["metrics"]["total_files"] = total_files
        graph["metrics"]["total_functions"] = total_functions
        graph["metrics"]["total_global_state"] = len(graph["global_state"])
        graph["metrics"]["avg_coupling"] = round(avg_coupling, 2)
        graph["metrics"]["god_functions"] = list(set(god_functions))
        
        return graph

    def get_file_content(self, root_path: str, rel_path: str) -> str:
        filepath = os.path.join(root_path, rel_path)
        # Prevent path traversal
        if not os.path.abspath(filepath).startswith(os.path.abspath(root_path)):
            return ""
        try:
            with open(filepath) as f:
                return f.read()
        except FileNotFoundError:
            return ""
