import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CirclesController } from './circles.controller';
import { CirclesService } from './circles.service';
import { Circle } from './entities/circle.entity';
import { CircleMembership } from './entities/circle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Circle, CircleMembership])],
  controllers: [CirclesController],
  providers: [CirclesService],
  exports: [CirclesService],
})
export class CirclesModule {}
