import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { ResponseInterceptor } from '../interceptors/response.interceptor';

export function configureHttpPipeline(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const corsOrigins = parseCorsOrigins(
    configService.getOrThrow<string>('CORS_ORIGINS'),
  );

  app.use(helmet());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
}

function parseCorsOrigins(originsRaw: string): string[] {
  return originsRaw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
