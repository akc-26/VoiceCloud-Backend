import { Injectable, LoggerService, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger implements LoggerService {
  private context = 'App';

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    this.print('info', message, context);
  }

  error(message: any, trace?: string, context?: string) {
    this.print('error', message, context, trace);
  }

  warn(message: any, context?: string) {
    this.print('warn', message, context);
  }

  debug?(message: any, context?: string) {
    this.print('debug', message, context);
  }

  verbose?(message: any, context?: string) {
    this.print('verbose', message, context);
  }

  private print(level: string, message: any, context?: string, trace?: string) {
    const outputContext = context || this.context;
    let formattedMessage = message;
    
    if (message instanceof Error) {
      formattedMessage = message.message;
      if (!trace) {
        trace = message.stack;
      }
    } else if (typeof message === 'object' && message !== null) {
      formattedMessage = message.message || message.msg || (message.constructor && message.constructor.name === 'Error' ? message.message : JSON.stringify(message));
    } else {
      formattedMessage = String(message);
    }

    const logData = {
      timestamp: new Date().toISOString(),
      level,
      context: outputContext,
      message: formattedMessage,
      ...(trace && { trace }),
    };
    console.log(JSON.stringify(logData));
  }
}
