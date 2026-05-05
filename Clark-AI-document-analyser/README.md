# Clark AI Document Analyser Generator

A Node.js server for secure document upload, encryption, and analysis using AES-256 encryption for the uploaded files from my Botpress Cloud chatbot. Designed to run locally with Tailscale integration for secure access.

## Features

- **Secure File Upload**: Upload files from URLs and encrypt them using AES-256-CBC.
- **File Analysis**: Process uploaded files and clean up temporary data.
- **Encryption at Rest**: All stored files are encrypted.
- **Streaming Support**: Handles large files efficiently with streaming.
- **Tailscale Integration**: Secure access via Tailscale network.
- **Botpress Compatible**: Snippets for integration with Botpress workflows.

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

The server uses a master secret for authentication. The default is set in the code as `SuperSecret2026`. For production, change this in `server.js` or modify the code to read the secret from `.env`.

### .env file

Use a `.env` file to store local configuration and API credentials securely. Example values include:

```env
PORT=3000
TAILSCALE_BASE_URL=http://your-device-name.your-tailnet.ts.net:3000
API_AUTH_TOKEN=change-me-to-a-long-random-string
GEMINI_API_KEY=YOUR_GOOGLE_AI_STUDIO_API_KEY
GEMINI_MODEL=gemini-3-flash-lite
FILE_ENCRYPTION_KEY_HEX=put_64_hex_chars_here
RETENTION_MINUTES=60
JOB_RETENTION_MINUTES=1440
MAX_CHUNK_SIZE=10000
RETRY_LIMIT=3
OCR_LANGS=eng
WHISPER_MODEL=base
```

Important `.env` variables:

- `PORT`: the local HTTP port for the server (default `3000`).
- `TAILSCALE_BASE_URL`: your Tailscale hostname or exposed server address used by Botpress and other clients.
- `API_AUTH_TOKEN`: optional bearer token for access control. If empty, auth is disabled.
- `GEMINI_API_KEY`: Google AI Studio API key for Gemini model calls.
- `GEMINI_MODEL`: model name, e.g. `gemini-3-flash-lite` or `gemini-3.1-flash-lite`.
- `FILE_ENCRYPTION_KEY_HEX`: 64-character hex key for encrypting files at rest.
- `RETENTION_MINUTES`: how long uploaded files are kept before cleanup.
- `JOB_RETENTION_MINUTES`: how long job metadata is kept.
- `MAX_CHUNK_SIZE`: maximum token/window size for any text processing chunk.
- `RETRY_LIMIT`: number of retry attempts for transient download or processing failures.
- `OCR_LANGS`: OCR language codes for `tesseract.js` (default `eng`).
- `WHISPER_MODEL`: speech transcription model if audio transcription is used.

If you do not use `.env`, set these variables in your shell before running the server.

### AI Model Setup

This project is designed to work with Google AI Studio / Gemini for text analysis and summarization from your Botpress Cloud chatbot.

- `GEMINI_API_KEY`: your Google AI Studio API key.
- `GEMINI_MODEL`: recommended model is `gemini-3-flash-lite` for fast, lower-cost inference.

If you want analysis to happen in Botpress or another app layer, keep the local server as the encrypted upload endpoint and use Gemini from the workflow.

Example:
```env
GEMINI_API_KEY=YOUR_GOOGLE_AI_STUDIO_API_KEY
GEMINI_MODEL=gemini-3-flash-lite
```

Google AI Studio notes:
- Create or use an existing project in Google AI Studio.
- Generate an API key from the credentials section.
- Use `gemini-3-flash-lite` for lightweight, responsive text analysis.

## Running the Server

Start the server:

```bash
npm start
```

The server runs on port 3000 by default, or use `PORT` environment variable.

To expose via Tailscale:

For every OS:
```bash
tailscale funnel 3000
```


for **Windows**, if your PATH isn't working:
```bash
   & "C:\Program Files\Tailscale\tailscale.exe" funnel 3000
```
If your Tailscale is installed in another location, please change the path in the command.

## API Endpoints

### POST /

Handles upload and analyze actions. Requires `Authorization: Bearer <MASTER_SECRET>` header.

#### Upload Action

Upload a file from a URL and encrypt it.
It supports all common formats like `.pdf`; `.jpg`; `.jpeg`; `.png`; `.svg`; `.gif`; `.webp`; `.mp4`; `.docx`; `.xlsx`; `.pptx` and many others up to 500 MiB.

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

Analyze a previously uploaded file and clean up.

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
  "answer": "Analysis of ID-ABC123 is completed. System cleaned temporary data."
}
```

## Security

- Files are encrypted using AES-256-CBC with random keys and IVs.
- Keys are stored separately in the `vault/keys` directory and are visible only to the server and the host system.
- Authentication via Bearer token.
- Temporary files are cleaned up after analysis.
- Your files cannot be read without the corresponding keys, ensuring data privacy.

## Directory Structure

- `vault/files/`: Encrypted files.
- `vault/keys/`: Encryption keys in JSON format.

The server code automatically creates `vault`, `vault/files`, and `vault/keys` if they do not already exist.

## Botpress Integration

For Botpress workflows, use the provided snippets in the `botpress/` directory. The server can be accessed via Tailscale IP or MagicDNS name.

Options for Botpress:
1. Self-host Botpress inside Tailscale.
2. Run the Botpress workflow from a host that can reach your laptop.
3. Use a small public HTTPS bridge if needed.

The following Execute Code cards use `env.YOGA_SERVER_URL` as the remote server URL and `env.MASTER_SECRET` for authorization.

- `env.YOGA_SERVER_URL` should be set to your Tailscale hostname or the public/exposed server address.
- In Botpress, define it as a workflow or environment variable and use it inside the Execute Code card.

Example value:
```env
YOGA_SERVER_URL=https://your-device-name.your-tailnet.ts.net:3000
```

### Execute Code #1 — Upload File
```javascript
async function execute() {
  const serverUrl = env.YOGA_SERVER_URL;
  const masterSecret = env.MASTER_SECRET || 'SuperSecret2026';

  try {
    const response = await axios.post(serverUrl, {
      action: "upload",
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

### Execute Code #2 — Analyze File
```javascript
async function execute() {
  const serverUrl = env.YOGA_SERVER_URL;
  const masterSecret = env.MASTER_SECRET || 'SuperSecret2026';

  try {
    const response = await axios.post(serverUrl, {
      action: "analyze",
      fileId: workflow.fileId
    }, {
      headers: { 'Authorization': `Bearer ${masterSecret}` },
      timeout: 30000
    });

    workflow.finalResponse = response.data.answer;
  } catch (err) {
    console.error("Analyze Error:", err.message);
    workflow.finalResponse = "Грешка при обработката на сървъра.";
  }
}
return execute();
```

## Troubleshooting

- Ensure Tailscale is running for network access.
- Check logs for errors.
- Verify file permissions for `vault/` directories.

### Tailscale CLI
Use these commands to verify connectivity and the Tailscale state:
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
