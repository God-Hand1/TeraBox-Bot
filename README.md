# TeraBox Downloader Telegram Bot

Enterprise-grade Telegram bot for downloading files from public TeraBox sharing links.

## Features

- Download files from TeraBox public sharing links
- Automatic file type detection (video, audio, photo, document)
- Download progress tracking
- Concurrent download queue
- Retry mechanism for failed downloads
- Inline keyboard controls
- Admin commands for monitoring
- Rate limiting
- Structured logging
- Graceful shutdown
- Docker-optimized for Hugging Face Spaces

## Architecture

```
src/
├── config/       - Environment configuration and validation
├── logger/       - Pino structured logging
├── constants/    - Application constants and messages
├── utils/        - Validation, sanitization, formatting utilities
├── services/     - Business logic (TeraBox, Downloader, Uploader, Queue)
├── middleware/    - Bot middleware (logging, rate limiting, error handling, auth)
├── bot/          - Telegram bot commands, admin commands, handlers
└── index.js      - Entry point, health server, graceful shutdown
```

## Prerequisites

- Node.js 22 LTS or later
- npm
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

## Installation

### Local Development

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd terabox-downloader-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. Start the bot:
   ```bash
   npm start
   ```

### Docker

```bash
docker build -t terabox-bot .
docker run -d \
  --name terabox-bot \
  -e BOT_TOKEN=your_token_here \
  -e ADMIN_ID=your_user_id \
  terabox-bot
```

### Hugging Face Docker Space

1. Create a new Docker Space on Hugging Face
2. Set the following Secrets in your Space settings:
   - `BOT_TOKEN`: Your Telegram bot token
   - `ADMIN_ID`: Your Telegram user ID
3. Push the code to your Space repository
4. The Space will automatically build and deploy

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BOT_TOKEN` | Yes | - | Telegram bot token from @BotFather |
| `ADMIN_ID` | No | - | Telegram user ID for admin commands |
| `MAX_CONCURRENT_DOWNLOADS` | No | `2` | Maximum concurrent downloads |
| `MAX_FILE_SIZE` | No | `2097152000` | Maximum file size in bytes (2GB) |
| `DOWNLOAD_TIMEOUT` | No | `600000` | Download timeout in milliseconds |
| `QUEUE_CONCURRENCY` | No | `1` | Number of concurrent queue workers |
| `QUEUE_MAX_SIZE` | No | `10` | Maximum queue size |
| `DOWNLOAD_DIRECTORY` | No | `/tmp/terabox-downloads` | Temporary download directory |
| `LOG_LEVEL` | No | `info` | Pino log level (trace, debug, info, warn, error, fatal) |
| `PORT` | No | `7860` | Health check server port |
| `TERABOX_USER_AGENT` | No | - | Custom User-Agent for TeraBox requests |

## Commands

### User Commands

- `/start` - Welcome message
- `/help` - Usage instructions
- `/ping` - Check bot responsiveness
- `/about` - Bot information

### Admin Commands

- `/stats` - Queue and resource statistics
- `/uptime` - Bot uptime
- `/memory` - Memory and CPU usage
- `/active` - List active downloads
- `/maintenance` - Toggle maintenance mode
- `/broadcast` - Send message to users (requires user database)

## Security

- All user input is validated and sanitized
- Filenames are sanitized against path traversal attacks
- File size limits prevent resource exhaustion
- Rate limiting prevents abuse
- Admin commands are restricted by Telegram user ID
- No sensitive information is logged
- Temporary files are automatically cleaned up

## Deployment

### Hugging Face Docker Space Requirements

- The bot runs as a long-running process
- A health check endpoint is available on port 7860
- Temporary files are stored in `/tmp`
- Graceful shutdown handles SIGTERM for container restarts
- No persistent storage is required
- The bot uses polling (not webhooks) to avoid needing a public URL

## Development

```bash
npm start        # Production mode
npm run start:dev  # Development mode with file watching
```

## License

MIT
