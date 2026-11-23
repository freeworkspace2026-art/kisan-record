export interface MandiEntry {
  id: string;
  farmerName: string;
  village: string;
  quantity: string;
  driverName: string;
  vehicleNumber: string;
  farmerPhone: string;
  driverPhone: string;
  departureDateTime: string;
  createdAt: string;
  updatedAt?: string;
}

export type MandiEntryInput = Omit<MandiEntry, 'id' | 'createdAt' | 'updatedAt'>;

export type VoiceFieldKey =
  | 'farmerName'
  | 'village'
  | 'quantity'
  | 'driverName'
  | 'vehicleNumber'
  | 'farmerPhone'
  | 'driverPhone';

export type AppSection = 'new-entry' | 'my-diary';
