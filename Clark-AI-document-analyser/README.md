# Clark AI Document Analyser Generator

![Logo](logo.png)

[![License: GPL v3](https://img.shields.io/badge/license-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0.en.html) [![Node.js](https://img.shields.io/badge/node-%3E%3D14-green.svg)](https://nodejs.org/) [![npm](https://img.shields.io/badge/npm-install-orange.svg)](https://www.npmjs.com/) [![Tailscale](https://img.shields.io/badge/Tailscale-required-blue.svg)](https://tailscale.com/)


A Node.js server for secure document upload, encryption, and analysis using AES-256-GCM encryption for the uploaded files from my Botpress Cloud chatbot. Designed to run locally with Tailscale integration for secure access.

## Features

- **Secure File Upload**: Upload files from URLs and encrypt them using AES-256-GCM (authenticated encryption).
- **File Storage & Cleanup**: Store encrypted files from upload and delete them on demand.
- **Encryption at Rest**: All stored files are encrypted with AES-256-GCM, providing both confidentiality and integrity.
- **Streaming Support**: Automatically uses streaming for files larger than 500 MB.
- **Cluster Support**: Multi-worker process for better performance on multi-core systems.
- **Async Queue**: Efficient file upload queue with configurable concurrency.
- **Tailscale Integration**: Secure access via Tailscale network.
- **Botpress Compatible**: Snippets for integration with Botpress workflows (AES-256-GCM compatible).

## Prerequisites

- Node.js (LTS version)
- Tailscale (for secure networking)
- npm

## Installation

1. Clone or download the project.
2. Navigate to the project directory.
3. Install dependencies:

```bash
npm install
```

4. Create a `.env` file in the project root if it does not already exist.
5. Ensure Tailscale is installed and running on your system.

## Configuration

### Security Note
This version uses AES-256-GCM for all file encryption, which provides authenticated encryption (confidentiality and integrity). Each file is encrypted with a unique session key, IV, and authentication tag, all stored securely in the vault/keys directory.

The server requires a master secret for authentication. Set it in the code or via environment variables.

### .env file

Create a `.env` file in the project root with the following configuration:

```env
PORT=3000
TAILSCALE_BASE_URL=http://your-device-name.your-tailnet.ts.net:3000
```


### Important Notes

- The server uses `SuperSecret2026` as the default master secret (hardcoded in `server.js`).
- For production, change the `MASTER_SECRET` value in `server.js` or implement `.env` support for it.
- **File encryption now uses AES-256-GCM** (authenticated encryption) with randomly generated keys, IVs, and authentication tags.
- Files larger than 500 MB are processed using streaming mode for efficiency.
- Worker processes are automatically spawned based on CPU core count for optimal performance.

## Botpress Integration Example

You can call the upload endpoint from a Botpress Cloud action using the following code:

```javascript
const axios = require('axios');

async function uploadFileToClark(url) {
  const response = await axios.post('http://localhost:3000/', {
    action: 'upload',
    url: url
  }, {
    headers: {
      'Authorization': 'Bearer SuperSecret2026',
      'Content-Type': 'application/json'
    }
  });
  return response.data;
}

// Usage in Botpress action:
const fileUrl = event.payload.fileUrl; // Or wherever your file URL comes from
const result = await uploadFileToClark(fileUrl);
bp.logger.info('Clark upload result:', result);
```

**Note:** The server will encrypt the file using AES-256-GCM and return a `fileId` if successful. Use this `fileId` for further analysis or cleanup actions.

## Running the Server

Start the server:

```bash
npm start
```

The server runs on port 3000 by default, or specify a custom port:

```bash
PORT=8080 npm start
```

**What happens at startup:**
- Creates `vault/files` and `vault/keys` directories (auto-created if missing)
- Spawns worker processes based on CPU core count
- Initializes an async queue for file uploads
- Ready to accept requests

### Exposing via Tailscale

Make the server accessible through Tailscale funnel:

```bash
tailscale funnel 3000
```

**On Windows (if PATH isn't set):**
```bash
& "C:\Program Files\Tailscale\tailscale.exe" funnel 3000
```

If your Tailscale is installed elsewhere, adjust the path accordingly.

Then use the Tailscale hostname in your requests:
```
TAILSCALE_BASE_URL=https://your-device-name.your-tailnet.ts.net:3000
```

## API Endpoints

### POST /

Handles upload and analyze actions. Requires `Authorization: Bearer <MASTER_SECRET>` header where `<MASTER_SECRET>` is `SuperSecret2026` (default).

#### Upload Action

Upload a file from a URL and encrypt it. Supports all common formats like `.pdf`, `.jpg`, `.jpeg`, `.png`, `.svg`, `.gif`, `.webp`, `.mp4`, `.docx`, `.xlsx`, `.pptx` and more, up to 500 MiB.

Files are processed asynchronously through a queue:
- **Small files** (< 500 MB): Buffered in memory and encrypted
- **Large files** (≥ 500 MB): Streamed directly to disk while encrypting

**Request Body:**
```json
{
  "action": "upload",
  "url": "https://example.com/file.pdf"
}
```

**Response:**
```json
{
  "success": true,
  "fileId": "ID-ABC123"
}
```

#### Analyze Action

Delete a previously uploaded file and its encryption key.

**Request Body:**
```json
{
  "action": "analyze",
  "fileId": "ID-ABC123"
}
```

**Response:**
```json
{
  "success": true,
  "answer": "Анализът на ID-ABC123 е завършен. Системата изчисти временните данни."
}
```

## Security

- **AES-256-CBC Encryption**: All uploaded files are encrypted with AES-256-CBC using random 256-bit keys and 128-bit initialization vectors.
- **Key Management**: Each file has a unique encryption key stored separately in `vault/keys/` directory.
- **Bearer Token Authentication**: All requests require `Authorization: Bearer SuperSecret2026` header.
- **Cluster Isolation**: Each worker process operates independently for improved stability.
- **Manual Cleanup**: Files persist until explicitly deleted via the `analyze` action.
- **No Data Exposure**: Encrypted files cannot be read without the corresponding keys, ensuring data privacy.
- **Queue-Based Processing**: Async queue prevents resource exhaustion from concurrent uploads.

## Directory Structure

```
vault/
├── files/          # Encrypted uploaded files (.dat)
└── keys/           # Encryption keys in JSON format (.key)
```

**How it works:**
- When a file is uploaded, it's encrypted and saved as `ID-XXXXXX.dat` in `vault/files/`
- The encryption key (sessionKey, iv, processing method) is saved as `ID-XXXXXX.key` in `vault/keys/`
- When the `analyze` action is called, both the file and its key are deleted
- Directories are automatically created on server startup if they don't exist

## Botpress Integration

For seamless integration with Botpress, you can use the server as a secure backend for file upload and cleanup directly from your chatbot workflows. This allows you to handle sensitive documents without exposing them to third-party clouds.

### How Botpress Integration Works

1. **Upload a file**: The user provides a file URL (for example, from a file upload card or external storage). The Botpress workflow sends this URL to your server, which downloads, encrypts, and stores the file. The server returns a `fileId`.
2. **Analyze/Cleanup**: When the user is ready, the workflow sends the `fileId` to the server to trigger analysis and cleanup (deletion of the file and its key).

### Environment Variables in Botpress

Set these in your Botpress environment or workflow:

- `YOGA_SERVER_URL`: The full URL to your server (preferably your Tailscale MagicDNS address)
- `MASTER_SECRET`: The authentication token (default: `SuperSecret2026`)

Example:
```env
YOGA_SERVER_URL=https://your-device-name.your-tailnet.ts.net:3000
MASTER_SECRET=SuperSecret2026
```

### Example: Upload File (Botpress Execute Code Card)

This code uploads a file from a user-provided URL and stores the returned `fileId` in the workflow:

```javascript
async function execute() {
  const serverUrl = env.YOGA_SERVER_URL;
  const masterSecret = env.MASTER_SECRET || 'SuperSecret2026';

  try {
    const response = await axios.post(serverUrl, {
      action: "upload",
      url: workflow.uploadedFileUrl, // Set this variable earlier in your workflow
      sessionId: event.conversationId
    }, {
      headers: { 'Authorization': `Bearer ${masterSecret}` }
    });

    if (response.data && response.data.fileId) {
      workflow.fileId = response.data.fileId;
      workflow.uploadedFileUrl = null; // Clear the URL after upload
    }
  } catch (err) {
    console.error("Upload Error:", err.message);
    workflow.fileId = null;
  }
}
return execute();
```

**How to use:**
- Place this code in an Execute Code card after the user provides a file URL.
- Make sure `workflow.uploadedFileUrl` is set (e.g., from a previous card).
- On success, `workflow.fileId` will contain the ID for later use.

### Example: Analyze & Cleanup File (Botpress Execute Code Card)

This code deletes the uploaded file and its encryption key, and stores the server's response:

```javascript
async function execute() {
  const serverUrl = env.YOGA_SERVER_URL;
  const masterSecret = env.MASTER_SECRET || 'SuperSecret2026';

  try {
    const response = await axios.post(serverUrl, {
      action: "analyze",
      fileId: workflow.fileId // Set by the upload step
    }, {
      headers: { 'Authorization': `Bearer ${masterSecret}` },
      timeout: 30000
    });

    workflow.finalResponse = response.data.answer;
  } catch (err) {
    console.error("Analyze Error:", err.message);
    workflow.finalResponse = "Server error during file cleanup.";
  }
}
return execute();
```

**How to use:**
- Place this code in an Execute Code card after the upload step.
- Make sure `workflow.fileId` is set.
- On success, `workflow.finalResponse` will contain the server's answer (e.g., confirmation of cleanup).


### Tips for Botpress Integration

- Always check for errors and handle them gracefully in your workflow.
- Use Tailscale MagicDNS for secure, stable server addressing.
- Never expose your MASTER_SECRET in public code or client-side logic.
- You can chain these cards in a Botpress workflow for a full upload-analyze-cleanup cycle.

## Botpress Execute Code Workflow Examples

### 1. Upload File (Execute Code Card)

```javascript
async function execute() {
  const serverUrl = env.YOGA_SERVER_URL; 
  const masterSecret = env.MASTER_SECRET || 'SuperSecret2026';

  try {
    const response = await axios.post(serverUrl, {
      action: "upload", // Изрично казваме, че качваме
      url: workflow.uploadedFileUrl,
      sessionId: event.conversationId
    }, {
      headers: { 'Authorization': `Bearer ${masterSecret}` }
    });

    if (response.data && response.data.fileId) {
      workflow.fileId = response.data.fileId;
      workflow.uploadedFileUrl = null; // Чистим за паметта
    }
  } catch (err) {
    console.error("Upload Error:", err.message);
  }
}
return execute();
```

### 2. Analyze & Cleanup File (Execute Code Card)

```javascript
async function execute() {
  const serverUrl = env.YOGA_SERVER_URL; 
  const masterSecret = env.MASTER_SECRET || 'SuperSecret2026';

  try {
    const response = await axios.post(serverUrl, {
      action: "analyze", // Казваме на сървъра да анализира
      fileId: workflow.fileId,
      prompt: "Анализирай на български."
    }, {
      headers: { 'Authorization': `Bearer ${masterSecret}` },
      timeout: 30000 
    });

    workflow.finalResponse = response.data.answer;
  } catch (err) {
    // Ако тук получиш 500, виж конзолата на твоя сървър (Terminal)
    console.error("Analyze Error:", err.message);
    workflow.finalResponse = "Грешка при обработката на сървъра.";
  }
}
return execute();
```

## Troubleshooting

- Ensure Tailscale is running for network access.
- Check console logs for errors when uploading or analyzing files.
- Verify file permissions for `vault/` directories.
- Confirm the correct Bearer token is being sent in request headers.
- For large files, ensure the server has enough disk space and memory.

### Check Server Status


Verify the server is running and accessible by uploading a public domain PDF (no copyright issues):

```bash
curl -H "Authorization: Bearer SuperSecret2026" \
  -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"action":"upload","url":"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"}'
```

This will upload a small, freely available test PDF from the W3C. If successful, you will receive a JSON response with a `fileId`.

### Tailscale CLI

Use these commands to verify Tailscale connectivity:

```bash
tailscale up
tailscale ip -4
tailscale status
```

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0).

You may obtain a copy of the license at:

https://www.gnu.org/licenses/gpl-3.0.en.html

### Recommended
Enable MagicDNS in the Tailscale admin console so you can use a stable hostname instead of a raw `100.x.x.x` IP.

Example:
```env
TAILSCALE_BASE_URL=http://your-device-name.your-tailnet.ts.net:3000
```

Or if you prefer a direct address:
```env
TAILSCALE_BASE_URL=http://100.x.x.x:3000
```

Use that same base URL in Botpress snippets and in the dashboard if you access it remotely.

©GisRocket