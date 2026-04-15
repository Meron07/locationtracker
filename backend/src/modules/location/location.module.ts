import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { LocationGateway } from './location.gateway';
import { LocationShare } from './entities/location-share.entity';
import { LocationEvent } from './entities/location-event.entity';
import { EncryptionModule } from '../encryption/encryption.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LocationShare, LocationEvent]),
    JwtModule.register({}), // config loaded from app.module
    EncryptionModule,
  ],
  controllers: [LocationController],
  providers: [LocationService, LocationGateway],
  exports: [LocationService, LocationGateway],
})
export class LocationModule {}
