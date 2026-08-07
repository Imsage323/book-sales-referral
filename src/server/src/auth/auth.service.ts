import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminUsersService } from '../admin-users/admin-users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly adminUsersService: AdminUsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    username: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    const user = await this.adminUsersService.findByUsername(username);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    if (user.status !== 'active') {
      throw new UnauthorizedException('账号已禁用');
    }
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      tokenType: 'admin',
    };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
