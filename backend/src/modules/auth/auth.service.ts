import {
  Injectable, UnauthorizedException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  // ── Registration ─────────────────────────────────────────────────────────

  async register(email: string, password: string, displayName: string) {
    // Check for existing user — return generic message to prevent enumeration
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      // Simulate normal work time to prevent timing-based enumeration
      await bcrypt.hash('dummy_work', 12);
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.usersService.create({ email, displayName, passwordHash });
    return this.issueTokenPair(user);
  }

  // ── Email/password login ──────────────────────────────────────────────────

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    // Timing-safe: always run bcrypt even if user not found (prevents timing attack)
    const hashToVerify = user?.passwordHash ?? '$2b$12$invalidhashplaceholderXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    const isValid = await bcrypt.compare(password, hashToVerify);

    if (!user || !isValid || user.deletedAt) {
      // Same error for wrong email and wrong password (anti-enumeration)
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokenPair(user);
  }

  // ── Firebase OAuth login (Google / Apple) ─────────────────────────────────

  async firebaseLogin(firebaseToken: string) {
    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth().verifyIdToken(firebaseToken, true);
    } catch {
      throw new UnauthorizedException('Invalid Firebase token');
    }

    let user = await this.usersService.findByFirebaseUid(decoded.uid);
    if (!user) {
      // First-time OAuth sign-in — create account
      user = await this.usersService.create({
        email: decoded.email ?? `${decoded.uid}@firebase.safecircle`,
        displayName: decoded.name ?? 'SafeCircle User',
        firebaseUid: decoded.uid,
      });
    }

    if (user.deletedAt) throw new UnauthorizedException('Account deleted');
    return this.issueTokenPair(user);
  }

  // ── Refresh token rotation ────────────────────────────────────────────────

  async refresh(rawRefreshToken: string): Promise<{ accessToken: string }> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const storedToken = await this.refreshTokenRepo.findOne({
      where: {
        tokenHash,
        revokedAt: null as any,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });

    if (!storedToken) {
      // Check if a previously valid token is being replayed
      const replayedToken = await this.refreshTokenRepo.findOne({ where: { tokenHash } });
      if (replayedToken) {
        // Replay attack detected — revoke ALL sessions for this user
        await this.revokeAllUserSessions(replayedToken.userId);
        throw new UnauthorizedException('Security alert: token replay detected. All sessions revoked.');
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (storedToken.user.deletedAt) throw new UnauthorizedException('Account deleted');

    // Rotate: revoke old token
    storedToken.revokedAt = new Date();
    await this.refreshTokenRepo.save(storedToken);

    // Issue new pair
    const pair = await this.issueTokenPair(storedToken.user);
    return { accessToken: pair.accessToken };
  }

  // ── Logout ───────────────────────────────────────────────────────────────

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.refreshTokenRepo.update({ tokenHash }, { revokedAt: new Date() });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.revokeAllUserSessions(userId);
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private async issueTokenPair(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      }),
    );

    return { accessToken, refreshToken: rawRefreshToken };
  }

  private async revokeAllUserSessions(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { userId, revokedAt: null as any },
      { revokedAt: new Date() },
    );
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
