import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  ParseUUIDPipe, UseGuards, Req, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrivacyService } from './privacy.service';

@Controller('privacy')
@UseGuards(JwtAuthGuard)
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  /**
   * GET /v1/privacy/dashboard
   * Returns who can see the caller and who the caller can see.
   * Used by the Privacy Dashboard screen.
   */
  @Get('dashboard')
  dashboard(@Req() req: any) {
    return this.privacyService.getDashboard(req.user.id);
  }

  /**
   * DELETE /v1/privacy/shares
   * Emergency ghost mode: immediately revoke ALL outbound shares.
   */
  @Delete('shares')
  @HttpCode(HttpStatus.NO_CONTENT)
  async stopAll(@Req() req: any) {
    const ip = req.ip ?? req.connection?.remoteAddress;
    await this.privacyService.stopAllSharing(req.user.id, ip);
  }

  /**
   * DELETE /v1/privacy/history
   * Delete raw location history. Optional ?older_than_hours=24 query param.
   */
  @Delete('history')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteHistory(@Req() req: any, @Query('older_than_hours') hours?: string) {
    await this.privacyService.deleteLocationHistory(
      req.user.id,
      hours ? parseInt(hours, 10) : 24,
    );
  }

  /**
   * PATCH /v1/privacy/shares/:shareId/precision
   * Change precision level for a specific outbound share.
   */
  @Patch('shares/:shareId/precision')
  updatePrecision(
    @Req() req: any,
    @Param('shareId', new ParseUUIDPipe()) shareId: string,
    @Body('precision') precision: 'exact' | 'approx' | 'city',
  ) {
    return this.privacyService.updateSharePrecision(req.user.id, shareId, precision);
  }

  /**
   * GET /v1/privacy/consent-log
   * Return full consent history (GDPR right of access).
   */
  @Get('consent-log')
  consentLog(@Req() req: any) {
    return this.privacyService.getConsentLog(req.user.id);
  }
}
