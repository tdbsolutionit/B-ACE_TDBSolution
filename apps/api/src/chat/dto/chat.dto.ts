import { IsArray, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  roomId!: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsIn(['text', 'file', 'system'])
  type?: 'text' | 'file' | 'system';

  @IsOptional()
  @IsString()
  replyToId?: string;

  @IsOptional()
  @IsArray()
  attachments?: Array<{ name: string; url: string; mimeType: string; size: number }>;
}

export class EditMessageDto {
  @IsString()
  @MinLength(1)
  content!: string;
}

export class ReactDto {
  @IsString()
  emoji!: string;
}

export class CreateRoomDto {
  @IsIn(['dm', 'deal', 'customer'])
  type!: 'dm' | 'deal' | 'customer';

  @IsString()
  refId!: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class TypingDto {
  @IsString()
  roomId!: string;
}