import { MovementType } from '../../core/models/stock.models';

export interface MovementTypeConfig {
  label: string;
  icon: string;
  cssClass: string;
  sign: string;
}

export const MOVEMENT_TYPE_CONFIG: Record<MovementType, MovementTypeConfig> = {
  INBOUND: {
    label: 'Entrada',
    icon: 'arrow-down-outline',
    cssClass: 'type--inbound',
    sign: '+',
  },
  OUTBOUND: {
    label: 'Salida',
    icon: 'arrow-up-outline',
    cssClass: 'type--outbound',
    sign: '-',
  },
  TRANSFER: {
    label: 'Traslado',
    icon: 'swap-horizontal-outline',
    cssClass: 'type--transfer',
    sign: '<->',
  },
  ADJUSTMENT: {
    label: 'Ajuste',
    icon: 'refresh-outline',
    cssClass: 'type--adjustment',
    sign: '~',
  },
  RETURN: {
    label: 'Devolución',
    icon: 'return-down-back-outline',
    cssClass: 'type--return',
    sign: '+',
  },
};

export const MOVEMENT_FORM_TYPES: MovementType[] = [
  'INBOUND',
  'OUTBOUND',
  'RETURN',
];
