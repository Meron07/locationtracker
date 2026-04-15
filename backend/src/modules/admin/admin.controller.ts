import {
  Controller, Get, Patch, Delete, Body, Param,
  ParseUUIDPipe, UseGuards, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { Req } from '@nestjs/common';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /** GET /v1/admin/users */
  @Get('users')
  listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    return this.adminService.listUsers(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /** PATCH /v1/admin/users/:id/ban */
  @Patch('users/:id/ban')
  ban(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('reason') reason: string,
  ) {
    return this.adminService.banUser(req.user.id, id, reason);
  }

  /** PATCH /v1/admin/users/:id/unban */
  @Patch('users/:id/unban')
  unban(@Req() req: any, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.adminService.unbanUser(req.user.id, id);
  }

  /** GET /v1/admin/stats */
  @Get('stats')
  stats() {
    return this.adminService.getStats();
  }
}
