export type ProductStatus = 'AVAILABLE' | 'RESERVED' | 'RENTED' | 'MAINTENANCE';
export type RentalStatus = 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'CANCELLED';
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type DayAvailability = 'available' | 'reserved' | 'rented';

export interface Category {
  id: string;
  name: string;
}

export interface Photo {
  id: string;
  url: string;
  filename: string;
  isPrimary: boolean;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: Category;
  categoryId: string;
  size: string;
  color: string;
  rentalPrice: number;
  salePrice?: number;
  notes?: string;
  status: ProductStatus;
  photos: Photo[];
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  cpf: string;
  rg?: string;
  phone: string;
  address?: string;
  notes?: string;
  createdAt: string;
  rentalsCount?: number;
}

export interface Accessory {
  id: string;
  name: string;
  createdAt: string;
}

export interface RentalAccessory {
  id: string;
  accessoryId: string;
  accessory: { id: string; name: string };
  quantity: number;
}

export interface Rental {
  id: string;
  product: Product;
  customer: Customer;
  pickupDate: string;
  returnDate: string;
  totalValue: number;
  depositValue: number;
  remainingValue: number;
  notes?: string;
  status: RentalStatus;
  accessories?: RentalAccessory[];
  createdAt: string;
}

export interface DashboardData {
  totalAvailable: number;
  totalRented: number;
  totalReserved: number;
  monthlyRevenue: number;
  rentals: {
    active: number;
    overdue: number;
  };
  pickupToday: Rental[];
  returnToday: Rental[];
}

export interface AvailabilityDay {
  date: string;
  status: DayAvailability;
  rental?: { id: string; customer: string };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---- Report types ----
export interface RentalByPeriodRow {
  id: string;
  product: string;
  customer: string;
  pickupDate: string;
  returnDate: string;
  totalValue: number;
  status: RentalStatus;
}

export interface TopProductRow {
  productId: string;
  code: string;
  name: string;
  rentalsCount: number;
  totalRevenue: number;
}

export interface MonthlyRevenueRow {
  month: string; // YYYY-MM
  label: string; // ex: "Janeiro/2026"
  rentalsCount: number;
  revenue: number;
}

// ---- Global search ----
export interface SearchResults {
  customers: Customer[];
  products: Product[];
  rentals: Rental[];
}
