import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmergencySession } from './entities/emergency-session.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { EncryptionService } from '../encryption/encryption.service';
import { LocationGateway } from '../location/location.gateway';
import { UsersService } from '../users/users.service';
import { CirclesService } from '../circles/circles.service';

const COUNTDOWN_SECONDS = 10; // Grace period before SOS fires

@Injectable()
export class SosService {
  constructor(
    @InjectRepository(EmergencySession)
    private readonly sessionRepo: Repository<EmergencySession>,
    private readonly notificationsService: NotificationsService,
    private readonly encryptionService: EncryptionService,
    private readonly locationGateway: LocationGateway,
    private readonly usersService: UsersService,
    private readonly circlesService: CirclesService,
  ) {}

  /**
   * Start an SOS countdown. The client has COUNTDOWN_SECONDS to cancel.
   * After that, the SOS is considered fired and contacts are alerted.
   */
  async trigger(
    userId: string,
    lat?: number,
    lng?: number,
    message?: string,
  ): Promise<EmergencySession> {
    // Enforce one active SOS per user
    const existing = await this.sessionRepo.findOne({
      where: { initiatorId: userId, status: 'active' },
    });
    if (existing) {
      throw new BadRequestException('An active SOS session already exists.');
    }

    const firesAt = new Date(Date.now() + COUNTDOWN_SECONDS * 1000);

    const session = await this.sessionRepo.save(
      this.sessionRepo.create({
        initiatorId: userId,
        status: 'active',
        encLat: lat != null ? this.encryptionService.encryptCoordinate(lat) : null,
        encLng: lng != null ? this.encryptionService.encryptCoordinate(lng) : null,
        message: message ?? null,
        firesAt,
        acknowledgedBy: [],
      }),
    );

    // Broadcast countdown to all user sockets
    this.locationGateway.emitToUser(userId, 'sos:countdown', {
      session_id: session.id,
      fires_at: firesAt.toISOString(),
      countdown_seconds: COUNTDOWN_SECONDS,
    });

    // Schedule fire after countdown
    setTimeout(async () => {
      await this.fire(session.id);
    }, COUNTDOWN_SECONDS * 1000);

    return session;
  }

  /**
   * Cancel an in-progress SOS before it fires.
   */
  async cancel(userId: string, sessionId: string): Promise<EmergencySession> {
    const session = await this.sessionRepo.findOneOrFail({
      where: { id: sessionId, initiatorId: userId },
    });

    if (session.status !== 'active') {
      throw new BadRequestException('Session is no longer active.');
    }

    session.status = 'cancelled';
    session.closedAt = new Date();
    const updated = await this.sessionRepo.save(session);

    this.locationGateway.emitToUser(userId, 'sos:cancelled', {
      session_id: session.id,
    });

    return updated;
  }

  /**
   * Mark an SOS as resolved (e.g. person confirmed they are safe).
   */
  async resolve(userId: string, sessionId: string): Promise<EmergencySession> {
    const session = await this.sessionRepo.findOneOrFail({
      where: { id: sessionId, initiatorId: userId },
    });

    if (session.status !== 'active') {
      throw new BadRequestException('Session is no longer active.');
    }

    session.status = 'resolved';
    session.closedAt = new Date();
    const updated = await this.sessionRepo.save(session);

    // Notify contacts that situation is resolved
    await this.broadcastToContacts(userId, 'sos:resolved', {
      session_id: session.id,
      initiator_id: userId,
    });

    return updated;
  }

  /**
   * Contact acknowledges the SOS (so initiator sees who responded).
   */
  async acknowledge(contactId: string, sessionId: string): Promise<void> {
    const session = await this.sessionRepo.findOneOrFail({
      where: { id: sessionId, status: 'active' },
    });

    const acked = new Set(session.acknowledgedBy ?? []);
    acked.add(contactId);
    session.acknowledgedBy = Array.from(acked);
    await this.sessionRepo.save(session);

    this.locationGateway.emitToUser(session.initiatorId, 'sos:acknowledged', {
      session_id: sessionId,
      acknowledged_by: contactId,
    });
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private async fire(sessionId: string) {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session || session.status !== 'active') return; // already cancelled

    const decryptedLat = session.encLat
      ? this.encryptionService.decryptCoordinate(session.encLat)
      : null;
    const decryptedLng = session.encLng
      ? this.encryptionService.decryptCoordinate(session.encLng)
      : null;

    // Alert all circle members
    await this.broadcastToContacts(session.initiatorId, 'sos:alert', {
      session_id: session.id,
      initiator_id: session.initiatorId,
      latitude: decryptedLat,
      longitude: decryptedLng,
      message: session.message,
      triggered_at: new Date().toISOString(),
    });

    // Push notification via FCM
    await this.notificationsService.sendSosAlert(session.initiatorId, session.id, {
      lat: decryptedLat,
      lng: decryptedLng,
      message: session.message,
    });
  }

  private async broadcastToContacts(
    userId: string,
    event: string,
    data: unknown,
  ) {
    const memberships = await this.circlesService.getUserCircles(userId);
    const contactIds = new Set<string>();

    for (const membership of memberships) {
      const members = await this.circlesService.getMembers(membership.circleId, userId);
      for (const m of members) {
        if (m.userId !== userId) contactIds.add(m.userId);
      }
    }

    for (const id of contactIds) {
      this.locationGateway.emitToUser(id, event, data);
    }
  }
}
