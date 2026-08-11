export interface ApiMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  statusCode: number;
  data: T;
  meta?: ApiMeta;
  timestamp: string;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details: unknown;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  errors: ApiErrorDetail[];
  timestamp: string;
}
