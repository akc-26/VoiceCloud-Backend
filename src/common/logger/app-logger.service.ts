import { Injectable, LoggerService, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger implements LoggerService {
  private context = 'App';

  setContext(context: string) {
    this.context = context;
  }

  log(message: unknown, context?: string) {
    this.print('info', message, context);
  }

  error(message: unknown, trace?: string, context?: string) {
    this.print('error', message, context, trace);
  }

  warn(message: unknown, context?: string) {
    this.print('warn', message, context);
  }

  debug?(message: unknown, context?: string) {
    this.print('debug', message, context);
  }

  verbose?(message: unknown, context?: string) {
    this.print('verbose', message, context);
  }

  private print(
    level: string,
    message: unknown,
    context?: string,
    trace?: string,
  ) {
    const outputContext = context || this.context;
    let formattedMessage = '';

    if (message instanceof Error) {
      formattedMessage = message.message;
      if (!trace) {
        trace = message.stack;
      }
    } else if (typeof message === 'object' && message !== null) {
      const msgObj = message as Record<string, unknown>;
      if (typeof msgObj.message === 'string') {
        formattedMessage = msgObj.message;
      } else if (typeof msgObj.msg === 'string') {
        formattedMessage = msgObj.msg;
      } else {
        formattedMessage = JSON.stringify(message);
      }
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
