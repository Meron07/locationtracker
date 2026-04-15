import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeofenceController } from './geofence.controller';
import { GeofenceService } from './geofence.service';
import { Geofence } from './entities/geofence.entity';
import { CircleMembership } from '../circles/entities/circle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Geofence, CircleMembership])],
  controllers: [GeofenceController],
  providers: [GeofenceService],
  exports: [GeofenceService],
})
export class GeofenceModule {}
