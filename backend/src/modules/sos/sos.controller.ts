import {
  Controller, Post, Patch, Body, Param, ParseUUIDPipe,
  UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SosService } from './sos.service';
import { Throttle } from '@nestjs/throttler';

@Controller('sos')
@UseGuards(JwtAuthGuard)
export class SosController {
  constructor(private readonly sosService: SosService) {}

  /**
   * POST /v1/sos/trigger
   * Start a 10-second countdown SOS. Contacts are not alerted until
   * firesAt elapses, giving the user a chance to cancel.
   */
  @Post('trigger')
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 per 5 min (anti-spam)
  trigger(
    @Req() req: any,
    @Body('latitude') latitude?: number,
    @Body('longitude') longitude?: number,
    @Body('message') message?: string,
  ) {
    return this.sosService.trigger(req.user.id, latitude, longitude, message);
  }

  /**
   * PATCH /v1/sos/:sessionId/cancel
   * Cancel before countdown expires. Must be called by the initiator.
   */
  @Patch(':sessionId/cancel')
  cancel(@Req() req: any, @Param('sessionId', new ParseUUIDPipe()) sessionId: string) {
    return this.sosService.cancel(req.user.id, sessionId);
  }

  /**
   * PATCH /v1/sos/:sessionId/resolve
   * Mark resolved after the person is confirmed safe.
   */
  @Patch(':sessionId/resolve')
  resolve(@Req() req: any, @Param('sessionId', new ParseUUIDPipe()) sessionId: string) {
    return this.sosService.resolve(req.user.id, sessionId);
  }

  /**
   * POST /v1/sos/:sessionId/acknowledge
   * Contact acknowledges they've seen the SOS.
   */
  @Post(':sessionId/acknowledge')
  @HttpCode(HttpStatus.NO_CONTENT)
  async acknowledge(
    @Req() req: any,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
  ) {
    await this.sosService.acknowledge(req.user.id, sessionId);
  }
}
