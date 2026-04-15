import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  async listUsers(adminId: string, page = 1, limit = 50) {
    const [users, total] = await this.userRepo.findAndCount({
      select: ['id', 'email', 'displayName', 'role', 'emailVerified', 'createdAt', 'deletedAt'],
      withDeleted: true,
      skip: (page - 1) * limit,
      take: Math.min(limit, 100),
      order: { createdAt: 'DESC' },
    });

    return { data: users, total, page, limit };
  }

  async banUser(adminId: string, targetId: string, reason: string) {
    const user = await this.userRepo.findOneOrFail({ where: { id: targetId } });

    if (user.role === 'admin') {
      throw new ForbiddenException('Cannot ban another admin.');
    }

    await this.userRepo.update(targetId, { deletedAt: new Date() });

    await this.auditService.log({
      actorId: adminId,
      targetId,
      action: 'ban_user',
      resource: 'users',
      metadata: { reason },
    });
  }

  async unbanUser(adminId: string, targetId: string) {
    await this.userRepo.restore(targetId);

    await this.auditService.log({
      actorId: adminId,
      targetId,
      action: 'unban_user',
      resource: 'users',
    });
  }

  async getStats(): Promise<Record<string, number>> {
    const [totalUsers, activeUsers, bannedUsers] = await Promise.all([
      this.userRepo.count({ withDeleted: true }),
      this.userRepo.count(),
      this.userRepo.count({ where: { deletedAt: new Date() }, withDeleted: true }),
    ]);

    return { totalUsers, activeUsers, bannedUsers };
  }
}
