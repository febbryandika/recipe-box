type LogLevel = 'info' | 'warn' | 'error'
type Fields = Record<string, unknown>

function emit(level: LogLevel, msg: string, fields?: Fields): void {
  const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...fields })
  if (level === 'error') {
    process.stderr.write(line + '\n')
  } else {
    process.stdout.write(line + '\n')
  }
}

export const logger = {
  info  : (msg: string, fields?: Fields) => emit('info', msg, fields),
  warn  : (msg: string, fields?: Fields) => emit('warn', msg, fields),
  error : (msg: string, fields?: Fields) => emit('error', msg, fields),
}

// Error objects serialize to `{}` under JSON.stringify; pull out the useful bits
// so stack traces survive structured logging.
export function serializeError(err: unknown): unknown {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack }
  }
  return err
}
