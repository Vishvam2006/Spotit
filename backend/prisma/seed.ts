import {
  BookingStatus,
  ComplaintStatus,
  ParkingLotStatus,
  PrismaClient,
  Role,
  VehicleType,
} from "@prisma/client";
import type { User } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "12345678";

// Volume knobs — override with SEED_* env vars for a smaller/larger dataset.
const USER_COUNT = envInt("SEED_USERS", 60);
const HISTORY_BOOKINGS = envInt("SEED_BOOKINGS", 900);
const RESERVED_BOOKINGS = envInt("SEED_RESERVED", 25);
const ACTIVE_BOOKINGS = envInt("SEED_ACTIVE", 40);
const COMPLAINT_COUNT = envInt("SEED_COMPLAINTS", 140);
const HISTORY_DAYS = envInt("SEED_HISTORY_DAYS", 90);

const CHUNK_SIZE = 200;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** Deterministic PRNG so repeated seeds produce the same dataset. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260818);

const randInt = (min: number, max: number): number =>
  min + Math.floor(rand() * (max - min + 1));

const pick = <T>(items: readonly T[]): T => items[randInt(0, items.length - 1)];

/** Picks a key from `{ value: weight }` proportionally to the weights. */
function weightedPick<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rand() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

const pad = (value: number, width: number): string =>
  String(value).padStart(width, "0");

// ---------------------------------------------------------------------------
// Ahmedabad parking lots
// ---------------------------------------------------------------------------

interface ParkingLotSeed {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  totalSpaces: number;
  pricePerHour: number;
  status: ParkingLotStatus;
  /** Index into OWNER_SEEDS. */
  owner: number;
}

const CITY = "Ahmedabad";

