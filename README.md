# sweeper

Sweeper is a research project for building Minesweeper agents that combine formal logic, exact probability, and learned reasoning with honest explanations for every move.

## proposed tech stack

| area | technology | role |
| --- | --- | --- |
| language and engine | Python, NumPy | deterministic game simulation and data handling |
| testing | pytest, Hypothesis | unit and property-based testing |
| quality | Ruff | formatting and linting |
| environment interface | Gymnasium | standard agent-environment API |
| symbolic and exact solving | custom backtracking, optional PySAT | constraints and mine probabilities |
| machine learning | PyTorch, PyTorch Geometric | CNN and graph-based reasoning models |
| backend | FastAPI, Pydantic | evaluation and agent APIs |
| web interface | Next.js, TypeScript, Tailwind CSS | interactive games and visual explanations |
