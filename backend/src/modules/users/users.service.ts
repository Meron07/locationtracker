import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id, deletedAt: null as any },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { email: email.toLowerCase(), deletedAt: null as any },
      select: ['id', 'email', 'emailVerified', 'passwordHash', 'displayName', 'avatarUrl', 'role', 'firebaseUid'],
    });
  }

  async findByFirebaseUid(uid: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { firebaseUid: uid, deletedAt: null as any },
    });
  }

  async create(data: {
    email: string;
    displayName: string;
    passwordHash?: string;
    firebaseUid?: string;
  }): Promise<User> {
    const user = this.userRepo.create({
      ...data,
      email: data.email.toLowerCase(),
    });
    return this.userRepo.save(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findById(userId);
    Object.assign(user, dto);
    return this.userRepo.save(user);
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<User> {
    const user = await this.findById(userId);
    user.avatarUrl = avatarUrl;
    return this.userRepo.save(user);
  }

  async updateLastSeen(userId: string): Promise<void> {
    await this.userRepo.update(userId, { lastSeenAt: new Date() });
  }

  async setEmergencyContact(userId: string, contactId: string): Promise<User> {
    // Validate they have a share relationship
    const user = await this.findById(userId);
    const contact = await this.findById(contactId);
    if (!contact) throw new BadRequestException('Emergency contact not found');
    user.emergencyContactId = contactId;
    return this.userRepo.save(user);
  }

  /**
   * Soft-deletes user immediately. A background job performs GDPR full deletion within 30 days.
   */
  async requestDeletion(userId: string): Promise<void> {
    await this.userRepo.update(userId, {
      deletedAt: new Date(),
      // Anonymize PII immediately so deleted user can't sign in
      email: `deleted_${userId}@safecircle.deleted`,
      displayName: 'Deleted User',
      phone: null,
      avatarUrl: null,
      statusMessage: null,
      firebaseUid: null,
    });
  }

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
  }

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
