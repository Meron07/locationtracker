import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type ShareStatus = 'pending' | 'active' | 'paused' | 'revoked' | 'expired';
export type ShareDuration = '15min' | '1hr' | '8hr' | 'indefinite';

/**
 * Represents a directional consent agreement to share location:
 * sharer → viewer with an optional expiry and precision level.
 *
 * A share must exist and be 'active' before any location data is stored.
 */
@Entity('location_shares')
@Index(['sharerId', 'viewerId'], { unique: true, where: `"status" != 'revoked'` })
export class LocationShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sharer_id' })
  @Index()
  sharerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sharer_id' })
  sharer: User;

  @Column({ name: 'viewer_id' })
  @Index()
  viewerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'viewer_id' })
  viewer: User;

  /**
   * 'pending'  — viewer has been invited but not yet accepted
   * 'active'   — mutual or accepted, data is being shared
   * 'paused'   — sharer has temporarily hidden their location
   * 'revoked'  — permanently ended (not deleted so audit trail is preserved)
   * 'expired'  — reached expiresAt time
   */
  @Column({ type: 'text', default: 'pending' })
  status: ShareStatus;

  /**
   * Precision level: 'exact' (~10m), 'approx' (~1km), 'city' (~10km)
   */
  @Column({ type: 'text', default: 'exact' })
  precision: 'exact' | 'approx' | 'city';

  @Column({ name: 'requested_duration', type: 'text', nullable: true })
  requestedDuration: ShareDuration | null;

  @Column({ name: 'expires_at', type: 'timestamp with time zone', nullable: true })
  expiresAt: Date | null;

  /** One-time token sent in the share request notification */
  @Column({ name: 'invite_token', nullable: true, unique: true })
  inviteToken: string | null;

  /** UTC timestamp the sharer paused sharing until (null if not paused) */
  @Column({ name: 'paused_until', type: 'timestamp with time zone', nullable: true })
  pausedUntil: Date | null;

  /** UTC timestamp when the viewer last explicitly accepted */
  @Column({ name: 'accepted_at', type: 'timestamp with time zone', nullable: true })
  acceptedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
