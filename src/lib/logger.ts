/**
 * Sistema de logging condicional basado en NODE_ENV
 * Solo muestra logs en desarrollo, silencioso en producción
 */

type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

interface LoggerConfig {
  enabledInProduction: boolean;
  enabledInDevelopment: boolean;
  prefix?: string;
}

class Logger {
  private isDevelopment: boolean;
  private config: LoggerConfig;

  constructor(config: LoggerConfig = { enabledInProduction: false, enabledInDevelopment: true }) {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.config = config;
  }

  private shouldLog(): boolean {
    return this.isDevelopment ? this.config.enabledInDevelopment : this.config.enabledInProduction;
  }

  private formatMessage(message: any, ...args: any[]): [string, ...any[]] {
    const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
    return [`${prefix} ${message}`, ...args];
  }

  log(message: any, ...args: any[]): void {
    if (this.shouldLog()) {
      console.log(...this.formatMessage(message, ...args));
    }
  }

  warn(message: any, ...args: any[]): void {
    if (this.shouldLog()) {
      console.warn(...this.formatMessage(message, ...args));
    }
  }

  error(message: any, ...args: any[]): void {
    // Los errores siempre se muestran, incluso en producción
    console.error(...this.formatMessage(message, ...args));
  }

  info(message: any, ...args: any[]): void {
    if (this.shouldLog()) {
      console.info(...this.formatMessage(message, ...args));
    }
  }

  debug(message: any, ...args: any[]): void {
    if (this.shouldLog()) {
      console.debug(...this.formatMessage(message, ...args));
    }
  }
}

// Instancia por defecto
export const logger = new Logger();

// Factory para crear loggers con configuración específica
export const createLogger = (config: LoggerConfig) => new Logger(config);

// Loggers específicos para diferentes módulos
export const apiLogger = new Logger({ 
  enabledInProduction: false, 
  enabledInDevelopment: true, 
  prefix: 'API' 
});

export const taskLogger = new Logger({ 
  enabledInProduction: false, 
  enabledInDevelopment: true, 
  prefix: 'TASK' 
});

export const uiLogger = new Logger({ 
  enabledInProduction: false, 
  enabledInDevelopment: true, 
  prefix: 'UI' 
});

export default logger;