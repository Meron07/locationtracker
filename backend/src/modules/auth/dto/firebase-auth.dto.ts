import { IsString, MinLength } from 'class-validator';

export class FirebaseAuthDto {
  @IsString()
  @MinLength(10)
  firebaseToken: string;
}