const PARKING_LOTS: ParkingLotSeed[] = [
  { id: "kalupur-station-parking", name: "Kalupur Railway Station Parking", description: "24x7 paid parking outside the main station entrance", address: "Kalupur Railway Station Road, Kalupur", latitude: 23.0272, longitude: 72.6008, totalSpaces: 240, pricePerHour: 30, status: ParkingLotStatus.ACTIVE, owner: 0 },
  { id: "svp-airport-t1-parking", name: "SVP Airport Terminal 1 Parking", description: "Short-stay parking facing the domestic terminal", address: "Sardar Vallabhbhai Patel International Airport, Hansol", latitude: 23.0733, longitude: 72.6265, totalSpaces: 320, pricePerHour: 60, status: ParkingLotStatus.ACTIVE, owner: 0 },
  { id: "svp-airport-t2-parking", name: "SVP Airport Terminal 2 Parking", description: "Multi-level parking at the international terminal", address: "Airport Approach Road, Hansol", latitude: 23.0771, longitude: 72.6301, totalSpaces: 280, pricePerHour: 70, status: ParkingLotStatus.ACTIVE, owner: 0 },
  { id: "cg-road-parking", name: "CG Road Multilevel Parking", description: "Covered multilevel parking in the CG Road shopping stretch", address: "Chimanlal Girdharlal Road, Navrangpura", latitude: 23.0302, longitude: 72.5604, totalSpaces: 180, pricePerHour: 40, status: ParkingLotStatus.ACTIVE, owner: 1 },
  { id: "law-garden-parking", name: "Law Garden Night Market Parking", description: "Evening market parking beside Law Garden", address: "Netaji Road, Ellisbridge", latitude: 23.0232, longitude: 72.5621, totalSpaces: 120, pricePerHour: 30, status: ParkingLotStatus.ACTIVE, owner: 1 },
  { id: "alpha-one-mall-parking", name: "AlphaOne Mall Basement Parking", description: "Basement parking with mall entry access", address: "Vastrapur Lake Road, Vastrapur", latitude: 23.0387, longitude: 72.5305, totalSpaces: 400, pricePerHour: 40, status: ParkingLotStatus.ACTIVE, owner: 1 },
  { id: "vastrapur-lake-parking", name: "Vastrapur Lake Parking", description: "Surface parking beside the lakefront walkway", address: "Vastrapur Lake, Vastrapur", latitude: 23.0403, longitude: 72.5288, totalSpaces: 90, pricePerHour: 20, status: ParkingLotStatus.ACTIVE, owner: 1 },
  { id: "iscon-cross-road-parking", name: "Iscon Cross Road Parking", description: "Open lot at the SG Highway junction", address: "Iscon Cross Road, SG Highway", latitude: 23.0272, longitude: 72.5073, totalSpaces: 150, pricePerHour: 45, status: ParkingLotStatus.ACTIVE, owner: 2 },
  { id: "sindhu-bhavan-parking", name: "Sindhu Bhavan Road Parking", description: "Restaurant strip parking with valet lane", address: "Sindhu Bhavan Road, Bodakdev", latitude: 23.0452, longitude: 72.5032, totalSpaces: 200, pricePerHour: 50, status: ParkingLotStatus.ACTIVE, owner: 2 },
  { id: "bodakdev-office-parking", name: "Bodakdev Corporate Park Parking", description: "Visitor parking for the corporate park towers", address: "Rajpath Club Road, Bodakdev", latitude: 23.0345, longitude: 72.5108, totalSpaces: 160, pricePerHour: 40, status: ParkingLotStatus.ACTIVE, owner: 2 },
  { id: "prahlad-nagar-garden-parking", name: "Prahlad Nagar Garden Parking", description: "Parking beside the garden's east gate", address: "Prahlad Nagar Garden Road, Prahlad Nagar", latitude: 23.0106, longitude: 72.5101, totalSpaces: 110, pricePerHour: 30, status: ParkingLotStatus.ACTIVE, owner: 2 },
  { id: "kankaria-lake-parking", name: "Kankaria Lakefront Parking", description: "Large visitor lot at the lakefront main gate", address: "Kankaria Lakefront, Maninagar", latitude: 22.9951, longitude: 72.6004, totalSpaces: 350, pricePerHour: 25, status: ParkingLotStatus.ACTIVE, owner: 3 },
  { id: "maninagar-station-parking", name: "Maninagar Station Parking", description: "Commuter parking outside Maninagar station", address: "Maninagar Railway Station Road, Maninagar", latitude: 22.9964, longitude: 72.6023, totalSpaces: 140, pricePerHour: 25, status: ParkingLotStatus.ACTIVE, owner: 3 },
  { id: "riverfront-west-parking", name: "Sabarmati Riverfront West Parking", description: "Promenade parking on the west bank", address: "Sabarmati Riverfront West, Ellisbridge", latitude: 23.0225, longitude: 72.5766, totalSpaces: 260, pricePerHour: 30, status: ParkingLotStatus.ACTIVE, owner: 3 },
  { id: "riverfront-east-parking", name: "Sabarmati Riverfront East Parking", description: "Event parking near the flower park", address: "Sabarmati Riverfront East, Shahibaug", latitude: 23.0512, longitude: 72.5842, totalSpaces: 220, pricePerHour: 30, status: ParkingLotStatus.ACTIVE, owner: 3 },
  { id: "motera-stadium-parking", name: "Narendra Modi Stadium Parking", description: "Match-day parking at Gate 3", address: "Motera Stadium Road, Motera", latitude: 23.0919, longitude: 72.5975, totalSpaces: 500, pricePerHour: 35, status: ParkingLotStatus.ACTIVE, owner: 4 },
  { id: "science-city-parking", name: "Science City Visitor Parking", description: "Visitor parking outside the aquatics gallery", address: "Science City Road, Sola", latitude: 23.0783, longitude: 72.5042, totalSpaces: 300, pricePerHour: 25, status: ParkingLotStatus.ACTIVE, owner: 4 },
  { id: "sabarmati-ashram-parking", name: "Sabarmati Ashram Parking", description: "Tourist coach and car parking near the ashram", address: "Ashram Road, Sabarmati", latitude: 23.0606, longitude: 72.5809, totalSpaces: 130, pricePerHour: 20, status: ParkingLotStatus.ACTIVE, owner: 4 },
  { id: "civil-hospital-parking", name: "Civil Hospital Parking", description: "Attendant and visitor parking at the Asarwa campus", address: "Civil Hospital Campus, Asarwa", latitude: 23.0537, longitude: 72.6067, totalSpaces: 200, pricePerHour: 15, status: ParkingLotStatus.ACTIVE, owner: 4 },
  { id: "sterling-hospital-parking", name: "Sterling Hospital Parking", description: "Covered parking for patients and visitors", address: "Sterling Hospital Road, Memnagar", latitude: 23.0479, longitude: 72.5406, totalSpaces: 100, pricePerHour: 25, status: ParkingLotStatus.ACTIVE, owner: 5 },
  { id: "thaltej-drive-in-parking", name: "Drive-In Road Parking", description: "Cinema and food-court parking", address: "Drive-In Road, Thaltej", latitude: 23.0464, longitude: 72.5329, totalSpaces: 170, pricePerHour: 35, status: ParkingLotStatus.ACTIVE, owner: 5 },
  { id: "gurukul-road-parking", name: "Gurukul Road Parking", description: "Compact lot near the Gurukul crossroads", address: "Gurukul Road, Memnagar", latitude: 23.0432, longitude: 72.5457, totalSpaces: 8, pricePerHour: 30, status: ParkingLotStatus.ACTIVE, owner: 5 },
  { id: "naranpura-parking", name: "Naranpura Civic Parking", description: "Municipal surface parking near the sports complex", address: "Naranpura Cross Road, Naranpura", latitude: 23.0563, longitude: 72.5583, totalSpaces: 120, pricePerHour: 20, status: ParkingLotStatus.ACTIVE, owner: 5 },
  { id: "paldi-parking", name: "Paldi Municipal Parking", description: "Street-level parking beside the AMC office", address: "Bhattha Road, Paldi", latitude: 23.0104, longitude: 72.5672, totalSpaces: 95, pricePerHour: 20, status: ParkingLotStatus.ACTIVE, owner: 0 },
  { id: "ashram-road-parking", name: "Ashram Road Office Parking", description: "Weekday parking for the Ashram Road offices", address: "Ashram Road, Navrangpura", latitude: 23.0361, longitude: 72.5701, totalSpaces: 140, pricePerHour: 35, status: ParkingLotStatus.ACTIVE, owner: 0 },
  { id: "ellisbridge-parking", name: "Ellisbridge Riverside Parking", description: "Parking at the old bridge approach", address: "Ellisbridge Circle, Ellisbridge", latitude: 23.0231, longitude: 72.5712, totalSpaces: 85, pricePerHour: 25, status: ParkingLotStatus.ACTIVE, owner: 0 },
  { id: "satellite-parking", name: "Satellite Shopping Parking", description: "Retail parking near Shivranjani crossroads", address: "Shivranjani Cross Road, Satellite", latitude: 23.0296, longitude: 72.5288, totalSpaces: 130, pricePerHour: 35, status: ParkingLotStatus.ACTIVE, owner: 1 },
  { id: "jodhpur-char-rasta-parking", name: "Jodhpur Char Rasta Parking", description: "Open lot at the Jodhpur crossroads", address: "Jodhpur Char Rasta, Satellite", latitude: 23.0183, longitude: 72.5229, totalSpaces: 75, pricePerHour: 30, status: ParkingLotStatus.ACTIVE, owner: 1 },
  { id: "vejalpur-parking", name: "Vejalpur Market Parking", description: "Market-side parking with two-wheeler bays", address: "Vejalpur Main Road, Vejalpur", latitude: 23.0004, longitude: 72.5258, totalSpaces: 70, pricePerHour: 20, status: ParkingLotStatus.ACTIVE, owner: 2 },
  { id: "bopal-parking", name: "Bopal Circle Parking", description: "Surface parking at Bopal circle", address: "Bopal Circle, Bopal", latitude: 23.0331, longitude: 72.4702, totalSpaces: 110, pricePerHour: 25, status: ParkingLotStatus.ACTIVE, owner: 2 },
  { id: "shilaj-parking", name: "Shilaj Village Parking", description: "Roadside lot on the Shilaj approach", address: "Shilaj Road, Shilaj", latitude: 23.0402, longitude: 72.4803, totalSpaces: 60, pricePerHour: 20, status: ParkingLotStatus.ACTIVE, owner: 3 },
  { id: "gota-parking", name: "Gota Crossroads Parking", description: "Highway-side parking at Gota", address: "Gota Cross Road, Gota", latitude: 23.1004, longitude: 72.5452, totalSpaces: 105, pricePerHour: 20, status: ParkingLotStatus.ACTIVE, owner: 3 },
  { id: "chandkheda-parking", name: "Chandkheda Station Parking", description: "Commuter parking near Chandkheda station", address: "New CG Road, Chandkheda", latitude: 23.1102, longitude: 72.5821, totalSpaces: 90, pricePerHour: 20, status: ParkingLotStatus.ACTIVE, owner: 4 },
  { id: "ranip-parking", name: "Ranip BRTS Parking", description: "Park-and-ride lot at the BRTS stop", address: "Ranip BRTS Stop, Ranip", latitude: 23.0781, longitude: 72.5673, totalSpaces: 80, pricePerHour: 15, status: ParkingLotStatus.ACTIVE, owner: 4 },
  { id: "ghatlodia-parking", name: "Ghatlodia Market Parking", description: "Neighbourhood market parking", address: "Ghatlodia Main Road, Ghatlodia", latitude: 23.0698, longitude: 72.5449, totalSpaces: 65, pricePerHour: 20, status: ParkingLotStatus.ACTIVE, owner: 5 },
  { id: "shahibaug-parking", name: "Shahibaug Heritage Parking", description: "Parking near the Shahibaug palace grounds", address: "Shahibaug Road, Shahibaug", latitude: 23.0573, longitude: 72.5941, totalSpaces: 100, pricePerHour: 25, status: ParkingLotStatus.ACTIVE, owner: 5 },
  { id: "bapunagar-parking", name: "Bapunagar Parking", description: "Local surface parking off the ring road", address: "Bapunagar Cross Road, Bapunagar", latitude: 23.0434, longitude: 72.6351, totalSpaces: 55, pricePerHour: 15, status: ParkingLotStatus.ACTIVE, owner: 0 },
  { id: "nikol-parking", name: "Nikol Ring Road Parking", description: "Open lot on the SP Ring Road service lane", address: "Nikol Gam Road, Nikol", latitude: 23.0502, longitude: 72.6603, totalSpaces: 70, pricePerHour: 15, status: ParkingLotStatus.ACTIVE, owner: 1 },
  { id: "odhav-parking", name: "Odhav Industrial Parking", description: "Truck and car parking in the industrial estate", address: "Odhav Ring Road, Odhav", latitude: 23.0201, longitude: 72.6652, totalSpaces: 120, pricePerHour: 15, status: ParkingLotStatus.INACTIVE, owner: 2 },
  { id: "sarkhej-roza-parking", name: "Sarkhej Roza Parking", description: "Heritage-site parking (closed for restoration)", address: "Sarkhej Roza, Makarba", latitude: 22.9882, longitude: 72.5006, totalSpaces: 90, pricePerHour: 15, status: ParkingLotStatus.CLOSED, owner: 3 },
];

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

