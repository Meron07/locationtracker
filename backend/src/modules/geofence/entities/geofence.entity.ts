import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Circle } from '../../circles/entities/circle.entity';

export type GeofenceShape = 'circle' | 'polygon';
export type TriggerType = 'enter' | 'exit' | 'both';

@Entity('geofences')
@Index(['circleId', 'createdBy'])
export class Geofence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', default: 'circle' })
  shape: GeofenceShape;

  /**
   * For shape='circle': { center: { lat, lng }, radius_meters: number }
   * For shape='polygon': { coordinates: [{ lat, lng }, ...] }
   *
   * NOTE: This stores the fence definition for display purposes.
   * Actual geospatial checks use the PostGIS `geom` column below.
   */
  @Column({ type: 'jsonb' })
  definition: Record<string, unknown>;

  /**
   * PostGIS geometry for spatial queries (ST_DWithin, ST_Within).
   * Populated from `definition` by geofence.service.ts on create/update.
   */
  @Column({
    name: 'geom',
    type: 'geometry',
    srid: 4326,
    nullable: true,
    select: false,
  })
  geom: string | null;

  @Column({ name: 'trigger_type', type: 'text', default: 'both' })
  triggerType: TriggerType;

  /** When false the geofence still exists but alerts are silenced */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'circle_id' })
  @Index()
  circleId: string;

  @ManyToOne(() => Circle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'circle_id' })
  circle: Circle;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
