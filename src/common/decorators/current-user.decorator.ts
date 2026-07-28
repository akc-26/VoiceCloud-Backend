import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface UserPayload {
  userId: string;
  email?: string;
  roles?: string[];
  [key: string]: unknown;
}

interface RequestWithUser extends Request {
  user?: UserPayload;
}

export const CurrentUser = createParamDecorator(
  (data: keyof UserPayload | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user: UserPayload = request.user ?? {
      userId: '11111111-1111-1111-1111-111111111111',
      email: 'demo@voicecloud.com',
    };
    return data ? user[data] : user;
  },
);
