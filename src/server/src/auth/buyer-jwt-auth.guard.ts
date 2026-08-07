import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class BuyerJwtAuthGuard extends AuthGuard('buyer-jwt') {}
