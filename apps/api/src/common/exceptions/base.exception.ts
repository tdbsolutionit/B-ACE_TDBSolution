import { HttpException, HttpStatus } from '@nestjs/common';

export class BaseBusinessException extends HttpException {
  public readonly errorCode: string;

  constructor(message: string, errorCode: string, status: HttpStatus) {
    super({ message, errorCode }, status);
    this.errorCode = errorCode;
  }
}