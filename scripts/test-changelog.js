/**
 * Deep debugging script for changelog extraction
 */
const fs = require("fs");

// Get version from command line or use default
const version = process.argv[2] || "2.4.2";
console.log(`Debugging extraction for version ${version}:\n`);

try {
  // Read the changelog file
  const changelog = fs.readFileSync("./CHANGELOG.md", "utf8");

  // Print file information
  console.log(`File size: ${changelog.length} bytes`);
  console.log(
    `File contains version string "${version}": ${changelog.includes(version)}`
  );

  // Print the first part of the file to see format
  console.log("\nFile beginning (first 200 characters):");
  console.log("-".repeat(60));
  console.log(
    changelog.substring(0, 200).replace(/\r/g, "\\r").replace(/\n/g, "\\n")
  );
  console.log("-".repeat(60));

  // Find and print the lines around the version we're looking for
  const lines = changelog.split(/\r?\n/); // Handle both CRLF and LF
  let versionLineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(version)) {
      versionLineIndex = i;
      break;
    }
  }

  if (versionLineIndex >= 0) {
    console.log(
      `\nFound version "${version}" at line ${versionLineIndex + 1}:`
    );
    console.log("-".repeat(60));

    // Print 3 lines before and after for context
    const startLine = Math.max(0, versionLineIndex - 3);
    const endLine = Math.min(lines.length - 1, versionLineIndex + 3);

    for (let i = startLine; i <= endLine; i++) {
      const prefix = i === versionLineIndex ? ">" : " ";
      // Show line number, content, and special characters
      console.log(
        `${prefix} ${(i + 1).toString().padStart(3)}: ${JSON.stringify(
          lines[i]
        )}`
      );
    }
    console.log("-".repeat(60));
  } else {
    console.log(`\nVersion "${version}" not found in any line`);
  }

  // Try multiple regex patterns to see what works
  console.log("\nTrying different regex patterns:");
  const patterns = [
    new RegExp(`## \\[${version}\\]`, "i"),
    new RegExp(`## \\[${version.replace(/\./g, "\\.")}\\]`, "i"),
    new RegExp(`## \\[${version.replace(/\./g, "\\.")}\\].*`, "i"),
    new RegExp(`## \\[?${version.replace(/\./g, "\\.")}\\]?`, "i"),
    new RegExp(`## \\[${version.replace(/\./g, "\\.")}\\][^\\n]*`, "i"),
    new RegExp(`## \\[${version.replace(/\./g, "\\.")}\\][^\\r\\n]*`, "i"),
  ];

  patterns.forEach((pattern, i) => {
    const match = changelog.match(pattern);
    console.log(`Pattern ${i + 1} ${pattern}: ${match ? "MATCH" : "NO MATCH"}`);
    if (match) {
      console.log(`  Found: ${JSON.stringify(match[0])}`);
      console.log(`  Index: ${match.index}`);
    }
  });

  // Extract specific section with a working approach
  console.log("\nTrying direct string-based extraction:");

  // Find the line containing our version header
  const versionHeader = lines[versionLineIndex];
  if (versionHeader) {
    console.log(`Found header: ${versionHeader}`);

    // Find the index of this line in the original text
    const headerIndex = changelog.indexOf(versionHeader);
    console.log(`Header position in text: ${headerIndex}`);

    if (headerIndex >= 0) {
      // Look for next version header
      let nextHeaderIndex = -1;

      // Start search after current version header
      const startSearchingAt = headerIndex + versionHeader.length;

      // Try to match any version header pattern
      const nextHeaderMatch = changelog
        .slice(startSearchingAt)
        .match(/## \[\d+\.\d+\.\d+\]/);
      if (nextHeaderMatch) {
        nextHeaderIndex = startSearchingAt + nextHeaderMatch.index;
        console.log(
          `Next header found at position ${nextHeaderIndex}: ${nextHeaderMatch[0]}`
        );
      } else {
        console.log("No next header found, will extract to end of file");
      }

      // Extract the notes section
      const endPosition =
        nextHeaderIndex >= 0 ? nextHeaderIndex : changelog.length;
      const sectionText = changelog
        .slice(headerIndex + versionHeader.length, endPosition)
        .trim();

      console.log("\nExtracted content:");
      console.log("-".repeat(60));
      console.log(sectionText);
      console.log("-".repeat(60));

      // Save to file
      fs.writeFileSync("RELEASE_NOTES.md", sectionText);
      console.log("Saved to RELEASE_NOTES.md");
    }
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
}
