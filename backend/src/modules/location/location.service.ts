import {
  Injectable, BadRequestException, ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { LocationShare } from './entities/location-share.entity';
import { LocationEvent } from './entities/location-event.entity';
import { UploadLocationDto } from './dto/upload-location.dto';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(LocationShare)
    private readonly shareRepo: Repository<LocationShare>,
    @InjectRepository(LocationEvent)
    private readonly eventRepo: Repository<LocationEvent>,
    private readonly encryptionService: EncryptionService,
  ) {}

  // ── Location upload ───────────────────────────────────────────────────────

  async uploadLocation(userId: string, dto: UploadLocationDto): Promise<void> {
    // Don't store if no active share exists — minimize data retention
    const hasShare = await this.shareRepo.count({
      where: { sharerId: userId, status: 'active' },
    });
    if (!hasShare) return; // Silently discard (no error — don't reveal share state)

    // Encrypt coordinates at application layer before storing
    const encryptedLat = this.encryptionService.encryptCoordinate(dto.latitude);
    const encryptedLng = this.encryptionService.encryptCoordinate(dto.longitude);

    await this.eventRepo.save(
      this.eventRepo.create({
        userId,
        encryptedLat,
        encryptedLng,
        accuracy: dto.accuracy,
        altitude: dto.altitude,
        speed: dto.speed,
        heading: dto.heading,
        batteryLevel: dto.batteryLevel,
        isCharging: dto.isCharging,
        activity: dto.activity ?? 'unknown',
        source: 'gps',
        recordedAt: new Date(dto.recordedAt),
      }),
    );
  }

  async batchUpload(userId: string, events: UploadLocationDto[]): Promise<{ accepted: number; rejected: number }> {
    let accepted = 0;
    let rejected = 0;

    for (const event of events.slice(0, 50)) { // cap at 50
      try {
        await this.uploadLocation(userId, event);
        accepted++;
      } catch {
        rejected++;
      }
    }
    return { accepted, rejected };
  }

  // ── Map feed ──────────────────────────────────────────────────────────────

  /**
   * Returns current location of all users who are actively sharing with viewerId.
   * Coordinates are rounded to ~10 meter precision before returning.
   */
  async getMapFeed(viewerId: string) {
    // Get all active shares pointing TO this viewer
    const shares = await this.shareRepo.find({
      where: { viewerId, status: 'active' },
      relations: ['sharer'],
    });

    const feed = await Promise.all(
      shares.map(async (share) => {
        const latest = await this.eventRepo.findOne({
          where: { userId: share.sharerId },
          order: { recordedAt: 'DESC' },
        });

        if (!latest) {
          return {
            user_id: share.sharerId,
            display_name: share.sharer.displayName,
            avatar_url: share.sharer.avatarUrl,
            location: null,
            share_id: share.id,
            share_expires_at: share.expiresAt,
          };
        }

        const lat = this.encryptionService.decryptCoordinate(latest.encryptedLat);
        const lng = this.encryptionService.decryptCoordinate(latest.encryptedLng);

        return {
          user_id: share.sharerId,
          display_name: share.sharer.displayName,
          avatar_url: share.sharer.avatarUrl,
          // Round to ~10m precision (5 decimal places ≈ 1.1m, 4 decimal places ≈ 11m)
          latitude: Math.round(lat * 10000) / 10000,
          longitude: Math.round(lng * 10000) / 10000,
          accuracy: latest.accuracy,
          battery_level: share.sharer.shareBatteryLevel ? latest.batteryLevel : null,
          activity: latest.activity,
          last_updated: latest.recordedAt,
          share_id: share.id,
          share_expires_at: share.expiresAt,
        };
      }),
    );

    return feed;
  }

  // ── Share management ──────────────────────────────────────────────────────

  async createShareRequest(
    sharerId: string,
    viewerId: string,
    duration: string,
    shareBattery = false,
  ): Promise<LocationShare> {
    if (sharerId === viewerId) throw new BadRequestException('Cannot share with yourself');

    const existing = await this.shareRepo.findOne({
      where: { sharerId, viewerId },
    });

    if (existing && existing.status === 'active') {
      throw new BadRequestException('Already sharing with this user');
    }

    const expiresAt = this.calculateExpiry(duration);

    const share = this.shareRepo.create({
      sharerId,
      viewerId,
      status: 'pending',
      duration,
      shareBattery,
      expiresAt,
    });

    return this.shareRepo.save(share);
  }

  async respondToShareRequest(
    shareId: string,
    viewerId: string,
    action: 'accept' | 'decline',
  ): Promise<LocationShare> {
    const share = await this.shareRepo.findOne({ where: { id: shareId, viewerId } });
    if (!share) throw new NotFoundException('Share request not found');
    if (share.status !== 'pending') throw new BadRequestException('Share is not in pending state');

    share.status = action === 'accept' ? 'active' : 'revoked';
    return this.shareRepo.save(share);
  }

  async revokeShare(shareId: string, requesterId: string): Promise<void> {
    const share = await this.shareRepo.findOne({ where: { id: shareId } });
    if (!share) throw new NotFoundException('Share not found');

    // Either party can revoke
    if (share.sharerId !== requesterId && share.viewerId !== requesterId) {
      throw new ForbiddenException('Cannot revoke this share');
    }

    share.status = 'revoked';
    await this.shareRepo.save(share);
  }

  async pauseShare(shareId: string, sharerId: string, pausedUntil: Date): Promise<LocationShare> {
    const share = await this.shareRepo.findOne({ where: { id: shareId, sharerId } });
    if (!share) throw new NotFoundException('Share not found');
    if (share.status !== 'active') throw new BadRequestException('Share is not active');

    share.status = 'paused';
    share.pausedUntil = pausedUntil;
    return this.shareRepo.save(share);
  }

  async stopAllSharing(sharerId: string): Promise<{ revokedCount: number }> {
    const result = await this.shareRepo.update(
      { sharerId, status: 'active' as any },
      { status: 'revoked' },
    );
    return { revokedCount: result.affected ?? 0 };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private calculateExpiry(duration: string): Date | null {
    const now = Date.now();
    switch (duration) {
      case '15min': return new Date(now + 15 * 60 * 1000);
      case '1hr': return new Date(now + 60 * 60 * 1000);
      case '8hr': return new Date(now + 8 * 60 * 60 * 1000);
      case 'indefinite': return null;
      default: return new Date(now + 60 * 60 * 1000);
    }
  }
}
