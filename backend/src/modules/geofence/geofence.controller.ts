import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  ParseUUIDPipe, UseGuards, Req, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GeofenceService, CreateGeofenceDto } from './geofence.service';

@Controller('geofences')
@UseGuards(JwtAuthGuard)
export class GeofenceController {
  constructor(private readonly geofenceService: GeofenceService) {}

  /** GET /v1/geofences?circle_id=... */
  @Get()
  list(@Req() req: any, @Query('circle_id', new ParseUUIDPipe()) circleId: string) {
    return this.geofenceService.list(req.user.id, circleId);
  }

  /** POST /v1/geofences */
  @Post()
  create(@Req() req: any, @Body() dto: CreateGeofenceDto) {
    return this.geofenceService.create(req.user.id, dto);
  }

  /** PATCH /v1/geofences/:id */
  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { name?: string; description?: string; triggerType?: string; isActive?: boolean },
  ) {
    return this.geofenceService.update(req.user.id, id, body as any);
  }

  /** DELETE /v1/geofences/:id */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Req() req: any, @Param('id', new ParseUUIDPipe()) id: string) {
    await this.geofenceService.delete(req.user.id, id);
  }
}
