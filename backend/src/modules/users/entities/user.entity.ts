import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  email: string;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'text', nullable: true })
  phone: string | null;

  @Column({ name: 'phone_verified', type: 'boolean', default: false })
  phoneVerified: boolean;

  @Column({ name: 'display_name', type: 'text' })
  displayName: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'status_message', type: 'text', nullable: true })
  statusMessage: string | null;

  @Index({ unique: true })
  @Column({ name: 'firebase_uid', type: 'text', nullable: true })
  firebaseUid: string | null;

  /** bcrypt hash — null for OAuth-only accounts */
  @Column({ name: 'password_hash', type: 'text', nullable: true, select: false })
  passwordHash: string | null;

  @Column({ type: 'text', default: 'user' })
  role: 'user' | 'admin' | 'support';

  @Column({ name: 'show_last_seen', type: 'boolean', default: true })
  showLastSeen: boolean;

  @Column({ name: 'share_battery_level', type: 'boolean', default: false })
  shareBatteryLevel: boolean;

  @Column({ name: 'allow_search_by_email', type: 'boolean', default: true })
  allowSearchByEmail: boolean;

  @Column({ name: 'emergency_contact_id', type: 'uuid', nullable: true })
  emergencyContactId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'emergency_contact_id' })
  emergencyContact?: User;

  @Column({ name: 'emergency_message', type: 'text', default: 'I need help. Here is my location.' })
  emergencyMessage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
