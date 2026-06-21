import os
import time
import logging
from typing import Optional, Union
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, Locator, Browser, BrowserContext, Page

logger = logging.getLogger("agent.browser_manager")

class PlaywrightBrowserManager:
    """Manages the Playwright browser context, page state, and raw automation tools."""
    
    def __init__(self, screenshots_dir: str, logs_dir: str) -> None:
        self.screenshots_dir = screenshots_dir
        self.logs_dir = logs_dir
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None
        self.last_elements = []


    def open_browser(self, headless: bool = False) -> dict:
        """Launches browser + page. Exposed to the LLM."""
        try:
            browser_url = os.environ.get("CONNECT_TO_BROWSER_URL")
            if browser_url:
                logger.info(f"Connecting to remote browser at {browser_url}")
            else:
                logger.info(f"Launching local browser (headless={headless})")

            if not self.playwright:
                self.playwright = sync_playwright().start()
                
            if not self.browser or not self.browser.is_connected():
                try:
                    if self.browser:
                        self.browser.close()
                except Exception:
                    pass
                
                if browser_url:
                    self.browser = self.playwright.chromium.connect_over_cdp(browser_url)
                else:
                    self.browser = self.playwright.chromium.launch(
                        headless=headless,
                        args=["--no-sandbox", "--disable-setuid-sandbox"]
                    )
                self.context = None
                self.page = None
                
            if not self.context:
                self.context = self.browser.new_context(
                    viewport={"width": 1280, "height": 800},
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                )
                self.page = None
                
            if not self.page or self.page.is_closed():
                self.page = self.context.new_page()
                
            msg = f"Browser launched successfully (headless={headless})"
            logger.info(msg)
            return {"success": True, "message": msg}
        except Exception as e:
            msg = f"Failed to launch browser: {str(e)}"
            logger.error(msg)
            return {"success": False, "message": msg}

    def navigate_to_url(self, url: str) -> dict:
        """Navigates browser to URL and waits for load states. Exposed to the LLM."""
        if not self.page:
            return {"success": False, "message": "Browser is not open. Call open_browser first."}
        try:
            logger.info(f"Navigating to {url}")
            self.page.goto(url, timeout=30000)
            self.page.wait_for_load_state("load")
            self.page.wait_for_load_state("domcontentloaded")
            # Extra wait for hydration
            self.page.wait_for_timeout(2000)
            msg = f"Successfully navigated to {url} and waited for hydration."
            logger.info(msg)
            return {"success": True, "message": msg}
        except Exception as e:
            self.take_screenshot("error_navigate")
            msg = f"Error navigating to {url}: {str(e)}"
            logger.error(msg)
            return {"success": False, "message": msg}

    def take_screenshot(self, filename: str) -> dict:
        """Saves a timestamped screenshot, returns its path. Exposed to the LLM."""
        if not self.page:
            return {"success": False, "message": "Browser is not open. Call open_browser first."}
        try:
            if not filename.endswith(".png"):
                filename += ".png"
            
            # Ensure filenames are timestamped to avoid overwrites
            base, ext = os.path.splitext(filename)
            timestamp = int(time.time())
            final_filename = f"{base}_{timestamp}{ext}"
            
            # Extract domain to create target website subdirectory
            domain = "unknown"
            try:
                current_url = self.page.url
                parsed = urlparse(current_url)
                netloc = parsed.netloc or "unknown"
                if netloc.startswith("www."):
                    netloc = netloc[4:]
                domain = "".join(c for c in netloc if c.isalnum() or c in (".", "-", "_"))
                if not domain:
                    domain = "unknown"
            except Exception:
                pass
                
            subfolder = os.path.join(self.screenshots_dir, domain)
            os.makedirs(subfolder, exist_ok=True)
            
            path = os.path.abspath(os.path.join(subfolder, final_filename))
            self.page.screenshot(path=path)
            msg = f"Screenshot saved successfully at {path}"
            logger.info(msg)
            return {"success": True, "message": msg, "path": path}
        except Exception as e:
            msg = f"Error taking screenshot: {str(e)}"
            logger.error(msg)
            return {"success": False, "message": msg}

    def click_on_screen(self, x: int, y: int) -> dict:
        """Clicks at raw x, y coordinates. Uses semantic selector fallback if coordinates match a known element."""
        if not self.page:
            return {"success": False, "message": "Browser is not open. Call open_browser first."}
        try:
            # Re-map coordinates to see if they match a known element from the perception step
            matched_element = None
            min_dist = 15.0 # Max distance threshold in pixels to match element
            
            for el in getattr(self, 'last_elements', []):
                dist = ((el['x'] - x) ** 2 + (el['y'] - y) ** 2) ** 0.5
                if dist < min_dist:
                    matched_element = el
                    min_dist = dist
                    
            if matched_element:
                selector = matched_element['selector']
                logger.info(f"Coordinates ({x}, {y}) matched element '{matched_element['label']}' with selector '{selector}'. Attempting selector click first.")
                locator = self.resolve_locator(selector)
                if locator:
                    # Scroll the element into view first, and update center coordinates
                    try:
                        locator.scroll_into_view_if_needed(timeout=3000)
                        box = locator.bounding_box()
                        if box:
                            x = int(box["x"] + box["width"] / 2)
                            y = int(box["y"] + box["height"] / 2)
                    except Exception as scroll_err:
                        logger.warning(f"Could not scroll matching element into view: {scroll_err}")

                    try:
                        locator.wait_for(state="visible", timeout=3000)
                        # Regular click
                        locator.click(timeout=3000)
                        self.page.wait_for_timeout(1000)
                        msg = f"Successfully clicked element '{selector}' (resolved from coordinates ({x}, {y}))"
                        logger.info(msg)
                        return {"success": True, "message": msg}
                    except Exception as click_err:
                        logger.warning(f"Standard click on selector '{selector}' failed or was intercepted: {click_err}. Retrying with force=True...")
                        try:
                            locator.click(force=True, timeout=3000)
                            self.page.wait_for_timeout(1000)
                            msg = f"Successfully clicked element '{selector}' with force=True (resolved from coordinates ({x}, {y}))"
                            logger.info(msg)
                            return {"success": True, "message": msg}
                        except Exception as force_err:
                            logger.warning(f"Forced click failed: {force_err}. Falling back to raw coordinate mouse click at ({x}, {y})")
            
            # Fallback to raw coordinate mouse click (bypasses pointer interception checks)
            viewport_size = self.page.viewport_size or {"width": 1280, "height": 800}
            vh = viewport_size["height"]
            
            if y < 0 or y > vh:
                scroll_y = y - int(vh / 2)
                logger.info(f"Coordinates ({x}, {y}) are outside viewport (height={vh}). Scrolling page by {scroll_y}px to center coordinates.")
                self.page.evaluate(f"window.scrollBy(0, {scroll_y})")
                self.page.wait_for_timeout(500)
                y = int(vh / 2)

            logger.info(f"Clicking raw coordinates ({x}, {y})")
            self.page.mouse.click(x, y)
            self.page.wait_for_timeout(1000) # Wait for click animations
            msg = f"Successfully clicked at raw coordinates ({x}, {y})"
            logger.info(msg)
            return {"success": True, "message": msg}
        except Exception as e:
            self.take_screenshot("error_click_coords")
            msg = f"Error clicking coordinates ({x}, {y}): {str(e)}"
            logger.error(msg)
            return {"success": False, "message": msg}

    def send_keys(self, selector: str, text: str) -> dict:
        """Types keys into selector, clearing it first. Emulates keyboard for maximum compatibility."""
        if not self.page:
            return {"success": False, "message": "Browser is not open. Call open_browser first."}
        try:
            logger.info(f"Attempting to fill '{selector}' with text: '{text}'")
            locator = self.resolve_locator(selector)
            if not locator:
                return {"success": False, "message": f"Could not find element matching: '{selector}'"}

            # Check if we just want to press Enter or Submit
            if text in ("Enter", "{Enter}", "Submit"):
                locator.focus(timeout=3000)
                self.page.wait_for_timeout(200)
                self.page.keyboard.press("Enter")
                msg = f"Successfully pressed Enter on '{selector}'"
                logger.info(msg)
                return {"success": True, "message": msg}

            # Check if text specifies Enter key at the end
            press_enter = False
            if text.endswith("\n") or text.endswith("\r\n"):
                text = text.rstrip("\r\n")
                press_enter = True

            try:
                locator.wait_for(state="visible", timeout=3000)
                locator.focus(timeout=3000)
                self.page.wait_for_timeout(200)
                
                # Select all and delete to clear existing text
                self.page.keyboard.press("Control+A")
                self.page.keyboard.press("Backspace")
                self.page.wait_for_timeout(100)
                
                # Emulate real typing
                self.page.keyboard.type(text)
                self.page.wait_for_timeout(200)

                if press_enter:
                    self.page.keyboard.press("Enter")
                    self.page.wait_for_timeout(500)
                    
                msg = f"Successfully typed text into '{selector}'"
                logger.info(msg)
                return {"success": True, "message": msg}
            except Exception as keyboard_err:
                logger.warning(f"Keyboard emulation failed on '{selector}': {keyboard_err}. Falling back to standard Playwright fill...")
                # Fallback to standard fill
                locator.fill("", timeout=3000)
                locator.fill(text, timeout=3000)
                if press_enter:
                    locator.press("Enter")
                msg = f"Successfully filled '{selector}' via fallback"
                logger.info(msg)
                return {"success": True, "message": msg}
        except Exception as e:
            self.take_screenshot("error_send_keys")
            msg = f"Error typing keys into '{selector}': {str(e)}"
            logger.error(msg)
            return {"success": False, "message": msg}

    def scroll(self, direction: str = "down", amount: int = 500) -> dict:
        """Scrolls the page. Exposed to the LLM."""
        if not self.page:
            return {"success": False, "message": "Browser is not open. Call open_browser first."}
        try:
            logger.info(f"Scrolling {direction} by {amount}px")
            sign = 1 if direction == "down" else -1
            self.page.evaluate(f"window.scrollBy(0, {sign * amount})")
            # Fallback/complement: trigger wheel event to run lazy load handlers
            try:
                self.page.mouse.wheel(0, sign * amount)
            except Exception:
                pass
            msg = f"Successfully scrolled {direction} by {amount} pixels"
            logger.info(msg)
            return {"success": True, "message": msg}
        except Exception as e:
            msg = f"Error scrolling {direction}: {str(e)}"
            logger.error(msg)
            return {"success": False, "message": msg}

    def double_click(self, selector: str) -> dict:
        """Double-clicks element. Exposed to the LLM."""
        if not self.page:
            return {"success": False, "message": "Browser is not open. Call open_browser first."}
        try:
            logger.info(f"Double clicking '{selector}'")
            locator = self.resolve_locator(selector)
            if not locator:
                return {"success": False, "message": f"Could not find element matching: '{selector}'"}
            
            try:
                locator.wait_for(state="visible", timeout=3000)
                locator.dblclick(timeout=3000)
            except Exception as e:
                logger.warning(f"Standard double-click on '{selector}' failed: {e}. Retrying with force=True...")
                locator.dblclick(force=True, timeout=3000)
                
            msg = f"Successfully double-clicked '{selector}'"
            logger.info(msg)
            return {"success": True, "message": msg}
        except Exception as e:
            self.take_screenshot("error_double_click")
            msg = f"Error double-clicking '{selector}': {str(e)}"
            logger.error(msg)
            return {"success": False, "message": msg}

    def resolve_locator(self, selector: str) -> Optional[Locator]:
        """Helper to resolve a text label, query selector, ID, etc. to a robust Playwright locator."""
        if not self.page:
            return None
        
        # Strategy 1: Check if it's already an ID, class, CSS selector, or Playwright selector path
        is_css = (
            selector.startswith("#") or 
            selector.startswith(".") or 
            "[" in selector or 
            ">" in selector or 
            ":" in selector or 
            " " in selector or
            selector.lower() in ("input", "button", "select", "textarea", "a", "div", "span", "p", "h1", "h2", "h3")
        )
        if is_css:
            try:
                loc = self.page.locator(selector)
                if loc.count() > 0:
                    return loc.first
            except Exception:
                pass
                
        # Strategy 2: Get by Accessible/Semantic Label
        try:
            loc = self.page.get_by_label(selector, exact=False)
            if loc.count() > 0:
                return loc.first
        except Exception:
            pass
            
        # Strategy 3: Get by Placeholder
        try:
            loc = self.page.get_by_placeholder(selector, exact=False)
            if loc.count() > 0:
                return loc.first
        except Exception:
            pass
            
        # Strategy 4: Get by Role (button, link, etc. if matches exact text)
        try:
            loc = self.page.get_by_role("button", name=selector, exact=False)
            if loc.count() > 0:
                return loc.first
        except Exception:
            pass
            
        # Strategy 5: Text match
        try:
            loc = self.page.get_by_text(selector, exact=False)
            if loc.count() > 0:
                return loc.first
        except Exception:
            pass
            
        # Strategy 6: Fallback to standard selector locator
        try:
            return self.page.locator(selector).first
        except Exception:
            return None

    def get_interactive_elements(self) -> list:
        """Extracts visible interactive elements in viewport with positions and semantic attributes using Javascript injection."""
        if not self.page:
            return []
        try:
            js_code = """
            () => {
                const elements = [];
                const interactiveTags = ['input', 'button', 'select', 'textarea', 'a'];
                const interactiveRoles = ['button', 'link', 'checkbox', 'radio', 'tab', 'option', 'menuitem', 'combobox'];
                const candidates = document.querySelectorAll('*');
                let idCounter = 0;
                const viewportHeight = window.innerHeight;
                
                candidates.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    const style = window.getComputedStyle(el);
                    
                    // Check if element is visible and occupies space
                    if (rect.width === 0 || rect.height === 0 || style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
                        return;
                    }
                    
                    // Viewport filter: only elements on screen or near the screen (-200px to viewportHeight + 800px)
                    if (rect.bottom < -200 || rect.top > viewportHeight + 800) {
                        return;
                    }
                    
                    const tagName = el.tagName.toLowerCase();
                    const role = el.getAttribute('role') || '';
                    const type = el.getAttribute('type') || '';
                    
                    if (tagName === 'input' && type === 'hidden') {
                        return;
                    }
                    
                    const isInteractive = interactiveTags.includes(tagName) || 
                                         interactiveRoles.includes(role) ||
                                         style.cursor === 'pointer' ||
                                         el.hasAttribute('onclick');
                                         
                    if (!isInteractive) return;
                    
                    // Deduplicate nested interactive child elements (e.g. span inside an a tag)
                    let parent = el.parentElement;
                    let hasInteractiveParent = false;
                    while (parent) {
                        const parentTagName = parent.tagName.toLowerCase();
                        const parentRole = parent.getAttribute('role') || '';
                        const parentStyle = window.getComputedStyle(parent);
                        const parentIsInteractive = ['button', 'a'].includes(parentTagName) || 
                                                     ['button', 'link'].includes(parentRole) ||
                                                     parent.hasAttribute('onclick') ||
                                                     parentStyle.cursor === 'pointer';
                        
                        if (parentIsInteractive) {
                            if (!['input', 'button', 'select', 'textarea', 'a'].includes(tagName)) {
                                hasInteractiveParent = true;
                                break;
                            }
                        }
                        parent = parent.parentElement;
                    }
                    
                    if (hasInteractiveParent) return;
                    
                    // Exclude empty helper tags like svgs/images inside interactive containers if they have no text/alt/title/label
                    if (['svg', 'img', 'path'].includes(tagName) && !(el.innerText || el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('title'))) {
                        return;
                    }
                    
                    // Find label semantic representation
                    let label = '';
                    if (el.id) {
                        const labelEl = document.querySelector(`label[for="${el.id}"]`);
                        if (labelEl) label = labelEl.innerText;
                    }
                    if (!label) {
                        const closestLabel = el.closest('label');
                        if (closestLabel) label = closestLabel.innerText;
                    }
                    if (!label) {
                        label = el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('alt') || el.getAttribute('title') || '';
                    }
                    label = label.replace(/\\n/g, ' ').trim();
                    
                    // Exclude empty non-input/non-select/non-textarea elements
                    if (!['input', 'select', 'textarea'].includes(tagName) && !label) {
                        return;
                    }
                    
                    idCounter++;
                    el.setAttribute('data-browseiq-id', idCounter);
                    const finalSelector = `[data-browseiq-id="${idCounter}"]`;
                    
                    elements.push({
                        id: idCounter,
                        tag: tagName,
                        type: el.getAttribute('type') || 'text',
                        text: el.innerText ? el.innerText.substring(0, 50).trim() : '',
                        label: label,
                        placeholder: el.getAttribute('placeholder') || '',
                        selector: finalSelector,
                        x: Math.round(rect.left + rect.width / 2),
                        y: Math.round(rect.top + rect.height / 2),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height)
                    });
                });
                return elements;
            }
            """
            elements = self.page.evaluate(js_code)
            self.last_elements = elements
            return elements
        except Exception as e:
            logger.error(f"Error extracting interactive elements: {e}")
            return []

    def close_browser(self) -> dict:
        """Gracefully closes all browser contexts and pages."""
        try:
            logger.info("Closing browser session")
            if self.page:
                self.page.close()
                self.page = None
            if self.context:
                self.context.close()
                self.context = None
            if self.browser:
                self.browser.close()
                self.browser = None
            if self.playwright:
                self.playwright.stop()
                self.playwright = None
            return {"success": True, "message": "Browser closed successfully."}
        except Exception as e:
            msg = f"Error closing browser: {str(e)}"
            logger.error(msg)
            return {"success": False, "message": msg}
