import { IsString } from 'class-validator';

export class ConfirmPutawayDto {
  @IsString()
  code!: string;
}
