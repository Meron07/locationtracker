import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Geofence } from './entities/geofence.entity';
import { CircleMembership } from '../circles/entities/circle.entity';

export interface CreateGeofenceDto {
  name: string;
  description?: string;
  shape: 'circle' | 'polygon';
  definition: Record<string, unknown>;
  triggerType?: 'enter' | 'exit' | 'both';
  circleId: string;
}

@Injectable()
export class GeofenceService {
  constructor(
    @InjectRepository(Geofence)
    private readonly geofenceRepo: Repository<Geofence>,
    @InjectRepository(CircleMembership)
    private readonly memberRepo: Repository<CircleMembership>,
    private readonly dataSource: DataSource,
  ) {}

  // ── CRUD ─────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateGeofenceDto): Promise<Geofence> {
    await this.assertAdminOrOwner(userId, dto.circleId);

    const geofence = this.geofenceRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      shape: dto.shape,
      definition: dto.definition,
      triggerType: dto.triggerType ?? 'both',
      circleId: dto.circleId,
      createdBy: userId,
    });

    const saved = await this.geofenceRepo.save(geofence);

    // Populate PostGIS geometry column
    await this.updateGeomColumn(saved.id, dto.shape, dto.definition);

    return this.geofenceRepo.findOneOrFail({ where: { id: saved.id } });
  }

  async list(userId: string, circleId: string): Promise<Geofence[]> {
    await this.assertMember(userId, circleId);
    return this.geofenceRepo.find({
      where: { circleId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    userId: string,
    id: string,
    partial: Partial<Pick<CreateGeofenceDto, 'name' | 'description' | 'triggerType'>> & {
      isActive?: boolean;
    },
  ): Promise<Geofence> {
    const geofence = await this.geofenceRepo.findOneOrFail({ where: { id } });
    await this.assertAdminOrOwner(userId, geofence.circleId);

    Object.assign(geofence, partial);
    return this.geofenceRepo.save(geofence);
  }

  async delete(userId: string, id: string) {
    const geofence = await this.geofenceRepo.findOneOrFail({ where: { id } });
    await this.assertAdminOrOwner(userId, geofence.circleId);
    await this.geofenceRepo.delete(id);
  }

  // ── Geospatial check ──────────────────────────────────────────────────────

  /**
   * Called by LocationService after each location upload.
   * Uses PostGIS ST_Within to find geofences the user has just entered/exited.
   *
   * Returns geofences that should fire an alert.
   */
  async checkForUser(
    userId: string,
    lat: number,
    lng: number,
  ): Promise<Array<{ geofence: Geofence; trigger: 'enter' | 'exit' }>> {
    // Find all active geofences in circles the user belongs to
    const entered = await this.dataSource.query(
      `
      SELECT g.*
      FROM geofences g
      JOIN circle_memberships cm ON cm.circle_id = g.circle_id
      WHERE cm.user_id = $1
        AND cm.status = 'active'
        AND g.is_active = true
        AND g.geom IS NOT NULL
        AND ST_Within(
          ST_SetSRID(ST_Point($3, $2), 4326),
          g.geom
        )
      `,
      [userId, lat, lng],
    );

    return entered.map((row: any) => ({
      geofence: row as Geofence,
      trigger: 'enter' as const,
    }));
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async updateGeomColumn(
    id: string,
    shape: 'circle' | 'polygon',
    definition: Record<string, unknown>,
  ) {
    if (shape === 'circle') {
      const center = definition.center as { lat: number; lng: number };
      const radius = definition.radius_meters as number;
      await this.dataSource.query(
        `UPDATE geofences
         SET geom = ST_Buffer(
           ST_SetSRID(ST_Point($1, $2), 4326)::geography,
           $3
         )::geometry
         WHERE id = $4`,
        [center.lng, center.lat, radius, id],
      );
    } else if (shape === 'polygon') {
      const coords = definition.coordinates as Array<{ lat: number; lng: number }>;
      // Build WKT polygon
      const wkt =
        'POLYGON((' +
        [...coords, coords[0]]
          .map((c) => `${c.lng} ${c.lat}`)
          .join(', ') +
        '))';
      await this.dataSource.query(
        `UPDATE geofences
         SET geom = ST_SetSRID(ST_GeomFromText($1), 4326)
         WHERE id = $2`,
        [wkt, id],
      );
    }
  }

  private async assertMember(userId: string, circleId: string) {
    const m = await this.memberRepo.findOne({
      where: { userId, circleId, status: 'active' },
    });
    if (!m) throw new ForbiddenException('Not a member of this circle');
  }

  private async assertAdminOrOwner(userId: string, circleId: string) {
    const m = await this.memberRepo.findOne({
      where: { userId, circleId, status: 'active' },
    });
    if (!m || (m.role !== 'owner' && m.role !== 'admin')) {
      throw new ForbiddenException('Admin or owner role required');
    }
  }
}
