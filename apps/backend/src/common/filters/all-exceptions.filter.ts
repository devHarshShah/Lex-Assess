import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      message = res.message || exception.message;
      error = res.error || exception.name;
    } else if (exception.code === 'P2002') {
      // Prisma unique constraint violation
      status = HttpStatus.BAD_REQUEST;
      const target = exception.meta?.target || [];
      message = `Duplicate value for field: ${target.join(', ')}`;
      error = 'Bad Request';
    } else if (exception.code === 'P2025') {
      // Prisma record not found
      status = HttpStatus.NOT_FOUND;
      message = exception.meta?.cause || 'Record not found';
      error = 'Not Found';
    } else if (exception instanceof Error) {
      // Log full detail server-side, but do not leak internal error messages
      // (DB errors, stack-adjacent info) to the client.
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
      message = 'Internal server error';
      error = 'Internal Server Error';
    }

    // Standardize message to be a string
    const finalMessage = Array.isArray(message)
      ? message.join('. ')
      : message;

    response.status(status).json({
      statusCode: status,
      message: finalMessage,
      error: error,
      timestamp: new Date().toISOString(),
      path: (request as any).url,
    });
  }
}
