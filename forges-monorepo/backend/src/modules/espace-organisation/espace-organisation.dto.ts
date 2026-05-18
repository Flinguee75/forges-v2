import {
  IsString,
  IsEmail,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
  IsDateString,
  IsPhoneNumber
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================
// MEMBRES & BÉNÉFICIAIRES
// ============================================

export class ListMembresQueryDto {
  @IsOptional()
  @IsString()
  statut?: string;

  @IsOptional()
  @IsString()
  formation_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CreateMembreDto {
  @IsEmail()
  email!: string;

  @IsString()
  nom!: string;

  @IsString()
  prenom!: string;

  @IsOptional()
  @IsPhoneNumber()
  telephone?: string;

  @IsOptional()
  @IsString()
  secteur_activite?: string;

  @IsOptional()
  @IsString()
  niveau_etude?: string;
}

export class ImportB2BDto {
  @IsString()
  csv_content!: string;
}

export class MembreIdParamsDto {
  @IsString()
  id!: string;
}

// ============================================
// VOUCHERS
// ============================================

export class ListVouchersQueryDto {
  @IsOptional()
  @IsString()
  statut?: string;

  @IsOptional()
  @IsString()
  formation_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CommanderVouchersDto {
  @IsString()
  formation_id!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantite!: number;
}

// ============================================
// INSCRIPTIONS & PAIEMENTS
// ============================================

export class ListInscriptionsQueryDto {
  @IsOptional()
  @IsString()
  apprenant_id?: string;

  @IsOptional()
  @IsString()
  formation_id?: string;

  @IsOptional()
  @IsString()
  statut?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ListPaiementsQueryDto {
  @IsOptional()
  @IsDateString()
  date_debut?: string;

  @IsOptional()
  @IsDateString()
  date_fin?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

// ============================================
// PROFIL
// ============================================

export class UpdateProfilOrganisationDto {
  @IsOptional()
  @IsString()
  raison_sociale?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  contact_referent?: string;

  @IsOptional()
  @IsString()
  pays?: string;

  @IsOptional()
  @IsIn(['FR', 'EN', 'ES', 'PT'])
  langue_preferee?: string;
}
