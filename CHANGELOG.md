# Full Changelog

All notable changes to Rebrands Panel Tool will be documented in this file.

## [2.6.1] - 2025-04-16

### Added

- Cockpit Panel 2.5.2
- Webviews 2.5.3
- Smarters Pro 2.5.2

## [2.6.0] - 2025-04-12

### Added

- New Transfer Success Dialog that provides a modern, visually appealing summary after successful module transfers
- Theme-aware styling that adapts to all application themes (Dark, Light, Nord, Dracula, One Dark, Overseerr, Space Gray, Hotline, Aquamarine, Hot Pink, Maroon, Organizr, and Plex)
- Improved module categorization in the success dialog:

- Main Panel
- Branding Modules
- WebView Modules
- Proxy Modules
- OTT Applications
- VOD Applications
- VPN Applications
- Store Applications

- Automatic deduplication of modules to prevent duplicate entries in the success dialog
- Special handling for Cockpit Panel to ensure proper categorization and version display
- Responsive design for all screen sizes

### Changed

- Improved transfer completion flow to show only the new success dialog instead of the original transfer dialog
- Enhanced module recognition system to better identify different module variants
- Updated domain display with improved styling and DNS status indicator

### Fixed

- Fixed issue with duplicate module entries appearing in transfer summaries
- Fixed Cockpit Panel not being properly categorized (previously appeared under "Other Modules")
- Fixed version display for modules showing "0.0.0" when proper version information was available
- Fixed path-based module detection for special cases like Cockpit Panel and WebViews

## [2.5.4] - 2025-04-09

### Added

- WebViews Module 2.5.2
- Update Status for Modules in Analysis
- Live Version from installed Modules
- Version to selected Items fot Transfer

## [2.5.3] - 2025-04-07

### Added

- IBO Solutions Module 2.5.2
- Enhanced logging system that unifies main and renderer process logs
- Advanced log filtering with source, level, category, and text search capabilities
- Auto-refresh feature for main process logs
- Improved log structure with rich metadata
- Module version display throughout application UI
- DNS records preview in domain creation form
- Support for Plex WebView module installation

### Changed

- Improved domain analysis with better categorization of installed modules
- Enhanced debug console with more intuitive UI and additional functionality
- Optimized file transfer process with better error handling
- Refined configuration management system
- Updated transfer dialog with more detailed status information

### Fixed

- Path handling issues in file transfers for special modules
- Connection status synchronization between settings and main UI
- DNS record creation error handling
- Module selection inconsistencies
- Cache issues with domain analysis
- Configuration persistence across app restarts

## [2.5.2] - 2025-04-05

### Added

- Cockpit Base Panel 2.5.1
- XCIPTV Module 2.5.1
- Smarters Pro Module 2.5.1
- IBO Solutions Module 2.5.1
- ORVPN Module 2.5.1
- TiviMate Module 2.5.1
- Sparkle TV Module 2.5.1
- Neutro Player Module 2.5.1
- Module version display: Added version numbers as subtitles to all modules and panels in selection panel and transfer dialog
- Enhanced CSS for version display that maintains text ellipsis behavior for long module names
- Dynamic version updates through MutationObserver for dynamically loaded content

### Changed

- Improved module selection UI with more compact version display
- Enhanced transfer dialog to show version information for transferred modules
- Updated selected modules preview to include version information
- Refactored module naming system for better maintenance

### Fixed

- Fixed text overflow issues in module selection panels
- Addressed padding inconsistencies in various module displays
- Corrected layout issues in transfer dialog item display

## [2.5.1] - 2025-04-04

### Added

- Cockpit Base Panel 2.5.1
- XCIPTV Module 2.5.1
- Smarters Pro Module 2.5.1
- IBO Solutions Module 2.5.1
- ORVPN Module 2.5.1
- TiviMate Module 2.5.1
- Sparkle TV Module 2.5.1
- Neutro Player Module 2.5.1

## [2.5.0] - 2025-04-02

### Added

- Completely redesigned Update Notification System with modern UI
- New dark-mode optimized update dialog with animated transitions
- "Don't show again for this version" option for update notifications
- Enhanced release notes display in update dialog
- Better platform-specific download URL detection
- New transfer progress dialog with real-time feedback
- Detailed logging during file transfers and DNS creation
- Progress bar with visual indicators for transfer status
- Summary display with success/failure counts after transfer
- Ability to cancel ongoing transfers
- Auto-scroll functionality in transfer logs with toggle option
- Theme compatibility across all application themes
- Command and output specific styling in transfer logs

### Changed

