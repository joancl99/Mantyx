import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../types/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const user: JwtPayload = ctx.switchToHttp().getRequest().user;
    return data ? user?.[data] : user;
  },
);
