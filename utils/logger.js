const levels = {
  info: '\x1b[36m', // cyan
  success: '\x1b[32m', // green
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
};
const reset = '\x1b[0m';

const timestamp = () => new Date().toISOString();

const log = (level, message, meta) => {
  const color = levels[level] || '';
  const line = `${color}[${timestamp()}] [${level.toUpperCase()}]${reset} ${message}`;
  const consoleMethod = level === 'error' ? console.error : console.log;
  if (meta !== undefined) {
    consoleMethod(line, meta);
  } else {
    consoleMethod(line);
  }
};

module.exports = {
  info: (message, meta) => log('info', message, meta),
  success: (message, meta) => log('success', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
};
