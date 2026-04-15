import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

/**
 * Append-only consent record.
 * Never updated or deleted — provides a full consent history for GDPR audits.
 */
@Entity('consent_logs')
@Index(['userId', 'consentType'])
export class ConsentLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  /** e.g. 'location_share', 'background_tracking', 'marketing_emails', 'data_export' */
  @Column({ name: 'consent_type', type: 'text' })
  consentType: string;

  @Column({ type: 'boolean' })
  granted: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