const OWNER_SEEDS = [
  { fullName: "Demo Parking Owner", email: "owner@example.com" },
  { fullName: "Hiren Patel", email: "hiren.patel@parkmitra.test" },
  { fullName: "Nisha Shah", email: "nisha.shah@parkmitra.test" },
  { fullName: "Rakesh Thakkar", email: "rakesh.thakkar@parkmitra.test" },
  { fullName: "Ananya Desai", email: "ananya.desai@parkmitra.test" },
  { fullName: "Imran Qureshi", email: "imran.qureshi@parkmitra.test" },
];

const FIRST_NAMES = [
  "Aarav", "Advait", "Aditi", "Ananya", "Bhavin", "Chirag", "Darshan", "Devang",
  "Dhruvi", "Falguni", "Gaurav", "Harsh", "Heta", "Hetal", "Isha", "Jaymin",
  "Kavya", "Kunal", "Krupa", "Manav", "Meera", "Mihir", "Nidhi", "Nirav",
  "Parth", "Pooja", "Priyank", "Rachit", "Riya", "Ronak", "Sagar", "Sanjana",
  "Shreya", "Siddharth", "Tanvi", "Tejas", "Urvi", "Vandan", "Vishal", "Yash",
];

const LAST_NAMES = [
  "Amin", "Bhatt", "Chauhan", "Dave", "Desai", "Gandhi", "Joshi", "Kotak",
  "Mehta", "Modi", "Panchal", "Parikh", "Patel", "Rana", "Shah", "Solanki",
  "Thakkar", "Trivedi", "Vyas", "Zala",
];