- Improved user preferences system for update notifications
- Enhanced styling and layout for all notification dialogs
- Switched from Electron's native dialog to custom HTML/CSS dialogs for updates
- Refined UI feedback system throughout the application
- Better handling of version comparison during update checks
- Enhanced transfer process with clearer visual feedback
- Improved error handling during transfer operations
- Better integration with theme system for consistent UI
- More informative status updates during file operations
- Modernized the transfer experience with detailed progress tracking

### Fixed

- Update dialog display issues in dark mode
- Inconsistent notification behavior when multiple updates are available
- Version skipping functionality not being honored consistently
- Release notes truncation issues in update dialog

## [2.4.4] - 2025-04-02

### Fixed

- Update dialog display issues in dark mode
- Inconsistent notification behavior when multiple updates are available
- Version skipping functionality not being honored consistently
- Release notes truncation issues in update dialog

## [2.4.3] - 2025-04-02

### Fixed

- Improved extraction of release notes from CHANGELOG.md
- Added reliable changelog extraction script for application updates

## [2.4.2] - 2025-04-01

### Fixed

- Fixed GitHub Actions workflows for release builds

## [2.4.1] - 2025-04-01

### Fixed

- Update dialog now displays release notes directly from CHANGELOG

## [2.4.0] - 2025-04-01

### Added

- Enhanced update notification system with user preferences
- Option to skip specific versions or dismiss update notifications
- Improved Git tag and release automation workflow
- Better integration between version management and build system

### Changed

- Update dialog now displays release notes directly from CHANGELOG
- Release notes are now automatically extracted during the build process
- Streamlined GitHub Actions workflow to improve reliability

### Fixed

- Fixed permission issues in GitHub Actions workflows
- Resolved tag creation errors in CI/CD pipeline
- Improved error handling in the update notification system

## [2.3.4] - 2025-03-31

### Added

- Minor Fixes

## [2.3.3] - 2025-03-31

### Added

- Better Workflows

## [2.3.2] - 2025-03-31

### Added

- Status message system for settings page
- Toast-style notifications in settings UI
- Visual feedback for configuration actions
- Selected modules preview in destination panel showing what's selected for transfer
- Automatic reset of all UI states after successful transfer or DNS creation
- Improved count logic for modules to treat both API and Panel components as one item

### Changed

- Enhanced UI feedback system throughout application
- Improved status messages with animations
- Refined user experience in settings interface
- Enhanced UI feedback for transfer operations
- Better visual consistency between domain analysis and selected modules preview
- Refined handling of module/panel selections for a more intuitive user experience

### Fixed

- Status message positioning in settings panel
- UI feedback consistency across different sections
- Visual indication of operation success/failure
- Count display when selecting modules showing incorrect number of items
- UI states persisting after transfer operations
- Inconsistent styling between domain analysis and selected modules preview

## [2.3.1] - 2025-03-31

### Fixed

- SmartTube Module

## [2.3.0] - 2025-03-30

### Added

- New configuration manager system replacing .env files
- Enhanced settings UI with all configuration options
- DNS preview feature showing records that will be created
- Themepark.dev - Multiple color themes including Dark, Light, Nord, Dracula, etc.
- Support for domain analysis to detect installed modules
- GitHub-based update system with release notes display
- App version display in UI header and settings

### Changed

- Restructured DNS handling with improved error management
- Enhanced domain creation with live logging
- Improved UI with animations and transitions
- Better error handling throughout the application
- Upgraded to Electron 25.0.0

### Fixed

- Connection issues with SFTP on some server configurations
- Domain selection not preserving state after refresh
- DNS records creation failing on certain Cloudflare accounts
- Module selection UI not properly updating selected items count

## [2.2.0] - 2025-03-15

### Added

- Support for additional streaming modules
- Domain analysis feature
- Automatic subdomain suggestion
- Debug console for troubleshooting

### Changed

- Improved file transfer performance
- Enhanced UI for module selection
- Better error handling for SSH connections

### Fixed

- SSH connection timeout issues
- DNS record creation failures
- Module path resolution problems

## [2.1.0] - 2025-03-06

### Added

- DNS integration with Cloudflare
- Support for IPv6 addresses
- Multiple theme options
- Logging system enhancements

### Changed

- UI redesign with improved responsive layout
- Enhanced module organization by categories
- Optimized file transfer system

### Fixed

- Module transfer issues
- Connection stability problems
- Domain creation error handling

## [2.0.0] - 2025-03-03

### Added

- Complete rewrite using Electron framework
- Domain creation via Virtualmin API
- Module selection interface
- SSH/SFTP connection management
- Configuration via .env files

### Changed

- Entirely new user interface
- Improved architecture and performance

## [1.0.0] - 2025-03-01

### Added

- Initial release
- Basic panel deployment functionality
- Manual domain setup
- Support for essential IPTV modules
