import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseUUIDPipe, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LocationService } from './location.service';
import { UploadLocationDto } from './dto/upload-location.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('location')
@UseGuards(JwtAuthGuard)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  // ── Upload ───────────────────────────────────────────────────────────────

  /**
   * POST /v1/location/upload
   * Clients should call this from background location tasks.
   * Throttle: 120 req/min (one every 30s for normal use, bursts allowed).
   */
  @Post('upload')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async upload(@Req() req: any, @Body() dto: UploadLocationDto) {
    await this.locationService.uploadLocation(req.user.id, dto);
  }

  // ── Map feed ─────────────────────────────────────────────────────────────

  /**
   * GET /v1/location/feed?circle_id=...
   * Returns the latest known location for every member the caller is
   * authorised to see, optionally filtered to a specific circle.
   */
  @Get('feed')
  async feed(@Req() req: any, @Query('circle_id') circleId?: string) {
    return this.locationService.getMapFeed(req.user.id, circleId);
  }

  // ── Share management ─────────────────────────────────────────────────────

  /**
   * POST /v1/location/shares
   * Send a share request to another user.
   */
  @Post('shares')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createShare(
    @Req() req: any,
    @Body('viewer_id', new ParseUUIDPipe()) viewerId: string,
    @Body('duration') duration?: string,
    @Body('precision') precision?: string,
  ) {
    return this.locationService.createShareRequest(
      req.user.id,
      viewerId,
      duration,
      precision,
    );
  }

  /**
   * PATCH /v1/location/shares/:shareId/respond
   * Accept or decline a share-request received from another user.
   */
  @Patch('shares/:shareId/respond')
  async respond(
    @Req() req: any,
    @Param('shareId', new ParseUUIDPipe()) shareId: string,
    @Body('accept') accept: boolean,
  ) {
    return this.locationService.respondToShareRequest(req.user.id, shareId, accept);
  }


  /**
   * PATCH /v1/location/shares/:shareId/pause
   * Temporarily hide location from viewer without revoking consent.
   */
  @Patch('shares/:shareId/pause')
  async pause(
    @Req() req: any,
    @Param('shareId', new ParseUUIDPipe()) shareId: string,
  ) {
    return this.locationService.pauseShare(req.user.id, shareId);
  }

  /**
   * PATCH /v1/location/shares/:shareId/resume
   * Resume location sharing after a pause.
   */
  @Patch('shares/:shareId/resume')
  async resume(
    @Req() req: any,
    @Param('shareId', new ParseUUIDPipe()) shareId: string,
  ) {
    return this.locationService.resumeShare(req.user.id, shareId);
  }


  /**
   * DELETE /v1/location/shares/:shareId
   * Permanently revoke a share (either party can revoke).
   */
  @Delete('shares/:shareId')
  async revoke(
    @Req() req: any,
    @Param('shareId', new ParseUUIDPipe()) shareId: string,
  ) {
    return this.locationService.revokeShare(shareId, req.user.id);
  }

  /**
   * DELETE /v1/location/shares
   * Emergency: stop sharing with everyone immediately (panic button).
   */
  @Delete('shares')
  @HttpCode(HttpStatus.NO_CONTENT)
  async stopAll(@Req() req: any) {
    await this.locationService.stopAllSharing(req.user.id);
  }

  // ── History ──────────────────────────────────────────────────────────────

  /**
   * GET /v1/location/history/:userId
   * Return a breadcrumb trail for a user the caller is authorised to see.
   */
  @Get('history/:userId')
  async history(
    @Req() req: any,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.locationService.getHistory(req.user.id, userId, from, to);
  }
}
