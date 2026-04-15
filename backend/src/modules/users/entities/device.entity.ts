import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** FCM token (encrypted in storage) */
  @Index({ unique: true })
  @Column({ name: 'device_token', type: 'text' })
  deviceToken: string;

  @Column({ type: 'text' })
  platform: 'ios' | 'android';

  @Column({ name: 'app_version', type: 'text' })
  appVersion: string;

  @Column({ name: 'os_version', type: 'text', nullable: true })
  osVersion: string | null;

  @Column({ name: 'device_model', type: 'text', nullable: true })
  deviceModel: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_active_at', type: 'timestamptz', default: () => 'NOW()' })
  lastActiveAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
