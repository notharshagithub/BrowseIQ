# JSON tool schemas for LLM tool calling (OpenAI format)
GROK_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "open_browser",
            "description": "Launches the browser and initializes a new empty page. This must be the first action called before navigating.",
            "parameters": {
                "type": "object",
                "properties": {
                    "headless": {
                        "type": "boolean",
                        "description": "Whether to run the browser in headless mode. Defaults to False for visual demoing.",
                        "default": False
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "navigate_to_url",
            "description": "Navigates the open browser window to the specified URL.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "The target website URL (e.g. 'https://ui.shadcn.com/docs/forms/react-hook-form')."
                    }
                },
                "required": ["url"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "take_screenshot",
            "description": "Takes a screenshot of the current page state, saving it with a timestamped name. Essential for perceiving current visual layout.",
            "parameters": {
                "type": "object",
                "properties": {
                    "filename": {
                        "type": "string",
                        "description": "The base name of the screenshot file (e.g. 'before_form_fill')."
                    }
                },
                "required": ["filename"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "click_on_screen",
            "description": "Clicks at the specified coordinates (x, y) relative to the top-left of the page. Useful for clicking elements detected visually.",
            "parameters": {
                "type": "object",
                "properties": {
                    "x": {
                        "type": "integer",
                        "description": "Horizontal position in pixels."
                    },
                    "y": {
                        "type": "integer",
                        "description": "Vertical position in pixels."
                    }
                },
                "required": ["x", "y"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "send_keys",
            "description": "Types text into a field located by a CSS selector, semantic label, placeholder, or ID. Clears existing text before typing.",
            "parameters": {
                "type": "object",
                "properties": {
                    "selector": {
                        "type": "string",
                        "description": "The exact literal CSS selector, label text, or ID selector of the target field chosen directly from the perceived elements list."
                    },
                    "text": {
                        "type": "string",
                        "description": "The text to input."
                    }
                },
                "required": ["selector", "text"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "scroll",
            "description": "Scrolls the page in a given direction by a specified number of pixels. Use this to reveal elements off-screen.",
            "parameters": {
                "type": "object",
                "properties": {
                    "direction": {
                        "type": "string",
                        "enum": ["up", "down"],
                        "description": "Direction to scroll.",
                        "default": "down"
                    },
                    "amount": {
                        "type": "integer",
                        "description": "Scroll distance in pixels.",
                        "default": 500
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "double_click",
            "description": "Double-clicks the element matched by the selector.",
            "parameters": {
                "type": "object",
                "properties": {
                    "selector": {
                        "type": "string",
                        "description": "The exact literal CSS selector, label text, or ID selector of the target element chosen directly from the perceived elements list."
                    }
                },
                "required": ["selector"]
            }
        }
    }
]
