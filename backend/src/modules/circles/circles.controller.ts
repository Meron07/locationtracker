import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  ParseUUIDPipe, UseGuards, Req, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CirclesService } from './circles.service';
import { Throttle } from '@nestjs/throttler';

@Controller('circles')
@UseGuards(JwtAuthGuard)
export class CirclesController {
  constructor(private readonly circlesService: CirclesService) {}

  // ── Circles CRUD ─────────────────────────────────────────────────────────

  /** GET /v1/circles — list circles the caller belongs to */
  @Get()
  list(@Req() req: any) {
    return this.circlesService.getUserCircles(req.user.id);
  }

  /** POST /v1/circles — create a new circle */
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  create(@Req() req: any, @Body('name') name: string, @Body('color') color?: string) {
    return this.circlesService.create(req.user.id, name, color);
  }

  /** GET /v1/circles/:id — get circle details */
  @Get(':id')
  findOne(@Req() req: any, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.circlesService.findById(id, req.user.id);
  }

  /** PATCH /v1/circles/:id — update name/color/description */
  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('name') name?: string,
    @Body('color') color?: string,
    @Body('description') description?: string,
  ) {
    return this.circlesService.update(req.user.id, id, { name, description });
  }

  /** DELETE /v1/circles/:id — disband circle (owner only) */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Req() req: any, @Param('id', new ParseUUIDPipe()) id: string) {
    await this.circlesService.disband(req.user.id, id);
  }

  // ── Members ──────────────────────────────────────────────────────────────

  /** GET /v1/circles/:id/members */
  @Get(':id/members')
  members(@Req() req: any, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.circlesService.getMembers(id, req.user.id);
  }

  /** PATCH /v1/circles/:id/members/:memberId/role */
  @Patch(':id/members/:memberId/role')
  setRole(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) circleId: string,
    @Param('memberId', new ParseUUIDPipe()) memberId: string,
    @Body('role') role: string,
  ) {
    return this.circlesService.setMemberRole(req.user.id, circleId, memberId, role);
  }

  /** DELETE /v1/circles/:id/members/:memberId — remove member */
  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) circleId: string,
    @Param('memberId', new ParseUUIDPipe()) memberId: string,
  ) {
    await this.circlesService.removeMember(circleId, memberId, req.user.id);
  }

  /** DELETE /v1/circles/:id/members/me — leave circle */
  @Delete(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leave(@Req() req: any, @Param('id', new ParseUUIDPipe()) id: string) {
    await this.circlesService.leaveCircle(id, req.user.id);
  }

  // ── Invites ──────────────────────────────────────────────────────────────

  /** POST /v1/circles/:id/invites — generate an invite link/code */
  @Post(':id/invites')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  createInvite(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) circleId: string,
    @Body('expires_in_hours') expiresInHours?: number,
    @Body('max_uses') maxUses?: number,
  ) {
    return this.circlesService.createInvite(circleId, req.user.id, expiresInHours);
  }

  /** POST /v1/circles/join — accept an invite by token */
  @Post('join')
  @Throttle({ default: { limit: 20, ttl: 300000 } })
  joinByToken(@Req() req: any, @Body('token') token: string) {
    return this.circlesService.acceptInvite(token, req.user.id);
  }

  /** GET /v1/circles/:id/invites — list active invite codes (admin/owner) */
  @Get(':id/invites')
  listInvites(@Req() req: any, @Param('id', new ParseUUIDPipe()) circleId: string) {
    return this.circlesService.listInvites(req.user.id, circleId);
  }

  /** DELETE /v1/circles/:id/invites/:inviteId — revoke invite code */
  @Delete(':id/invites/:inviteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeInvite(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) circleId: string,
    @Param('inviteId', new ParseUUIDPipe()) inviteId: string,
  ) {
    await this.circlesService.revokeInvite(req.user.id, circleId, inviteId);
  }
}
