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
            "metrics": {}
        }
        
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
                        # Check function complexity
                        stmt_count = len(node.body)
                        if stmt_count > 50:
                            graph["metrics"].setdefault("god_functions", []).append(node.name)
                    
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
        graph["metrics"]["total_files"] = len(graph["files"])
        graph["metrics"]["total_functions"] = sum(
            len(f["functions"]) for f in graph["files"].values()
        )
        graph["metrics"]["total_global_state"] = len(graph["global_state"])
        graph["metrics"]["god_functions"] = list(set(
            graph["metrics"].get("god_functions", [])
        ))
        
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
