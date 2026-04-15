import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type SosStatus = 'active' | 'resolved' | 'cancelled';

@Entity('emergency_sessions')
export class EmergencySession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'initiator_id' })
  @Index()
  initiatorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'initiator_id' })
  initiator: User;

  @Column({ type: 'text', default: 'active' })
  status: SosStatus;

  /** Lat/lng at the moment SOS was triggered (stored encrypted) */
  @Column({ name: 'enc_lat', type: 'text', nullable: true })
  encLat: string | null;

  @Column({ name: 'enc_lng', type: 'text', nullable: true })
  encLng: string | null;

  /** Optional voice/text message included with the SOS */
  @Column({ type: 'text', nullable: true })
  message: string | null;

  /** Timestamp when countdown expires and SOS fires (for countdown-to-cancel UX) */
  @Column({ name: 'fires_at', type: 'timestamp with time zone', nullable: true })
  firesAt: Date | null;

  /** Timestamp when session was resolved or cancelled */
  @Column({ name: 'closed_at', type: 'timestamp with time zone', nullable: true })
  closedAt: Date | null;

  /** User IDs of people who acknowledged the SOS (stored as text array) */
  @Column({ name: 'acknowledged_by', type: 'simple-array', nullable: true })
  acknowledgedBy: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
