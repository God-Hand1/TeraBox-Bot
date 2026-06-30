export const TERABOX_DOMAINS = [
  'terabox.com',
  'www.terabox.com',
  '1024tera.com',
  'www.1024tera.com',
  'teraboxapp.com',
  'www.teraboxapp.com',
  'dummybox.com',
  'www.dummybox.com',
  'freeterabox.com',
  'www.freeterabox.com',
  'momerybox.com',
  'www.momerybox.com',
  'teraboxlink.com',
  'www.teraboxlink.com',
]

export const SHARE_PATH_PATTERNS = [
  '/sharing/link',
  '/s/',
  '/share/link',
  '/share',
]

export const MESSAGES = {
  welcome: (
    botUsername,
  ) => `👋 *Welcome to TeraBox Downloader Bot\\!*

I can download public files from TeraBox and send them to you\\. Just send me a TeraBox sharing link to get started\\.`,
  help: `📖 *How to Use*

1\\. Send me a public TeraBox sharing link
2\\. I will extract the file information
3\\. Confirm the download
4\\. I will download and send the file to you

*Supported Domains:*
\\- \`terabox\\.com\`
\\- \`1024tera\\.com\`
\\- \`teraboxapp\\.com\`
\\- And other TeraBox domains

*Limits:*
\\- Max file size: 2GB
\\- Max concurrent downloads: 2
\\- Queue size: 10 files

*Commands:*
/start \\- Welcome message
/help \\- This help message
/ping \\- Check bot status
/about \\- About this bot`,
  about: (uptime) => `🤖 *TeraBox Downloader Bot*

*Version:* 1\\.0\\.0
*Runtime:* Node\\.js 22
*Library:* Grammy
*Uptime:* ${uptime}

Built for enterprise\\-grade file downloading from TeraBox\\.`,
  ping: '✅ *Pong\\!* Bot is running',
  adminOnly: '⛔ *Access Denied*\n\nThis command is restricted to administrators only\\.',
  invalidUrl: '❌ *Invalid URL*\n\nPlease send a valid public TeraBox sharing link\\.\n\nExample: \`https://www\\.terabox\\.com/s/abc123\\.\\.\\.\`',
  unsupportedDomain: '❌ *Unsupported Domain*\n\nThe link you provided is not a supported TeraBox domain\\.',
  privateLink: '❌ *Private Link*\n\nThis appears to be a private TeraBox link\\. I can only download public shared files\\.',
  emptyMessage: '⚠️ *Empty Message*\n\nPlease send a TeraBox sharing link\\.',
  extracting: '🔍 *Extracting file information\\.\\.\\.*',
  downloadStarted: '⬇️ *Download started*\n\nI will notify you when the file is ready\\.',
  fileTooLarge: '❌ *File too large*\n\nMaximum file size is 2GB\\.',
  queueFull: '❌ *Queue is full*\n\nPlease wait for current downloads to complete\\.',
  maintenanceMode: '🔧 *Bot is under maintenance*\n\nPlease try again later\\.',
  cancelled: '🚫 *Cancelled*',
}

export const CALLBACK_ACTIONS = {
  CONFIRM_DOWNLOAD: 'confirm_download',
  CANCEL_DOWNLOAD: 'cancel_download',
  RETRY_DOWNLOAD: 'retry_download',
  ADMIN_STATS: 'admin_stats',
}

export const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.avi', '.mkv', '.mov', '.webm', '.flv', '.wmv', '.m4v',
])

export const AUDIO_EXTENSIONS = new Set([
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.opus',
])

export const PHOTO_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
])

export const MAX_CAPTION_LENGTH = 1024

export const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

export const RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 10,
}

export const HEALTH_CHECK_PORT = 7860

export const MAX_RETRIES = 3

export const RETRY_DELAY_MS = 2000
