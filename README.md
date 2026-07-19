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
| machine learning | PyTorch, PyTorch Geometric | CNNs with symbolic strategy features and graph-based probability models |
| local model service | Python standard library | selected checkpoint moves for the demo |
| web interface | Next.js, TypeScript, Tailwind CSS | interactive games and visual explanations |

## local demo model

Install the optional training dependency, then run `make serve-model`. The
service listens on `http://127.0.0.1:8001` and accepts visible board states at
`POST /move`. It returns one reveal action and its evidence. The browser never
sends or receives hidden mine locations.
