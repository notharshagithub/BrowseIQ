# Facade module exposing core browser manager and tool schemas
from agent.browser_manager import PlaywrightBrowserManager
from agent.tool_definitions import GROK_TOOLS

__all__ = ["PlaywrightBrowserManager", "GROK_TOOLS"]
