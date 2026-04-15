import { IsString, IsOptional, MaxLength, IsBoolean } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  statusMessage?: string;

  @IsOptional()
  @IsBoolean()
  showLastSeen?: boolean;

  @IsOptional()
  @IsBoolean()
  shareBatteryLevel?: boolean;

  @IsOptional()
  @IsBoolean()
  allowSearchByEmail?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  emergencyMessage?: string;
}
