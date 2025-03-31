/**
 * Theme system for StreamNet Panels
 */

// Define allowed themes for validation
const ALLOWED_THEMES = [
  "dark",
  "light",
  "nord",
  "dracula",
  "onedark",
  "overseerr",
  "spacegray",
  "hotline",
  "aquamarine",
  "hotpink",
  "maroon",
  "organizr",
  "plex",
];

// Initialize theme system
function initThemeSystem() {
  // Check for saved theme preference
  const savedTheme = localStorage.getItem("streamnet-theme") || "dark";

  // Validate the saved theme
  const theme = ALLOWED_THEMES.includes(savedTheme) ? savedTheme : "dark";

  // Apply the saved theme
  document.documentElement.className = `theme-${theme}`;

  // Log theme initialization
  console.info(`Theme system initialized with theme: ${theme}`);
}

// Function to set a specific theme
function setTheme(themeName) {
  // Validate theme
  if (!ALLOWED_THEMES.includes(themeName)) {
    themeName = "dark"; // Default to dark
  }

  // Remove all existing theme classes
  document.documentElement.classList.remove(
    ...ALLOWED_THEMES.map((theme) => `theme-${theme}`)
  );

  // Add the selected theme class
  document.documentElement.classList.add(`theme-${themeName}`);

  // Save preference
  localStorage.setItem("streamnet-theme", themeName);

  console.info(`Theme changed to: ${themeName}`);
}

// Create a custom theme (for future use)
function saveCustomTheme(themeSettings) {
  // Store the settings
  localStorage.setItem("streamnet-custom-theme", JSON.stringify(themeSettings));

  // Apply the custom theme
  applyCustomTheme(themeSettings);
}

// Apply a custom theme from settings
function applyCustomTheme(settings) {
  // Create a style element
  let customStyle = document.getElementById("custom-theme-style");
  if (!customStyle) {
    customStyle = document.createElement("style");
    customStyle.id = "custom-theme-style";
    document.head.appendChild(customStyle);
  }

  // Generate CSS from settings
  let css = ".theme-custom {\n";
  for (const [key, value] of Object.entries(settings)) {
    css += `  --${key}: ${value};\n`;
  }
  css += "}";

  // Apply the CSS
  customStyle.textContent = css;

  // Switch to the custom theme
  setTheme("custom");
}

// Load custom theme on startup
function loadCustomTheme() {
  const savedCustomTheme = localStorage.getItem("streamnet-custom-theme");
  if (savedCustomTheme) {
    try {
      const themeSettings = JSON.parse(savedCustomTheme);
      applyCustomTheme(themeSettings);
    } catch (e) {
      console.error("Failed to load custom theme", e);
    }
  }
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", initThemeSystem);

// Export functions for access from other modules
window.themeSystem = {
  setTheme,
  saveCustomTheme,
  loadCustomTheme,
  ALLOWED_THEMES,
};
