# Project Rules & Context: BrowseIQ

BrowseIQ is an LLM-driven browser automation workspace.

## Active Layout
- The UI is configured as a widescreen single-column layout. 
- There is **no sidebar control panel** or separate URL input card.
- User input is consolidated into a single CLI prompt at the bottom of the Terminal panel in [TelemetryFeed.jsx](file:///home/harsha/Documents/browserAutomation/frontend/src/components/TelemetryFeed.jsx).
- Prompt inputs are routed automatically using heuristics (URLs connect browser sessions, other inputs launch the agent loop).

## Build and Serving
- Frontend is located in `frontend/`.
- Frontend build output maps to parent `static/` folder with base path `/static/`.
- When changes are made in `frontend/`, always run:
  ```bash
  npm run build
  ```
- Run server using `python3 main.py` to host on `http://127.0.0.1:8000`.

## Testing
- Run test suite: `python3 -m unittest discover tests`.

For a full history of the Web UI refactoring, check [project_context.txt](file:///home/harsha/Documents/browserAutomation/project_context.txt).
