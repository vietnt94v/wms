import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ScheduleAppointmentDto {
  @IsString()
  asnId!: string;

  @IsString()
  dockId!: string;

  @IsString()
  windowStart!: string;

  @IsString()
  windowEnd!: string;
}

export class GateInDto {
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  asnId?: string;

  @IsString()
  dockId!: string;
}

export class RejectArrivalDto {
  @IsString()
  reason!: string;
}

export class ScanLineDto {
  @IsString()
  sku!: string;

  @IsInt()
  @Min(1)
  qty!: number;

  @IsOptional()
  @IsString()
  lot?: string;

  @IsOptional()
  @IsString()
  expiry?: string;
}

export class ScanDto {
  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  lot?: string;

  @IsOptional()
  @IsString()
  expiry?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  qty?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScanLineDto)
  lines?: ScanLineDto[];

  @IsOptional()
  @IsString()
  varianceReason?: string;

  @IsOptional()
  @IsString()
  varianceReasonId?: string;

  @IsOptional()
  @IsBoolean()
  confirm?: boolean;

  @IsOptional()
  @IsBoolean()
  allowOverOverride?: boolean;
}

export class SubmitQcDto {
  @IsString()
  sku!: string;

  @IsInt()
  @Min(1)
  sampleQty!: number;

  @IsBoolean()
  pass!: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ResolveDiscrepancyDto {
  @IsIn([
    'ACCEPT_VARIANCE',
    'REJECT',
    'PARTIAL_ACCEPT',
    'QUARANTINE',
    'CLAIM_SUPPLIER',
  ])
  resolution!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
