# sweeper

Sweeper compares Minesweeper agents based on symbolic logic, exact probabilities, and learned risk estimates. Each decision records its evidence as proven, exact, approximate, or neural.

## proposed tech stack

| area | technology | role |
| --- | --- | --- |
| language and engine | Python, NumPy | deterministic game simulation and data handling |
| testing | pytest, Hypothesis | unit and property-based testing |
| quality | Ruff | formatting and linting |
| environment interface | Gymnasium | standard agent-environment API |
| symbolic and exact solving | custom backtracking, optional PySAT | constraints and mine probabilities |
| machine learning | PyTorch, PyTorch Geometric | CNN and graph-based probability models |
| backend | FastAPI, Pydantic | evaluation and agent APIs |
| web interface | Next.js, TypeScript, Tailwind CSS | interactive games and visual explanations |
