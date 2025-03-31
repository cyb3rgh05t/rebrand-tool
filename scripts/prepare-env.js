/**
 * This script ensures the .env file exists before building
 * If .env doesn't exist but .env.example does, it will create a copy
 */
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env");
const exampleEnvPath = path.join(rootDir, ".env.example");

// Check if .env exists
if (!fs.existsSync(envPath)) {
  console.log("Environment .env file not found");

  // Check if .env.example exists
  if (fs.existsSync(exampleEnvPath)) {
    console.log("Creating .env from .env.example");
    fs.copyFileSync(exampleEnvPath, envPath);
    console.log("Created .env file");
  } else {
    console.log("Environment .env.example not found either");
    console.log("Creating empty .env file");
    fs.writeFileSync(
      envPath,
      "# Environment Variables\n# Add your configuration here\n"
    );
    console.log("Created empty .env file");
  }
} else {
  console.log("Environment .env file exists");
}

// Make sure the scripts directory exists
const scriptsDir = path.join(rootDir, "scripts");
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir);
}

console.log("Environment preparation complete");
