# PlexManualScan
PlexManualScan is a command line tool that manually scans a specific movie or show folder instead of a whole library. This tool connects to Plex to retrieve your movie and show libraries to retrieve existing paths.

## New Features
- Scan folders within Plex Libary Paths
- create google drive shortcuts with rclone and paths from sonarr

## Installation
Using npm or yarn to install
```bash
npm install
```
```bash
yarn install
```

## Usage
Before running, copy the `config.js.example` to `config.js` and fill in the PlexToken and PlexURL. If you want to use the rclone and sonarr features, also fill in the rclone and sonarr variables.
To run, simply use `npm start` and follow the prompts.
