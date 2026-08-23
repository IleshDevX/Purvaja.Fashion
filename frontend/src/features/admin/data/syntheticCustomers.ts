export interface SyntheticCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  tier: 'Patron' | 'Atelier Member' | 'VIP Connoisseur';
  ordersCount: number;
  totalSpend: number;
  preferredFit: 'Slim' | 'Regular' | 'Relaxed';
  joinedDate: string;
  status: 'active' | 'inactive';
}

export const SYNTHETIC_CUSTOMERS: SyntheticCustomer[] = [
  {
    id: 'cust-101',
    firstName: 'Vikramaditya',
    lastName: 'Singhania',
    email: 'vikram.singhania@synthetic-patron.dev',
    phone: '+91 98765 00101',
    city: 'Mumbai',
    state: 'Maharashtra',
    tier: 'VIP Connoisseur',
    ordersCount: 8,
    totalSpend: 28990,
    preferredFit: 'Slim',
    joinedDate: '2025-11-12',
    status: 'active',
  },
  {
    id: 'cust-102',
    firstName: 'Raghav',
    lastName: 'Menon',
    email: 'raghav.menon@synthetic-patron.dev',
    phone: '+91 98765 00102',
    city: 'Bengaluru',
    state: 'Karnataka',
    tier: 'Atelier Member',
    ordersCount: 4,
    totalSpend: 14796,
    preferredFit: 'Regular',
    joinedDate: '2026-01-08',
    status: 'active',
  },
  {
    id: 'cust-103',
    firstName: 'Arjun',
    lastName: 'Kapoor',
    email: 'arjun.kapoor@synthetic-patron.dev',
    phone: '+91 98765 00103',
    city: 'New Delhi',
    state: 'Delhi',
    tier: 'VIP Connoisseur',
    ordersCount: 6,
    totalSpend: 22494,
    preferredFit: 'Slim',
    joinedDate: '2025-12-01',
    status: 'active',
  },
  {
    id: 'cust-104',
    firstName: 'Devendra',
    lastName: 'Rathore',
    email: 'devendra.rathore@synthetic-patron.dev',
    phone: '+91 98765 00104',
    city: 'Jaipur',
    state: 'Rajasthan',
    tier: 'Atelier Member',
    ordersCount: 3,
    totalSpend: 9597,
    preferredFit: 'Relaxed',
    joinedDate: '2026-02-14',
    status: 'active',
  },
  {
    id: 'cust-105',
    firstName: 'Siddharth',
    lastName: 'Verma',
    email: 'siddharth.verma@synthetic-patron.dev',
    phone: '+91 98765 00105',
    city: 'Hyderabad',
    state: 'Telangana',
    tier: 'Patron',
    ordersCount: 1,
    totalSpend: 3599,
    preferredFit: 'Slim',
    joinedDate: '2026-03-10',
    status: 'active',
  },
  {
    id: 'cust-106',
    firstName: 'Aditya',
    lastName: 'Deshmukh',
    email: 'aditya.deshmukh@synthetic-patron.dev',
    phone: '+91 98765 00106',
    city: 'Pune',
    state: 'Maharashtra',
    tier: 'Patron',
    ordersCount: 2,
    totalSpend: 6398,
    preferredFit: 'Regular',
    joinedDate: '2026-03-22',
    status: 'active',
  },
];
