import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppLogger } from './common/logger/app-logger.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  // 1. Create NestJS Application with our custom structured logger
  const appLogger = new AppLogger();
  appLogger.setContext('Bootstrap');
  
  const app = await NestFactory.create(AppModule, {
    logger: appLogger,
  });

  // 2. Enable CORS Support
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 3. Set API Global Prefix (v1)
  app.setGlobalPrefix('api/v1');

  // 4. Register Global Pipes, Interceptors & Exception Filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const requestLogger = await app.resolve(AppLogger);
  app.useGlobalInterceptors(new LoggingInterceptor(requestLogger));
  app.useGlobalFilters(new HttpExceptionFilter(requestLogger));

  // 5. Configure Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('VoiceCloud Monolith API')
    .setDescription('VoiceCloud Phase 1A - Core Backend Foundation specifications & health diagnostics.')
    .setVersion('1.0.0')
    .addTag('Health Check', 'Service liveness and connection status metrics')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 6. Load server configurations and listen
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  appLogger.log(`Starting VoiceCloud NestJS Backend Foundation on 0.0.0.0:${port}...`);
  await app.listen(port, '0.0.0.0');
  appLogger.log(`VoiceCloud API is live! Access health checks at http://localhost:${port}/api/v1/health`);
  appLogger.log(`Swagger Documentation is available at http://localhost:${port}/api/docs`);
}

bootstrap();
