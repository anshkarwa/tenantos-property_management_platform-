// Mock listings for the tenant-facing property search portal
// These represent vacant units that landlords have opted to list publicly

export type Furnishing = 'furnished' | 'semi' | 'unfurnished';
export type UnitType = 'studio' | '1bhk' | '2bhk' | '3bhk' | 'pg';

export interface Listing {
  id: string;
  property_name: string;
  unit_number: string;
  unit_type: UnitType;
  floor: number;
  area_sqft: number;
  monthly_rent: number;
  security_deposit: number;
  furnishing: Furnishing;
  available_from: string;
  city: string;
  locality: string;
  state: string;
  pincode: string;
  address: string;
  description: string;
  amenities: {
    parking: boolean;
    lift: boolean;
    generator: boolean;
    security: boolean;
    gym: boolean;
    wifi: boolean;
    ac: boolean;
    water_24h: boolean;
  };
  preferred_tenant: string[];
  tags: string[];
  contact_name: string;       // anonymised — shown as first name only
  listed_at: string;
}

export const mockListings: Listing[] = [
  {
    id: 'lst-001',
    property_name: 'Sharma Residency Block A',
    unit_number: 'A-202',
    unit_type: '3bhk',
    floor: 2,
    area_sqft: 1350,
    monthly_rent: 35000,
    security_deposit: 105000,
    furnishing: 'semi',
    available_from: '2026-07-01',
    city: 'Bangalore',
    locality: 'Indiranagar',
    state: 'Karnataka',
    pincode: '560038',
    address: '45, 12th Cross, Indiranagar, Near Metro Station',
    description: 'Spacious semi-furnished 3BHK on the 2nd floor. Modular kitchen with hob & chimney, two attached bathrooms, large balcony overlooking the garden. Walking distance from Indiranagar Metro.',
    amenities: { parking: true, lift: true, generator: true, security: true, gym: false, wifi: false, ac: true, water_24h: true },
    preferred_tenant: ['Family', 'Working Professionals'],
    tags: ['Metro Nearby', 'Park View', 'Vastu Compliant'],
    contact_name: 'Ansh',
    listed_at: '2026-06-01T10:00:00Z',
  },
  {
    id: 'lst-002',
    property_name: 'Sharma Residency Block A',
    unit_number: 'A-402',
    unit_type: 'studio',
    floor: 4,
    area_sqft: 450,
    monthly_rent: 12000,
    security_deposit: 36000,
    furnishing: 'furnished',
    available_from: '2026-06-15',
    city: 'Bangalore',
    locality: 'Indiranagar',
    state: 'Karnataka',
    pincode: '560038',
    address: '45, 12th Cross, Indiranagar, Near Metro Station',
    description: 'Fully furnished studio on the top floor. Includes bed, wardrobe, study table, and mini fridge. Perfect for working professionals or students. Great natural light.',
    amenities: { parking: false, lift: true, generator: true, security: true, gym: false, wifi: true, ac: true, water_24h: true },
    preferred_tenant: ['Single Professional', 'Student'],
    tags: ['Fully Furnished', 'Top Floor', 'Metro Nearby'],
    contact_name: 'Ansh',
    listed_at: '2026-06-02T10:00:00Z',
  },
  {
    id: 'lst-003',
    property_name: 'Green Valley Apartments',
    unit_number: 'GV-304',
    unit_type: '2bhk',
    floor: 3,
    area_sqft: 1050,
    monthly_rent: 28000,
    security_deposit: 84000,
    furnishing: 'semi',
    available_from: '2026-07-15',
    city: 'Bangalore',
    locality: 'HSR Layout',
    state: 'Karnataka',
    pincode: '560102',
    address: '78, HSR Layout, Sector 2',
    description: 'Well-maintained 2BHK in a gated society. Semi-furnished with wardrobes in both bedrooms. Society has 24hr security, covered parking, and power backup. HSR Layout main road access.',
    amenities: { parking: true, lift: true, generator: true, security: true, gym: true, wifi: false, ac: false, water_24h: true },
    preferred_tenant: ['Family', 'Working Professionals'],
    tags: ['Gated Society', 'Gym', 'Power Backup'],
    contact_name: 'Ansh',
    listed_at: '2026-05-30T10:00:00Z',
  },
  {
    id: 'lst-004',
    property_name: 'Sunshine PG for Women',
    unit_number: 'Room 12',
    unit_type: 'pg',
    floor: 1,
    area_sqft: 180,
    monthly_rent: 9500,
    security_deposit: 19000,
    furnishing: 'furnished',
    available_from: '2026-06-10',
    city: 'Bangalore',
    locality: 'Koramangala',
    state: 'Karnataka',
    pincode: '560034',
    address: '23, Koramangala 4th Block, Opp. Forum Mall',
    description: 'Single occupancy room in a safe, well-managed women-only PG. Includes meals (breakfast + dinner), housekeeping, and high-speed WiFi. Walking distance to Forum Mall and multiple tech parks.',
    amenities: { parking: false, lift: false, generator: true, security: true, gym: false, wifi: true, ac: true, water_24h: true },
    preferred_tenant: ['Single Woman', 'Female Student'],
    tags: ['Women Only', 'Meals Included', 'Forum Mall Nearby'],
    contact_name: 'Ansh',
    listed_at: '2026-06-03T10:00:00Z',
  },
  {
    id: 'lst-005',
    property_name: 'Oberoi Gardens',
    unit_number: 'B-501',
    unit_type: '2bhk',
    floor: 5,
    area_sqft: 980,
    monthly_rent: 52000,
    security_deposit: 156000,
    furnishing: 'furnished',
    available_from: '2026-07-01',
    city: 'Mumbai',
    locality: 'Bandra West',
    state: 'Maharashtra',
    pincode: '400050',
    address: '14, Hill Road, Bandra West',
    description: 'Premium fully-furnished 2BHK on the 5th floor with Arabian Sea glimpse. Split ACs in all rooms, modular kitchen with chimney, marble flooring. Short walk to Bandra station and Linking Road.',
    amenities: { parking: true, lift: true, generator: true, security: true, gym: true, wifi: true, ac: true, water_24h: true },
    preferred_tenant: ['Family', 'Working Professionals'],
    tags: ['Sea View', 'Premium', 'Fully Furnished', 'Bandra Station'],
    contact_name: 'Rohit',
    listed_at: '2026-05-28T10:00:00Z',
  },
  {
    id: 'lst-006',
    property_name: 'Viva Apartments',
    unit_number: 'C-102',
    unit_type: '1bhk',
    floor: 1,
    area_sqft: 620,
    monthly_rent: 22000,
    security_deposit: 44000,
    furnishing: 'unfurnished',
    available_from: '2026-06-20',
    city: 'Mumbai',
    locality: 'Andheri East',
    state: 'Maharashtra',
    pincode: '400069',
    address: '8, Saki Vihar Road, Andheri East',
    description: 'Unfurnished 1BHK in a well-connected area near MIDC and SEEPZ. Ground floor, easy access. Society has 24hr security, gym, and power backup. Great for first-time renters.',
    amenities: { parking: true, lift: true, generator: true, security: true, gym: true, wifi: false, ac: false, water_24h: false },
    preferred_tenant: ['Working Professional', 'Couple'],
    tags: ['Metro Nearby', 'SEEPZ', 'MIDC'],
    contact_name: 'Rohit',
    listed_at: '2026-06-01T10:00:00Z',
  },
  {
    id: 'lst-007',
    property_name: 'Kalpataru Residency',
    unit_number: '403',
    unit_type: '2bhk',
    floor: 4,
    area_sqft: 1100,
    monthly_rent: 24000,
    security_deposit: 72000,
    furnishing: 'semi',
    available_from: '2026-07-01',
    city: 'Pune',
    locality: 'Wakad',
    state: 'Maharashtra',
    pincode: '411057',
    address: 'Survey No. 12, Wakad-Hinjawadi Road',
    description: 'Semi-furnished 2BHK in a modern gated township close to Hinjawadi IT Park. Open modular kitchen, vitrified tiles throughout, 2 balconies. Ideal for IT professionals commuting to Phase 1 or 2.',
    amenities: { parking: true, lift: true, generator: false, security: true, gym: true, wifi: false, ac: false, water_24h: true },
    preferred_tenant: ['IT Professionals', 'Family'],
    tags: ['Hinjawadi Nearby', 'Township', 'IT Park'],
    contact_name: 'Meera',
    listed_at: '2026-05-25T10:00:00Z',
  },
  {
    id: 'lst-008',
    property_name: 'Skyline Heights',
    unit_number: 'T2-801',
    unit_type: '3bhk',
    floor: 8,
    area_sqft: 1600,
    monthly_rent: 45000,
    security_deposit: 135000,
    furnishing: 'furnished',
    available_from: '2026-08-01',
    city: 'Hyderabad',
    locality: 'Gachibowli',
    state: 'Telangana',
    pincode: '500032',
    address: 'Plot 22, Financial District, Gachibowli',
    description: 'Luxury 3BHK on the 8th floor with panoramic city views. Fully furnished with premium appliances, modular kitchen, 3 ACs, home theatre setup, and private terrace access. Steps from HICC and Google campus.',
    amenities: { parking: true, lift: true, generator: true, security: true, gym: true, wifi: true, ac: true, water_24h: true },
    preferred_tenant: ['Family', 'Senior Executive'],
    tags: ['City View', 'Luxury', 'IT Hub', 'Terrace Access'],
    contact_name: 'Vijay',
    listed_at: '2026-06-02T10:00:00Z',
  },
  {
    id: 'lst-009',
    property_name: 'Prestige Heights',
    unit_number: 'D-201',
    unit_type: '1bhk',
    floor: 2,
    area_sqft: 580,
    monthly_rent: 16000,
    security_deposit: 32000,
    furnishing: 'semi',
    available_from: '2026-06-25',
    city: 'Hyderabad',
    locality: 'Kondapur',
    state: 'Telangana',
    pincode: '500084',
    address: 'Road No. 4, Kondapur',
    description: 'Compact semi-furnished 1BHK in a quiet residential lane. Wardrobe fitted, kitchen with cabinets. Close to KPHB Metro and HITEC City. Peaceful neighbourhood with nearby supermarkets.',
    amenities: { parking: false, lift: true, generator: false, security: true, gym: false, wifi: false, ac: false, water_24h: true },
    preferred_tenant: ['Single Professional', 'Couple'],
    tags: ['Metro Nearby', 'HITEC City', 'Quiet Area'],
    contact_name: 'Vijay',
    listed_at: '2026-06-01T10:00:00Z',
  },
  {
    id: 'lst-010',
    property_name: 'Adani Inspire',
    unit_number: 'W3-604',
    unit_type: '2bhk',
    floor: 6,
    area_sqft: 1050,
    monthly_rent: 32000,
    security_deposit: 96000,
    furnishing: 'furnished',
    available_from: '2026-07-10',
    city: 'Ahmedabad',
    locality: 'Shantigram',
    state: 'Gujarat',
    pincode: '382421',
    address: 'Adani Shantigram Township, SG Highway',
    description: 'Beautifully furnished 2BHK in a premium integrated township on SG Highway. Swimming pool, cricket ground, clubhouse all within the society. Close to GIFT City and Zydus corridor.',
    amenities: { parking: true, lift: true, generator: true, security: true, gym: true, wifi: true, ac: true, water_24h: true },
    preferred_tenant: ['Family', 'Working Professionals'],
    tags: ['Township', 'Pool', 'GIFT City', 'SG Highway'],
    contact_name: 'Rajan',
    listed_at: '2026-05-29T10:00:00Z',
  },
];

export const CITIES = ['All Cities', 'Bangalore', 'Mumbai', 'Pune', 'Hyderabad', 'Ahmedabad'];
export const UNIT_TYPES: { label: string; value: UnitType | 'all' }[] = [
  { label: 'All Types', value: 'all' },
  { label: 'Studio', value: 'studio' },
  { label: '1 BHK', value: '1bhk' },
  { label: '2 BHK', value: '2bhk' },
  { label: '3 BHK', value: '3bhk' },
  { label: 'PG / Room', value: 'pg' },
];
export const FURNISHING_OPTIONS: { label: string; value: Furnishing | 'all' }[] = [
  { label: 'Any', value: 'all' },
  { label: 'Furnished', value: 'furnished' },
  { label: 'Semi-Furnished', value: 'semi' },
  { label: 'Unfurnished', value: 'unfurnished' },
];
