import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Circle, CircleMembership } from './entities/circle.entity';

@Injectable()
export class CirclesService {
  constructor(
    @InjectRepository(Circle)
    private readonly circleRepo: Repository<Circle>,
    @InjectRepository(CircleMembership)
    private readonly memberRepo: Repository<CircleMembership>,
  ) {}

  async create(ownerId: string, name: string, description?: string): Promise<Circle> {
    const inviteCode = crypto.randomBytes(8).toString('hex');
    const circle = this.circleRepo.create({ name, description, ownerId, inviteCode });
    const saved = await this.circleRepo.save(circle);

    // Add owner as member with owner role
    await this.memberRepo.save(
      this.memberRepo.create({
        circleId: saved.id,
        userId: ownerId,
        role: 'owner',
        status: 'active',
        joinedAt: new Date(),
      }),
    );

    return saved;
  }

  async update(
    requesterId: string,
    circleId: string,
    data: { name?: string; description?: string },
  ): Promise<Circle> {
    await this.assertAdminOrOwner(circleId, requesterId);
    const circle = await this.circleRepo.findOneOrFail({ where: { id: circleId, isActive: true } });
    if (data.name !== undefined) circle.name = data.name;
    if (data.description !== undefined) circle.description = data.description;
    return this.circleRepo.save(circle);
  }

  async disband(requesterId: string, circleId: string): Promise<void> {
    const m = await this.assertActiveMember(circleId, requesterId);
    if (m.role !== 'owner') throw new ForbiddenException('Only the owner can disband the circle');
    const circle = await this.circleRepo.findOneOrFail({ where: { id: circleId } });
    circle.isActive = false;
    await this.circleRepo.save(circle);
  }

  async setMemberRole(
    requesterId: string,
    circleId: string,
    memberId: string,
    role: string,
  ): Promise<CircleMembership> {
    await this.assertAdminOrOwner(circleId, requesterId);
    const target = await this.memberRepo.findOne({ where: { circleId, userId: memberId, status: 'active' } });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'owner') throw new ForbiddenException('Cannot change owner role');
    target.role = role as CircleMembership['role'];
    return this.memberRepo.save(target);
  }

  async listInvites(requesterId: string, circleId: string): Promise<CircleMembership[]> {
    await this.assertAdminOrOwner(circleId, requesterId);
    return this.memberRepo.find({ where: { circleId, status: 'pending' } });
  }

  async revokeInvite(requesterId: string, circleId: string, inviteId: string): Promise<void> {
    await this.assertAdminOrOwner(circleId, requesterId);
    const invite = await this.memberRepo.findOne({ where: { id: inviteId, circleId, status: 'pending' } });
    if (!invite) throw new NotFoundException('Invite not found');
    invite.status = 'removed';
    await this.memberRepo.save(invite);
  }

  async getUserCircles(userId: string) {
    return this.memberRepo.find({
      where: { userId, status: 'active' },
      relations: ['circle'],
    });
  }

  async findById(circleId: string, userId: string): Promise<Circle> {
    const membership = await this.memberRepo.findOne({
      where: { circleId, userId, status: 'active' },
    });
    if (!membership) throw new ForbiddenException('Not a member of this circle');

    const circle = await this.circleRepo.findOne({ where: { id: circleId, isActive: true } });
    if (!circle) throw new NotFoundException('Circle not found');
    return circle;
  }

  async getMembers(circleId: string, requesterId: string) {
    await this.assertActiveMember(circleId, requesterId);
    return this.memberRepo.find({
      where: { circleId, status: 'active' },
      relations: ['user'],
    });
  }

  async createInvite(
    circleId: string,
    inviterId: string,
    expiresInHours = 72,
    email?: string,
  ): Promise<{ token: string; url: string; expiresAt: Date }> {
    await this.assertAdminOrOwner(circleId, inviterId);

    const circle = await this.circleRepo.findOneOrFail({ where: { id: circleId } });
    const activeCount = await this.memberRepo.count({ where: { circleId, status: 'active' } });
    if (activeCount >= circle.maxMembers) {
      throw new BadRequestException('Circle is at maximum member capacity');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    await this.memberRepo.save(
      this.memberRepo.create({
        circleId,
        userId: email ? undefined! : undefined!,  // placeholder until user accepts
        invitedBy: inviterId,
        inviteToken: token,
        inviteExpires: expiresAt,
        status: 'pending',
        role: 'member',
      }),
    );

    return {
      token,
      url: `https://safecircle.app/join/${token}`,
      expiresAt,
    };
  }

  async acceptInvite(token: string, userId: string): Promise<CircleMembership> {
    const membership = await this.memberRepo.findOne({
      where: { inviteToken: token, status: 'pending' },
    });

    if (!membership) throw new NotFoundException('Invite not found or already used');
    if (membership.inviteExpires && membership.inviteExpires < new Date()) {
      throw new BadRequestException('Invite has expired');
    }

    // Check if user is already in circle
    const existing = await this.memberRepo.findOne({
      where: { circleId: membership.circleId, userId, status: 'active' },
    });
    if (existing) throw new ConflictException('Already a member of this circle');

    membership.userId = userId;
    membership.status = 'active';
    membership.joinedAt = new Date();
    membership.inviteToken = null; // Invalidate the token

    return this.memberRepo.save(membership);
  }

  async removeMember(circleId: string, targetUserId: string, requesterId: string) {
    const requesterMembership = await this.assertAdminOrOwner(circleId, requesterId);
    const targetMembership = await this.memberRepo.findOne({
      where: { circleId, userId: targetUserId, status: 'active' },
    });

    if (!targetMembership) throw new NotFoundException('Member not found');
    if (targetMembership.role === 'owner') throw new ForbiddenException('Cannot remove the circle owner');

    // Admins cannot remove other admins
    if (requesterMembership.role === 'admin' && targetMembership.role === 'admin') {
      throw new ForbiddenException('Admins cannot remove other admins');
    }

    targetMembership.status = 'removed';
    await this.memberRepo.save(targetMembership);
  }

  async leaveCircle(circleId: string, userId: string) {
    const membership = await this.assertActiveMember(circleId, userId);
    if (membership.role === 'owner') {
      throw new BadRequestException('Owner must transfer ownership before leaving');
    }
    membership.status = 'removed';
    await this.memberRepo.save(membership);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async assertActiveMember(circleId: string, userId: string): Promise<CircleMembership> {
    const m = await this.memberRepo.findOne({ where: { circleId, userId, status: 'active' } });
    if (!m) throw new ForbiddenException('Not a member of this circle');
    return m;
  }

  private async assertAdminOrOwner(circleId: string, userId: string): Promise<CircleMembership> {
    const m = await this.assertActiveMember(circleId, userId);
    if (!['owner', 'admin'].includes(m.role)) {
      throw new ForbiddenException('Admin or owner role required');
    }
    return m;
  }
}
