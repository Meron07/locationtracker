import {
  Controller, Post, Body, Req, Res, HttpCode, HttpStatus,
  UseGuards, UnauthorizedException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { FirebaseAuthDto } from './dto/firebase-auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/v1/auth',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /auth/register — 5 per IP per 15 min */
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.register(
      dto.email, dto.password, dto.displayName,
    );
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    return { access_token: accessToken, expires_in: 900 };
  }

  /** POST /auth/login — 10 per IP per 15 min */
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.login(dto.email, dto.password);
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    return { access_token: accessToken, expires_in: 900 };
  }

  /** POST /auth/firebase — Google / Apple sign-in */
  @Throttle({ default: { limit: 20, ttl: 900000 } })
  @Post('firebase')
  @HttpCode(HttpStatus.OK)
  async firebaseAuth(@Body() dto: FirebaseAuthDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.firebaseLogin(dto.firebaseToken);
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    return { access_token: accessToken, expires_in: 900 };
  }

  /** POST /auth/refresh — httpOnly cookie, no body required */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (!raw) throw new UnauthorizedException('No refresh token');
    const { accessToken } = await this.authService.refresh(raw);
    return { access_token: accessToken, expires_in: 900 };
  }

  /** POST /auth/logout */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (raw) await this.authService.logout(raw);
    res.clearCookie(REFRESH_COOKIE, { path: '/v1/auth' });
  }

  /** POST /auth/logout-all */
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.logoutAll(req.user.id);
    res.clearCookie(REFRESH_COOKIE, { path: '/v1/auth' });
  }
}
