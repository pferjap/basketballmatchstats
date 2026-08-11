import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiErrorDetail,
  ApiErrorResponse,
} from '../interfaces/api-response.interface';
import { DomainException } from '../exceptions/domain.exception';

interface HttpExceptionPayload {
  message?: string | string[];
  error?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const statusCode = this.resolveStatusCode(exception);
    const errors = this.resolveErrors(exception);

    const payload: ApiErrorResponse = {
      success: false,
      statusCode,
      errors,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(payload);
  }

  private resolveStatusCode(exception: unknown): number {
    if (exception instanceof DomainException) {
      return exception.statusCode;
    }

    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveErrors(exception: unknown): ApiErrorDetail[] {
    if (exception instanceof DomainException) {
      return [
        {
          code: exception.code,
          message: exception.message,
          details: null,
        },
      ];
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const payload = this.normalizePayload(response);
      const messages = Array.isArray(payload.message)
        ? payload.message
        : [payload.message ?? exception.message];

      return messages.map((message) => ({
        code: this.normalizeCode(payload.error),
        message,
        details: null,
      }));
    }

    return [
      {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
        details: null,
      },
    ];
  }

  private normalizePayload(
    response: string | object,
  ): HttpExceptionPayload & { message: string | string[] } {
    if (typeof response === 'string') {
      return {
        message: response,
      };
    }

    const payload = response as HttpExceptionPayload;
    return {
      message: payload.message ?? 'Unexpected error',
      error: payload.error,
    };
  }

  private normalizeCode(error?: string): string {
    if (!error) {
      return 'HTTP_EXCEPTION';
    }

    return error.trim().toUpperCase().replace(/\s+/g, '_');
  }
}
