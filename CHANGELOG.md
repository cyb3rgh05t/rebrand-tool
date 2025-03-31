# Changelog

All notable changes to StreamNet Rebrand Panel Tool will be documented in this file.

## [2.4.1] - 2025-04-01

### Fixed

Update dialog now displays release notes directly from CHANGELOG

## [2.4.0] - 2025-04-01

### Added

Enhanced update notification system with user preferences
Option to skip specific versions or dismiss update notifications
Improved Git tag and release automation workflow
Better integration between version management and build system

### Changed

Update dialog now displays release notes directly from CHANGELOG
Release notes are now automatically extracted during the build process
Streamlined GitHub Actions workflow to improve reliability

### Fixed

Fixed permission issues in GitHub Actions workflows
Resolved tag creation errors in CI/CD pipeline
Improved error handling in the update notification system

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
