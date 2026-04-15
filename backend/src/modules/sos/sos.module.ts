import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SosController } from './sos.controller';
import { SosService } from './sos.service';
import { EmergencySession } from './entities/emergency-session.entity';
import { EncryptionModule } from '../encryption/encryption.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LocationModule } from '../location/location.module';
import { UsersModule } from '../users/users.module';
import { CirclesModule } from '../circles/circles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmergencySession]),
    EncryptionModule,
    NotificationsModule,
    LocationModule,
    UsersModule,
    CirclesModule,
  ],
  controllers: [SosController],
  providers: [SosService],
  exports: [SosService],
})
export class SosModule {}
