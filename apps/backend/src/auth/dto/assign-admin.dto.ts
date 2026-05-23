import { IsEmail } from 'class-validator';

export class AssignAdminDto {
  @IsEmail()
  email!: string;
}
