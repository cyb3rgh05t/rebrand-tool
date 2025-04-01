/**
 * Extract version-specific release notes from CHANGELOG.md
 *
 * This script provides a robust solution for extracting release notes
 * from standard Markdown changelog files following Keep a Changelog format.
 *
 * Usage: node extract-changelog.js <version>
 * Example: node extract-changelog.js 2.4.2
 */
const fs = require("fs");
const path = require("path");

// Get version from command line or package.json
let version = process.argv[2];

if (!version) {
  try {
    // Attempt to get version from package.json
    const packageJson = require("./package.json");
    version = packageJson.version;
    console.log(
      `No version specified, using version from package.json: ${version}`
    );
  } catch (error) {
    console.error("No version specified and failed to read package.json");
    process.exit(1);
  }
}

// Main extraction function
function extractReleaseNotes(version, changelogPath = "./CHANGELOG.md") {
  try {
    // Check if the changelog file exists
    if (!fs.existsSync(changelogPath)) {
      console.error(`Changelog file not found at: ${changelogPath}`);
      return null;
    }

    // Read the changelog file
    const changelog = fs.readFileSync(changelogPath, "utf8");

    // Split into lines, handling both CRLF and LF
    const lines = changelog.split(/\r?\n/);

    // Find the starting line with our version
    let startLine = -1;
    const versionHeaderPattern = `## [${version}]`;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(versionHeaderPattern)) {
        startLine = i;
        break;
      }
    }

    if (startLine === -1) {
      console.error(`Version ${version} not found in changelog`);
      return null;
    }

    // Find the next version header or end of file
    let endLine = lines.length;

    for (let i = startLine + 1; i < lines.length; i++) {
      if (lines[i].match(/^## \[\d+\.\d+\.\d+\]/)) {
        endLine = i;
        break;
      }
    }

    // Extract the relevant lines
    // Skip the header line itself
    const releaseNotes = lines
      .slice(startLine + 1, endLine)
      .join("\n")
      .trim();
    return releaseNotes;
  } catch (error) {
    console.error(`Error extracting release notes: ${error.message}`);
    return null;
  }
}

// When run directly from command line
if (require.main === module) {
  const releaseNotes = extractReleaseNotes(version);

  if (releaseNotes) {
    // Output to console
    console.log(releaseNotes);

    // Save to file
    fs.writeFileSync("RELEASE_NOTES.md", releaseNotes);
    console.log("Release notes successfully extracted to RELEASE_NOTES.md");
  } else {
    console.error("Failed to extract release notes");
    process.exit(1);
  }
}

// Export for use as a module
module.exports = { extractReleaseNotes };
