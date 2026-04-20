import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GooglePerfilValidado } from './strategies/google.strategy';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  logout() {
    return this.authService.logout();
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin(): void {
    // Passport redirige automáticamente al consent screen de Google.
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const base = this.baseCorsOrigin();
    try {
      const perfil = req.user as GooglePerfilValidado | undefined;
      if (!perfil) {
        res.redirect(302, `${base}/login?error=google_desactivado`);
        return;
      }
      const tokens = await this.authService.loginConGoogle(perfil);
      // NOTA: los tokens viajan por query string durante el redirect.
      // Va sobre HTTPS y el frontend los guarda inmediatamente, pero en una
      // v2 conviene usar un "code exchange" POST para evitar el token en URL.
      const params = new URLSearchParams({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
      res.redirect(302, `${base}/auth/google/callback?${params.toString()}`);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : String(err);
      const estado =
        err && typeof err === 'object' && 'status' in err
          ? (err as { status?: number }).status
          : undefined;
      if (estado === HttpStatus.FORBIDDEN) {
        res.redirect(302, `${base}/login?error=google_no_autorizado`);
        return;
      }
      this.logger.warn(`Error en callback de Google: ${mensaje}`);
      res.redirect(302, `${base}/login?error=google_desactivado`);
    }
  }

  private baseCorsOrigin(): string {
    const corsOrigin = this.configService.get<string>('CORS_ORIGIN') ?? '';
    const base = corsOrigin.split(',')[0]?.trim();
    return base && base !== '*' ? base : '';
  }
}
