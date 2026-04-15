import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationShare } from '../location/entities/location-share.entity';
import { LocationEvent } from '../location/entities/location-event.entity';
import { AuditService } from '../audit/audit.service';

export interface PrivacyDashboard {
  active_shares: Array<{
    id: string;
    viewer_id: string;
    precision: string;
    expires_at: string | null;
    created_at: string;
  }>;
  viewers_of_me: Array<{
    id: string;
    sharer_id: string;
    precision: string;
    expires_at: string | null;
    created_at: string;
  }>;
}

@Injectable()
export class PrivacyService {
  constructor(
    @InjectRepository(LocationShare)
    private readonly shareRepo: Repository<LocationShare>,
    @InjectRepository(LocationEvent)
    private readonly eventRepo: Repository<LocationEvent>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Return a full picture of who can see the user and who the user can see.
   */
  async getDashboard(userId: string): Promise<PrivacyDashboard> {
    const [sharesISeeOthers, sharesOthersSeeMe] = await Promise.all([
      this.shareRepo.find({
        where: { viewerId: userId, status: 'active' },
        order: { createdAt: 'DESC' },
      }),
      this.shareRepo.find({
        where: { sharerId: userId, status: 'active' },
        order: { createdAt: 'DESC' },
      }),
    ]);

    return {
      active_shares: sharesOthersSeeMe.map((s) => ({
        id: s.id,
        viewer_id: s.viewerId,
        precision: s.precision,
        expires_at: s.expiresAt?.toISOString() ?? null,
        created_at: s.createdAt.toISOString(),
      })),
      viewers_of_me: sharesISeeOthers.map((s) => ({
        id: s.id,
        sharer_id: s.sharerId,
        precision: s.precision,
        expires_at: s.expiresAt?.toISOString() ?? null,
        created_at: s.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Stop ALL outbound sharing immediately ("ghost mode").
   * This is a panic action — more aggressive than individual revoke.
   */
  async stopAllSharing(userId: string, ipAddress?: string) {
    await this.shareRepo
      .createQueryBuilder()
      .update()
      .set({ status: 'revoked' })
      .where('sharer_id = :userId AND status IN (:...active)', {
        userId,
        active: ['active', 'pending', 'paused'],
      })
      .execute();

    await this.auditService.log({
      actorId: userId,
      action: 'stop_all_sharing',
      resource: 'location_shares',
      ipAddress,
    });
  }

  /**
   * Hard-delete raw location events older than 24 hours for a user.
   * The user can call this on demand from the Privacy Dashboard.
   */
  async deleteLocationHistory(userId: string, olderThanHours = 24) {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    await this.eventRepo
      .createQueryBuilder()
      .delete()
      .where('user_id = :userId AND recorded_at < :cutoff', { userId, cutoff })
      .execute();

    await this.auditService.log({
      actorId: userId,
      action: 'delete_location_history',
      resource: 'location_events',
      metadata: { older_than_hours: olderThanHours },
    });
  }

  /**
   * Update the precision level for a specific share.
   * Only the sharer can change their own precision.
   */
  async updateSharePrecision(
    userId: string,
    shareId: string,
    precision: 'exact' | 'approx' | 'city',
  ) {
    const share = await this.shareRepo.findOneOrFail({ where: { id: shareId } });

    if (share.sharerId !== userId) {
      throw new ForbiddenException('Only the sharer can change precision.');
    }

    share.precision = precision;
    return this.shareRepo.save(share);
  }

  /**
   * Return the user's consent log (GDPR Article 15 — right of access).
   */
  async getConsentLog(userId: string) {
    return this.auditService.getConsentLog(userId);
  }
}
