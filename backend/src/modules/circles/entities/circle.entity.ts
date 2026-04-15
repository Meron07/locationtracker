import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('circles')
export class Circle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Index({ unique: true })
  @Column({ name: 'invite_code', type: 'text' })
  inviteCode: string;

  @Column({ name: 'max_members', type: 'integer', default: 10 })
  maxMembers: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('circle_memberships')
export class CircleMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'circle_id', type: 'uuid' })
  circleId: string;

  @ManyToOne(() => Circle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'circle_id' })
  circle: Circle;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text', default: 'member' })
  role: 'owner' | 'admin' | 'member' | 'guest';

  @Column({ type: 'text', default: 'pending' })
  status: 'pending' | 'active' | 'declined' | 'removed';

  @Column({ name: 'invited_by', type: 'uuid', nullable: true })
  invitedBy: string | null;

  @Index({ unique: true })
  @Column({ name: 'invite_token', type: 'text', nullable: true })
  inviteToken: string | null;

  @Column({ name: 'invite_expires', type: 'timestamptz', nullable: true })
  inviteExpires: Date | null;

  @Column({ name: 'joined_at', type: 'timestamptz', nullable: true })
  joinedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
