---
title: Privacy Policy
description: Understand how the Repomix CLI, website, and browser extension handle repository data, telemetry, temporary uploads, and security responsibilities.
---

# Privacy Policy

## Repomix CLI Tool

- **Data Collection**: The Repomix CLI tool does **not** collect, transmit, or store any user data, telemetry, or repository information.
- **Network Usage**: Repomix CLI operates fully offline after installation. The only cases where an internet connection is needed are:
  - Installation via npm/yarn.
  - Using the [`--remote` flag](/guide/remote-repository-processing) to process remote repositories.
  - Checking for updates (manually triggered).
- **Security Considerations**: Since all processing is local, Repomix CLI is safe to use with private and internal repositories. See the [Security](/guide/security) page for more details on sensitive data detection.

## Repomix Website ([repomix.com](https://repomix.com/))

- **Data Collection**: The Repomix website uses **Google Analytics** to collect usage data, such as page views and user interactions. This helps us understand how the website is used and improve the user experience.
- **Bot Protection**: We use **Cloudflare Turnstile** in invisible mode to protect the Pack form from automated abuse. Turnstile runs in the background and may collect browser and network signals to perform this check, without displaying a CAPTCHA. See the [Cloudflare Turnstile Privacy Policy](https://www.cloudflare.com/en-gb/turnstile-privacy-policy/) for details.
- **File Processing**: When uploading ZIP files or folders, your files are temporarily stored on our servers for processing. All uploaded files and processed data are automatically deleted immediately after processing is complete.

## Repomix Browser Extension

- **Data Collection**: The Repomix browser extension does **not** collect, transmit, or store any user data, telemetry, or repository information.
- **Permissions**: The extension only requires minimal permissions necessary to add the Repomix button to GitHub repository pages. It does not access or modify repository data.

## Liability Disclaimer

Repomix (the CLI tool, website, and browser extension) is provided "as is" without any warranties or guarantees.
We do not take responsibility for how the generated output is used, including but not limited to its accuracy, legality, or any potential consequences arising from its use.
