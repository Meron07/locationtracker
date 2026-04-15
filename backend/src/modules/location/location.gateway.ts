import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationService } from './location.service';
import { LocationShare } from './entities/location-share.entity';
import { UploadLocationDto } from './dto/upload-location.dto';
import { EncryptionService } from '../encryption/encryption.service';

/**
 * Real-time WebSocket gateway for location updates.
 *
 * Rooms:
 *  user:{userId}     — personal room for direct notifications
 *  circle:{id}       — circle group room
 *  sos:{sessionId}   — emergency session room
 */
@WebSocketGateway({
  namespace: '/',
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3001',
    credentials: true,
  },
})
export class LocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly locationService: LocationService,
    @InjectRepository(LocationShare)
    private readonly shareRepo: Repository<LocationShare>,
    private readonly encryptionService: EncryptionService,
  ) {}

  // ── Connection lifecycle ──────────────────────────────────────────────────

  async handleConnection(socket: Socket) {
    try {
      const token =
        (socket.handshake.auth?.token as string) ||
        socket.handshake.query?.token as string;

      if (!token) {
        socket.emit('auth_error', { message: 'Missing token' });
        socket.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify(token) as { sub: string; role: string };
      socket.data.userId = payload.sub;

      // Join user's personal room
      socket.join(`user:${payload.sub}`);

      socket.emit('connected', { server_time: new Date().toISOString() });
      console.log(`Socket connected: user ${payload.sub}`);
    } catch {
      socket.emit('auth_error', { message: 'Invalid token' });
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    if (socket.data.userId) {
      console.log(`Socket disconnected: user ${socket.data.userId}`);
    }
  }

  // ── Location update event ─────────────────────────────────────────────────

  @SubscribeMessage('location:update')
  async handleLocationUpdate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() dto: UploadLocationDto,
  ) {
    const userId: string = socket.data.userId;
    if (!userId) return;

    // Persist the event
    await this.locationService.uploadLocation(userId, dto);

    // Find all viewers authorized to see this user's location
    const shares = await this.shareRepo.find({
      where: { sharerId: userId, status: 'active' },
      relations: ['sharer'],
    });

    for (const share of shares) {
      const viewerRoom = `user:${share.viewerId}`;

      // Emit to viewer's personal room (they may be on a different server instance,
      // but Redis adapter ensures cross-instance delivery)
      this.server.to(viewerRoom).emit('location:updated', {
        user_id: userId,
        display_name: share.sharer.displayName,
        avatar_url: share.sharer.avatarUrl,
        // Round to ~10m precision
        latitude: Math.round(dto.latitude * 10000) / 10000,
        longitude: Math.round(dto.longitude * 10000) / 10000,
        accuracy: dto.accuracy,
        battery_level: share.sharer.shareBatteryLevel ? dto.batteryLevel : null,
        activity: dto.activity,
        last_updated: dto.recordedAt,
        share_id: share.id,
      });
    }
  }

  // ── Server → client broadcast helpers (called from other services) ────────

  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToCircle(circleId: string, event: string, data: unknown) {
    this.server.to(`circle:${circleId}`).emit(event, data);
  }

  emitToSosSession(sessionId: string, event: string, data: unknown) {
    this.server.to(`sos:${sessionId}`).emit(event, data);
  }

  async joinSosRoom(userId: string, sessionId: string) {
    const sockets = await this.server.in(`user:${userId}`).fetchSockets();
    for (const s of sockets) {
      s.join(`sos:${sessionId}`);
    }
  }
}