const VEHICLE_MAKES: Record<VehicleType, { make: string; models: string[] }[]> = {
  [VehicleType.FOUR_WHEELER]: [
    { make: "Maruti Suzuki", models: ["Swift", "Baleno", "Brezza", "Ertiga"] },
    { make: "Hyundai", models: ["i20", "Creta", "Venue"] },
    { make: "Tata", models: ["Nexon", "Punch", "Altroz"] },
    { make: "Mahindra", models: ["XUV700", "Thar", "Scorpio"] },
    { make: "Honda", models: ["City", "Amaze"] },
  ],
  [VehicleType.TWO_WHEELER]: [
    { make: "Honda", models: ["Activa", "Shine"] },
    { make: "Hero", models: ["Splendor", "Xtreme"] },
    { make: "Bajaj", models: ["Pulsar", "Chetak"] },
    { make: "TVS", models: ["Jupiter", "Apache"] },
    { make: "Royal Enfield", models: ["Classic 350", "Hunter 350"] },
  ],
};

const VEHICLE_COLORS = ["White", "Silver", "Grey", "Black", "Red", "Blue", "Brown"];

/** Ahmedabad RTO series. */
const RTO_CODES = ["GJ01", "GJ27"];
const REG_LETTERS = ["AA", "AB", "BR", "CJ", "DK", "EL", "FM", "GN", "HP", "JQ"];

