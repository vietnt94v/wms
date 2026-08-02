import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class AsnLineInputDto {
  @IsString()
  sku!: string;

  @IsInt()
  @Min(1)
  expectedQty!: number;
}

export class PalletItemInputDto {
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

export class AsnPalletInputDto {
  @IsString()
  sscc!: string;

  @IsString()
  destinationWh!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PalletItemInputDto)
  items!: PalletItemInputDto[];
}

export class CreateAsnDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  supplierId!: string;

  @IsIn(['SSCC', 'CONTAINER'])
  type!: 'SSCC' | 'CONTAINER';

  @IsString()
  carrier!: string;

  @IsString()
  plateNo!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AsnLineInputDto)
  lines!: AsnLineInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AsnPalletInputDto)
  pallets?: AsnPalletInputDto[];
}
