// Error utility — standardizes API error responses
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorResponse = (statusCode: number, message: string, code?: string) => ({
  success: false,
  error: { statusCode, message, code },
});

export const successResponse = <T>(data: T, meta?: object) => ({
  success: true,
  data,
  ...(meta && { meta }),
});
