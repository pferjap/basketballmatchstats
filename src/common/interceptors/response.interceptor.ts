import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { map, Observable } from 'rxjs';
import { ApiSuccessResponse } from '../interfaces/api-response.interface';
import { PaginatedResult } from '../pagination/paginated-result';

@Injectable()
export class ResponseInterceptor implements NestInterceptor<
  unknown,
  ApiSuccessResponse<unknown>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<ApiSuccessResponse<unknown>> {
    const httpResponse = context.switchToHttp().getResponse<Response>();

    return next
      .handle()
      .pipe(
        map((payload) => this.toResponse(payload, httpResponse.statusCode)),
      );
  }

  private toResponse(
    payload: unknown,
    statusCode: number,
  ): ApiSuccessResponse<unknown> {
    const timestamp = new Date().toISOString();

    if (payload instanceof PaginatedResult) {
      return {
        success: true,
        statusCode,
        data: payload.data,
        meta: payload.meta,
        timestamp,
      };
    }

    return {
      success: true,
      statusCode,
      data: payload,
      timestamp,
    };
  }
}