function makeRegistration(index: number): string {
  return `${RTO_CODES[index % RTO_CODES.length]}${
    REG_LETTERS[Math.floor(index / RTO_CODES.length) % REG_LETTERS.length]
  }${pad(1000 + ((index * 37) % 9000), 4)}`;
}

// ---------------------------------------------------------------------------
// Complaints
// ---------------------------------------------------------------------------

const COMPLAINT_TEMPLATES: { category: string; subject: string; description: string }[] = [
  { category: "BILLING", subject: "Charged for extra hour", description: "I checked out within the booked slot but the final amount includes an extra hour." },
  { category: "BILLING", subject: "Payment deducted twice", description: "The amount was debited twice from my account for a single booking." },
  { category: "SLOT_UNAVAILABLE", subject: "No slot free on arrival", description: "The app showed spaces available, but the attendant said the lot was full." },
  { category: "SLOT_UNAVAILABLE", subject: "Reserved bay was occupied", description: "Another vehicle was parked in the bay I had reserved." },
  { category: "STAFF_BEHAVIOUR", subject: "Attendant refused the booking QR", description: "The attendant did not accept the booking confirmation and asked for cash." },
  { category: "SAFETY", subject: "Poor lighting at night", description: "The lower basement level has several lights out and feels unsafe after 9 pm." },
  { category: "SAFETY", subject: "Vehicle scratched in the lot", description: "There is a fresh scratch on the driver-side door after parking here." },
  { category: "CLEANLINESS", subject: "Waterlogging in the basement", description: "The ramp and lower level were flooded after the rain." },
  { category: "CLEANLINESS", subject: "Garbage near the entry gate", description: "Uncollected garbage is blocking part of the entry lane." },
  { category: "APP_ISSUE", subject: "Check-in did not register", description: "The app kept spinning at check-in and eventually marked the booking expired." },
  { category: "APP_ISSUE", subject: "Wrong location on map", description: "The pin on the map is roughly a kilometre away from the actual entrance." },
  { category: "ACCESS", subject: "Gate barrier not opening", description: "The boom barrier did not open and there was no attendant at the gate." },
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main() {
  const now = Date.now();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@12345";
  const adminName = process.env.ADMIN_NAME ?? "ParkMitra Admin";
  const adminHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN, fullName: adminName, passwordHash: adminHash },
    create: {
      fullName: adminName,
      email: adminEmail,
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });

  // Full reset of the operational data so re-seeding stays idempotent.
  // Deleting bookings cascades their LocationAudit rows.
  await prisma.complaint.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.parkingLot.deleteMany({});

  // --- owners ---------------------------------------------------------------
  const owners: User[] = [];
  for (const [index, seed] of OWNER_SEEDS.entries()) {
    const phone = `98${pad(25000000 + index * 111111, 8)}`;
    owners.push(
      await prisma.user.upsert({
        where: { email: seed.email },
        update: { role: Role.OWNER, fullName: seed.fullName, passwordHash, phone },
        create: {
          fullName: seed.fullName,
          email: seed.email,
          passwordHash,
          phone,
          role: Role.OWNER,
        },
      }),
    );
  }

  // --- drivers --------------------------------------------------------------
  const users: User[] = [];
  for (let i = 0; i < USER_COUNT; i += 1) {
    const fullName =
      i === 0
        ? "Demo Driver"
        : `${FIRST_NAMES[i % FIRST_NAMES.length]} ${
            LAST_NAMES[Math.floor(i / FIRST_NAMES.length + i * 3) % LAST_NAMES.length]
          }`;
    const email = i === 0 ? "user@example.com" : `driver${pad(i, 3)}@parkmitra.test`;
    const phone = `97${pad(10000000 + i * 137911, 8)}`;

    users.push(
      await prisma.user.upsert({
        where: { email },
        update: { role: Role.USER, fullName, passwordHash, phone },
        create: { fullName, email, passwordHash, phone, role: Role.USER },
      }),
    );
  }

  // --- parking lots ---------------------------------------------------------
  await prisma.parkingLot.createMany({
    data: PARKING_LOTS.map((lot) => {
      const { owner, ...rest } = lot;
      return {
        ...rest,
        city: CITY,
        ownerId: owners[owner].id,
        availableSpaces: rest.totalSpaces,
        imageUrl: `https://example.com/parking/${rest.id}.jpg`,
        photos: [
          `https://example.com/parking/${rest.id}-1.jpg`,
          `https://example.com/parking/${rest.id}-2.jpg`,
        ],
      };
    }),
  });

  // --- vehicles -------------------------------------------------------------
  interface SeedVehicle {
    id: string;
    userId: string;
    registration: string;
    type: VehicleType;
    imageUrl: string;
    imagePublicId: string;
    make: string;
    model: string;
    color: string;
  }

  const vehicles: SeedVehicle[] = [];
  let regIndex = 0;

  for (const user of users) {
    const count = randInt(1, 2);
    for (let v = 0; v < count; v += 1) {
      const type = rand() < 0.45 ? VehicleType.TWO_WHEELER : VehicleType.FOUR_WHEELER;
      const brand = pick(VEHICLE_MAKES[type]);
      const registration = makeRegistration(regIndex);
      regIndex += 1;

      vehicles.push({
        id: `veh_seed_${pad(regIndex, 4)}`,
        userId: user.id,
        registration,
        type,
        imageUrl: `https://example.com/vehicles/${registration}.jpg`,
        imagePublicId: `parkmitra/seed/vehicles/${registration}`,
        make: brand.make,
        model: pick(brand.models),
        color: pick(VEHICLE_COLORS),
      });
    }
  }

  await prisma.vehicle.createMany({
    data: vehicles.map((vehicle, index) => ({
      ...vehicle,
      isDefault: index === 0 || vehicles[index - 1].userId !== vehicle.userId,
      verificationStatus: rand() < 0.75 ? "VERIFIED" : rand() < 0.6 ? "NEEDS_REVIEW" : null,
      verifiedAt: new Date(now - randInt(1, HISTORY_DAYS) * DAY),
    })),
  });

  const vehiclesByUser = new Map<string, SeedVehicle[]>();
  for (const vehicle of vehicles) {
    const list = vehiclesByUser.get(vehicle.userId) ?? [];
    list.push(vehicle);
    vehiclesByUser.set(vehicle.userId, list);
  }

  // --- bookings -------------------------------------------------------------
  const bookableLots = PARKING_LOTS.filter(
    (lot) => lot.status === ParkingLotStatus.ACTIVE,
  );

  const DURATIONS = [30, 60, 60, 90, 120, 120, 180, 240, 300, 480];

  const CANCELLATION_REASONS = [
    "Plans changed",
    "Found parking closer to the destination",
    "Booked the wrong parking lot",
    "Trip postponed",
    "Booked the wrong time slot",
  ];

  interface SeedBooking {
    id: string;
    userId: string;
    parkingLotId: string;
    vehicleId: string;
    vehicleNumber: string;
    vehicleRegistration: string;
    vehicleType: VehicleType;
    vehicleImageUrl: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleColor: string;
    durationMinutes: number;
    reservedAt: Date;
    checkInDeadline: Date;
    checkInTime: Date | null;
    sessionEndsAt: Date | null;
    checkOutTime: Date | null;
    estimatedAmount: number;
    finalAmount: number | null;
    status: BookingStatus;
    cancellationReason: string | null;
    cancelledAt: Date | null;
    lastSeenAt: Date | null;
    createdAt: Date;
  }

  const bookings: SeedBooking[] = [];
  /** Live (RESERVED/ACTIVE) bookings per lot, used to derive availableSpaces. */
  const occupancy = new Map<string, number>();

  const rate = (lot: ParkingLotSeed, type: VehicleType): number =>
    type === VehicleType.TWO_WHEELER ? lot.pricePerHour * 0.5 : lot.pricePerHour;

  const amountFor = (lot: ParkingLotSeed, type: VehicleType, minutes: number): number =>
    Math.round(rate(lot, type) * Math.max(1, Math.ceil(minutes / 60)));

  function buildBooking(
    index: number,
    status: BookingStatus,
    createdAt: Date,
  ): SeedBooking {
    const lot = pick(bookableLots);
    const user = pick(users);
    const vehicle = pick(vehiclesByUser.get(user.id)!);
    const durationMinutes = pick(DURATIONS);

    const reservedAt = new Date(createdAt.getTime() + randInt(2, 25) * MINUTE);
    const checkInDeadline = new Date(reservedAt.getTime() + 15 * MINUTE);
    const estimatedAmount = amountFor(lot, vehicle.type, durationMinutes);

    const booking: SeedBooking = {
      id: `bk_seed_${pad(index, 5)}`,
      userId: user.id,
      parkingLotId: lot.id,
      vehicleId: vehicle.id,
      vehicleNumber: vehicle.registration,
      vehicleRegistration: vehicle.registration,
      vehicleType: vehicle.type,
      vehicleImageUrl: vehicle.imageUrl,
      vehicleMake: vehicle.make,
      vehicleModel: vehicle.model,
      vehicleColor: vehicle.color,
      durationMinutes,
      reservedAt,
      checkInDeadline,
      checkInTime: null,
      sessionEndsAt: null,
      checkOutTime: null,
      estimatedAmount,
      finalAmount: null,
      status,
      cancellationReason: null,
      cancelledAt: null,
      lastSeenAt: null,
      createdAt,
    };

    if (status === BookingStatus.COMPLETED) {
      const checkInTime = new Date(reservedAt.getTime() + randInt(0, 14) * MINUTE);
      // Most drivers leave near their booked duration; some over- or under-stay.
      const actualMinutes = Math.max(
        15,
        durationMinutes + randInt(-20, 45),
      );
      booking.checkInTime = checkInTime;
      booking.sessionEndsAt = new Date(checkInTime.getTime() + durationMinutes * MINUTE);
      booking.checkOutTime = new Date(checkInTime.getTime() + actualMinutes * MINUTE);
      booking.finalAmount = amountFor(lot, vehicle.type, actualMinutes);
      booking.lastSeenAt = booking.checkOutTime;
    } else if (status === BookingStatus.ACTIVE) {
      const elapsed = randInt(5, Math.max(10, durationMinutes - 5));
      const checkInTime = new Date(now - elapsed * MINUTE);
      booking.checkInTime = checkInTime;
      booking.sessionEndsAt = new Date(checkInTime.getTime() + durationMinutes * MINUTE);
      booking.lastSeenAt = new Date(now - randInt(0, 4) * MINUTE);
    } else if (status === BookingStatus.CANCELLED) {
      booking.cancelledAt = new Date(createdAt.getTime() + randInt(1, 30) * MINUTE);
      booking.cancellationReason = pick(CANCELLATION_REASONS);
    } else if (status === BookingStatus.RESERVED) {
      booking.lastSeenAt = new Date(now - randInt(0, 10) * MINUTE);
    }

    if (status === BookingStatus.RESERVED || status === BookingStatus.ACTIVE) {
      occupancy.set(lot.id, (occupancy.get(lot.id) ?? 0) + 1);
    }

    return booking;
  }

  // Historical bookings: everything older than today, terminal statuses only.
  const historyWeights: Record<
    Extract<BookingStatus, "COMPLETED" | "CANCELLED" | "EXPIRED">,
    number
  > = { COMPLETED: 76, CANCELLED: 13, EXPIRED: 11 };

  let bookingIndex = 0;
  for (let i = 0; i < HISTORY_BOOKINGS; i += 1) {
    bookingIndex += 1;
    // Skew toward recent days so the dashboard trend looks alive.
    const daysAgo = 1 + Math.floor(rand() ** 1.6 * (HISTORY_DAYS - 1));
    const createdAt = new Date(
      now - daysAgo * DAY + randInt(7 * 60, 21 * 60) * MINUTE - randInt(0, 23) * HOUR,
    );
    bookings.push(
      buildBooking(bookingIndex, BookingStatus[weightedPick(historyWeights)], createdAt),
    );
  }

  // Live bookings: reserved (awaiting check-in) and active (parked right now).
  for (let i = 0; i < RESERVED_BOOKINGS; i += 1) {
    bookingIndex += 1;
    bookings.push(
      buildBooking(
        bookingIndex,
        BookingStatus.RESERVED,
        new Date(now - randInt(1, 12) * MINUTE),
      ),
    );
  }

  for (let i = 0; i < ACTIVE_BOOKINGS; i += 1) {
    bookingIndex += 1;
    bookings.push(
      buildBooking(
        bookingIndex,
        BookingStatus.ACTIVE,
        new Date(now - randInt(20, 400) * MINUTE),
      ),
    );
  }

  for (const batch of chunk(bookings, CHUNK_SIZE)) {
    await prisma.booking.createMany({ data: batch });
  }

  // Keep availableSpaces consistent with the live bookings we just created.
  for (const lot of PARKING_LOTS) {
    const taken = Math.min(occupancy.get(lot.id) ?? 0, lot.totalSpaces);
    if (taken === 0) continue;
    await prisma.parkingLot.update({
      where: { id: lot.id },
      data: { availableSpaces: lot.totalSpaces - taken },
    });
  }

  // --- complaints -----------------------------------------------------------
  const complaintSources = bookings.filter(
    (booking) =>
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.EXPIRED,
  );

  const complaintWeights: Record<ComplaintStatus, number> = {
    PENDING: 34,
    IN_REVIEW: 21,
    RESOLVED: 36,
    REJECTED: 9,
  };

  const complaints = Array.from({ length: COMPLAINT_COUNT }, (_, i) => {
    const source = pick(complaintSources);
    const template = pick(COMPLAINT_TEMPLATES);
    const status = weightedPick(complaintWeights);
    const createdAt = new Date(
      (source.checkOutTime ?? source.checkInDeadline).getTime() +
        randInt(10, 48 * 60) * MINUTE,
    );

    return {
      id: `cmp_seed_${pad(i + 1, 4)}`,
      userId: source.userId,
      // A few complaints are filed against a lot without a specific booking.
      bookingId: rand() < 0.85 ? source.id : null,
      parkingLotId: source.parkingLotId,
      category: template.category,
      subject: template.subject,
      description: `${template.description} (Booking ${source.id}, ${CITY})`,
      status: ComplaintStatus[status],
      resolvedAt:
        status === ComplaintStatus.RESOLVED
          ? new Date(createdAt.getTime() + randInt(2, 96) * HOUR)
          : null,
      createdAt: createdAt.getTime() > now ? new Date(now - randInt(1, 240) * MINUTE) : createdAt,
    };
  });

  for (const batch of chunk(complaints, CHUNK_SIZE)) {
    await prisma.complaint.createMany({ data: batch });
  }

  const liveCount = [...occupancy.values()].reduce((sum, n) => sum + n, 0);

  console.log(
    [
      `Seed completed for ${CITY}:`,
      `  admin      : ${admin.email} (role=${admin.role})`,
      `  owners     : ${owners.length} (login owner@example.com / ${DEMO_PASSWORD})`,
      `  drivers    : ${users.length} (login user@example.com / ${DEMO_PASSWORD})`,
      `  parkings   : ${PARKING_LOTS.length}`,
      `  vehicles   : ${vehicles.length}`,
      `  bookings   : ${bookings.length} (${liveCount} live: ${RESERVED_BOOKINGS} reserved, ${ACTIVE_BOOKINGS} active)`,
      `  complaints : ${complaints.length}`,
    ].join("\n"),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
