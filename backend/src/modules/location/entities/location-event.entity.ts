import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Immutable record of a single location data point.
 *
 * Coordinates are stored AES-256-GCM encrypted (application layer).
 * encLat / encLng contain `iv:ciphertext:tag` base64 strings.
 *
 * For geofence queries the unencrypted geom column is populated
 * only when the user has a geofence subscription on that circle —
 * privacy-minimized by default.
 */
@Entity('location_events')
@Index(['userId', 'recordedAt'])
export class LocationEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** AES-256-GCM encrypted latitude: `iv:ciphertext:tag` */
  @Column({ name: 'enc_lat', type: 'text' })
  encLat: string;

  /** AES-256-GCM encrypted longitude: `iv:ciphertext:tag` */
  @Column({ name: 'enc_lng', type: 'text' })
  encLng: string;

  /**
   * PostGIS geometry point stored in geographic coordinates (SRID 4326).
   * Populated for geofence evaluation, then removed on a rolling 24hr basis.
   * Column type requires PostGIS extension.
   */
  @Column({
    name: 'geom',
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
    select: false, // never returned in default queries
  })
  geom: string | null;

  /** GPS accuracy radius in metres */
  @Column({ type: 'float', nullable: true })
  accuracy: number | null;

  /** Device-reported altitude in metres */
  @Column({ type: 'float', nullable: true })
  altitude: number | null;

  /** Heading in degrees (0–360) */
  @Column({ type: 'float', nullable: true })
  heading: number | null;

  /** Speed in m/s */
  @Column({ type: 'float', nullable: true })
  speed: number | null;

  /** Battery level 0–100 */
  @Column({ name: 'battery_level', type: 'smallint', nullable: true })
  batteryLevel: number | null;

  /**
   * Activity type reported by device motion APIs
   * e.g. 'stationary', 'walking', 'running', 'cycling', 'driving'
   */
  @Column({ type: 'text', nullable: true })
  activity: string | null;

  /** Whether device was charging when this event was recorded */
  @Column({ name: 'is_charging', type: 'boolean', nullable: true })
  isCharging: boolean | null;

  /** Location source: 'gps' | 'network' | 'passive' | 'manual' */
  @Column({ type: 'text', default: 'gps' })
  source: string;

  /** Unix timestamp (ms) from device — used to order events correctly */
  @Column({ name: 'recorded_at', type: 'timestamp with time zone' })
  @Index()
  recordedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
