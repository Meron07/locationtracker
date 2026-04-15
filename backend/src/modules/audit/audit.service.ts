import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { ConsentLog } from './entities/consent-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(ConsentLog)
    private readonly consentRepo: Repository<ConsentLog>,
  ) {}

  /**
   * Write an immutable audit record.
   * Fire-and-forget: errors are logged but never thrown to callers.
   */
  async log(params: {
    actorId: string | null;
    targetId?: string | null;
    action: string;
    resource: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      await this.auditRepo.save(
        this.auditRepo.create({
          actorId: params.actorId,
          targetId: params.targetId ?? null,
          action: params.action,
          resource: params.resource,
          metadata: params.metadata ?? null,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
        }),
      );
    } catch (err) {
      console.error('[AuditService] Failed to write audit log:', err);
    }
  }

  /**
   * Record a consent decision for GDPR / data-minimization compliance.
   * Consent logs are append-only: never updated or deleted.
   */
  async recordConsent(params: {
    userId: string;
    consentType: string;
    granted: boolean;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }) {
    try {
      await this.consentRepo.save(
        this.consentRepo.create({
          userId: params.userId,
          consentType: params.consentType,
          granted: params.granted,
          metadata: params.metadata ?? null,
          ipAddress: params.ipAddress ?? null,
        }),
      );
    } catch (err) {
      console.error('[AuditService] Failed to write consent log:', err);
    }
  }

  async getConsentLog(userId: string) {
    return this.consentRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }
}
