import { IsNumber, IsOptional, IsString, IsDateString, Min, Max, IsIn } from 'class-validator';

export class UploadLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number;

  @IsOptional()
  @IsNumber()
  altitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  speed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  batteryLevel?: number;

  @IsOptional()
  @IsString()
  @IsIn(['stationary', 'walking', 'running', 'cycling', 'driving', 'unknown'])
  activity?: string;

  @IsOptional()
  isCharging?: boolean;

  @IsDateString()
  recordedAt: string;
}
