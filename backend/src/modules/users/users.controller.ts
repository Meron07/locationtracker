import {
  Controller, Get, Patch, Delete, Body, Req, HttpCode, HttpStatus,
  UseGuards, Post, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
  ) {}

  @Get('me')
  async getMe(@Req() req: any) {
    return this.usersService.findById(req.user.id);
  }

  @Patch('me')
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    const updated = await this.usersService.updateProfile(req.user.id, dto);
    await this.auditService.log({
      actorId: req.user.id,
      action: 'profile_updated',
      resource: 'user_profile',
      ipAddress: req.ip,
    });
    return updated;
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: (_req, file, cb) => {
        // Validate MIME type (file extension is not trusted)
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          return cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    const url = await this.storageService.uploadAvatar(req.user.id, file.buffer, file.mimetype);
    const updated = await this.usersService.updateAvatar(req.user.id, url);
    return { avatar_url: updated.avatarUrl };
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(
    @Req() req: any,
    @Body() body: { password?: string; reason?: string },
  ) {
    await this.auditService.log({
      actorId: req.user.id,
      action: 'account_deletion_requested',
      resource: 'user_account',
      ipAddress: req.ip,
      metadata: { reason: body.reason },
    });
    await this.usersService.requestDeletion(req.user.id);
  }

  @Get('me/consent-log')
  async getConsentLog(@Req() req: any) {
    // Delegated to privacy module / audit service
    return this.auditService.getConsentLog(req.user.id);
  }
}
