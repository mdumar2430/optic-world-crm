/**
 * Demo dataset for the mock data source.
 *
 * Dates are generated relative to "today" so the dashboard and timelines always
 * look current, whenever the demo is opened.
 */
import type {
  Customer,
  EyePrescription,
  OldGlasses,
  Prescription,
  ProductOrder,
  ServiceJob,
  Visit,
} from '@/types';
import type { MockDb, MockUser } from './store';

/* -------------------------------------------------------------------------- */
/* Small builders                                                             */
/* -------------------------------------------------------------------------- */

function daysAgo(days: number, hour = 11, minute = 15): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function daysAhead(days: number, hour = 17, minute = 0): Date {
  return daysAgo(-days, hour, minute);
}

function birthDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

function eye(values: Partial<EyePrescription>): EyePrescription {
  return {
    distanceSph: '',
    distanceCyl: '',
    distanceAxis: '',
    nearSph: '',
    nearCyl: '',
    nearAxis: '',
    add: '',
    pd: '',
    ...values,
  };
}

function prescription(values: {
  right: Partial<EyePrescription>;
  left: Partial<EyePrescription>;
  binocularPd?: string;
  doctor?: string;
  notes?: string;
}): Prescription {
  return {
    rightEye: eye(values.right),
    leftEye: eye(values.left),
    binocularPd: values.binocularPd ?? '',
    doctor: values.doctor ?? '',
    notes: values.notes ?? '',
  };
}

let orderSeq = 0;
function order(values: Partial<ProductOrder> & Pick<ProductOrder, 'amount'>): ProductOrder {
  orderSeq += 1;
  return {
    id: `ord_seed_${orderSeq}`,
    orderCode: `ORD-${`${orderSeq}`.padStart(5, '0')}`,
    orderType: 'spectacles',
    frameCategory: 'full_rim',
    frameCompany: '',
    frameModel: '',
    lensCompany: '',
    lensName: '',
    quantity: 1,
    expectedDeliveryDate: null,
    deliveredDate: null,
    status: 'pending',
    notes: '',
    ...values,
  };
}

let serviceSeq = 0;
function service(values: Partial<ServiceJob> & Pick<ServiceJob, 'serviceType'>): ServiceJob {
  serviceSeq += 1;
  return {
    id: `srv_seed_${serviceSeq}`,
    serviceCode: `SRV-${`${serviceSeq}`.padStart(5, '0')}`,
    description: '',
    charge: 0,
    paymentStatus: 'pending',
    expectedReadyDate: null,
    deliveredDate: null,
    status: 'received',
    notes: '',
    ...values,
  };
}

/* -------------------------------------------------------------------------- */
/* Staff                                                                      */
/* -------------------------------------------------------------------------- */

const UID = {
  admin: 'uid_ravi_admin',
  priya: 'uid_priya_employee',
  arjun: 'uid_arjun_employee',
  deepa: 'uid_deepa_inactive',
} as const;

function buildUsers(): MockUser[] {
  return [
    {
      id: UID.admin,
      fullName: 'Ravi Kumar',
      email: 'admin@opticworld.in',
      role: 'admin',
      isActive: true,
      password: 'Admin@123',
      createdAt: daysAgo(400, 9, 0),
      createdBy: null,
      updatedAt: daysAgo(400, 9, 0),
      updatedBy: null,
    },
    {
      id: UID.priya,
      fullName: 'Priya Nair',
      email: 'priya@opticworld.in',
      role: 'employee',
      isActive: true,
      password: 'Staff@123',
      createdAt: daysAgo(320, 10, 30),
      createdBy: UID.admin,
      updatedAt: daysAgo(320, 10, 30),
      updatedBy: UID.admin,
    },
    {
      id: UID.arjun,
      fullName: 'Arjun Menon',
      email: 'arjun@opticworld.in',
      role: 'employee',
      isActive: true,
      password: 'Staff@123',
      createdAt: daysAgo(120, 12, 0),
      createdBy: UID.admin,
      updatedAt: daysAgo(120, 12, 0),
      updatedBy: UID.admin,
    },
    {
      // Kept so historical "Created by" references still resolve to a name.
      id: UID.deepa,
      fullName: 'Deepa Rao',
      email: 'deepa@opticworld.in',
      role: 'employee',
      isActive: false,
      password: 'Staff@123',
      createdAt: daysAgo(500, 9, 45),
      createdBy: UID.admin,
      updatedAt: daysAgo(60, 18, 0),
      updatedBy: UID.admin,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Customers                                                                  */
/* -------------------------------------------------------------------------- */

interface CustomerSeed {
  code: string;
  name: string;
  phone: string;
  alternatePhone?: string;
  dateOfBirth?: Date | null;
  age?: number | null;
  gender?: Customer['gender'];
  address?: Partial<Customer['address']>;
  hospital?: string;
  referredBy?: string;
  referralDetails?: string;
  notes?: string;
  customerType?: Customer['customerType'];
  primaryCustomerId?: string | null;
  relationship?: Customer['relationship'];
  relationshipNote?: string | null;
  isActive?: boolean;
  createdBy?: string;
  createdDaysAgo: number;
}

function customer(seed: CustomerSeed): Customer {
  const createdAt = daysAgo(seed.createdDaysAgo, 10, 0);
  return {
    id: seed.code,
    customerCode: seed.code,
    name: seed.name,
    nameLower: seed.name.toLowerCase(),
    phone: seed.phone,
    alternatePhone: seed.alternatePhone ?? '',
    dateOfBirth: seed.dateOfBirth ?? null,
    age: seed.age ?? null,
    gender: seed.gender ?? null,
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      ...seed.address,
    },
    hospital: seed.hospital ?? '',
    referredBy: seed.referredBy ?? '',
    referralDetails: seed.referralDetails ?? '',
    notes: seed.notes ?? '',
    customerType: seed.customerType ?? 'primary',
    primaryCustomerId: seed.primaryCustomerId ?? null,
    relationship: seed.relationship ?? null,
    relationshipNote: seed.relationshipNote ?? null,
    visitCount: 0,
    lastVisitAt: null,
    isActive: seed.isActive ?? true,
    createdAt,
    createdBy: seed.createdBy ?? UID.priya,
    updatedAt: createdAt,
    updatedBy: seed.createdBy ?? UID.priya,
  };
}

const KHAN_ADDRESS = {
  line1: '14/3 Rose Villa',
  line2: 'Nungambakkam High Road',
  city: 'Chennai',
  state: 'Tamil Nadu',
  postalCode: '600034',
};

const IYER_ADDRESS = {
  line1: 'Flat 4B, Sree Apartments',
  line2: 'Anna Nagar West',
  city: 'Chennai',
  state: 'Tamil Nadu',
  postalCode: '600040',
};

function buildCustomers(): Customer[] {
  return [
    // Family 1 — the Khans.
    customer({
      code: 'CUST-000001',
      name: 'Ahmed Khan',
      phone: '9876543210',
      alternatePhone: '4428334455',
      dateOfBirth: birthDate(1989, 4, 12),
      age: 36,
      gender: 'male',
      address: KHAN_ADDRESS,
      referredBy: 'Dr. Meera Krishnan',
      referralDetails: 'Routine eye check referral',
      notes: 'Prefers lightweight frames. Sensitive to glare while driving at night.',
      createdDaysAgo: 233,
      createdBy: UID.admin,
    }),
    customer({
      code: 'CUST-000002',
      name: 'Fatima Khan',
      phone: '9876543210',
      dateOfBirth: birthDate(1992, 9, 3),
      age: 32,
      gender: 'female',
      address: KHAN_ADDRESS,
      customerType: 'family_member',
      primaryCustomerId: 'CUST-000001',
      relationship: 'spouse',
      notes: 'Shares the household phone number with Ahmed.',
      createdDaysAgo: 190,
    }),
    customer({
      code: 'CUST-000003',
      name: 'Ali Khan',
      phone: '9876543210',
      dateOfBirth: birthDate(2014, 1, 22),
      age: 11,
      gender: 'male',
      address: KHAN_ADDRESS,
      hospital: 'Sankara Nethralaya',
      customerType: 'family_member',
      primaryCustomerId: 'CUST-000001',
      relationship: 'son',
      notes: 'School vision screening flagged distance blur.',
      createdDaysAgo: 96,
    }),
    customer({
      code: 'CUST-000004',
      name: 'Sara Khan',
      phone: '9876543210',
      dateOfBirth: birthDate(2018, 6, 9),
      age: 7,
      gender: 'female',
      address: KHAN_ADDRESS,
      customerType: 'family_member',
      primaryCustomerId: 'CUST-000001',
      relationship: 'daughter',
      createdDaysAgo: 96,
    }),

    // Family 2 — the Iyers.
    customer({
      code: 'CUST-000005',
      name: 'Ramesh Iyer',
      phone: '9840012345',
      dateOfBirth: birthDate(1966, 11, 28),
      age: 58,
      gender: 'male',
      address: IYER_ADDRESS,
      hospital: 'Apollo Speciality',
      notes: 'Post-cataract follow-up. Needs progressive lenses.',
      createdDaysAgo: 410,
      createdBy: UID.deepa,
    }),
    customer({
      code: 'CUST-000006',
      name: 'Lakshmi Iyer',
      phone: '9840012399',
      alternatePhone: '9840012345',
      dateOfBirth: birthDate(1970, 2, 14),
      age: 55,
      gender: 'female',
      address: IYER_ADDRESS,
      customerType: 'family_member',
      primaryCustomerId: 'CUST-000005',
      relationship: 'spouse',
      createdDaysAgo: 380,
      createdBy: UID.deepa,
    }),
    customer({
      code: 'CUST-000007',
      name: 'Vignesh Iyer',
      phone: '9962233445',
      dateOfBirth: birthDate(1997, 7, 30),
      age: 28,
      gender: 'male',
      address: IYER_ADDRESS,
      customerType: 'family_member',
      primaryCustomerId: 'CUST-000005',
      relationship: 'son',
      notes: 'Works long hours on a screen. Asked about blue-filter lenses.',
      createdDaysAgo: 150,
    }),

    // Family 3 — the Mathews.
    customer({
      code: 'CUST-000008',
      name: 'Joseph Mathew',
      phone: '9445566778',
      dateOfBirth: birthDate(1981, 3, 5),
      age: 44,
      gender: 'male',
      address: {
        line1: '22 Beach Road',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600041',
      },
      referredBy: 'Walk-in',
      createdDaysAgo: 64,
      createdBy: UID.arjun,
    }),
    customer({
      code: 'CUST-000009',
      name: 'Anna Mathew',
      phone: '9445566779',
      dateOfBirth: birthDate(1953, 8, 17),
      age: 72,
      gender: 'female',
      address: {
        line1: '22 Beach Road',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600041',
      },
      hospital: 'Rajan Eye Care',
      customerType: 'family_member',
      primaryCustomerId: 'CUST-000008',
      relationship: 'mother',
      notes: 'Difficulty reading small print. Bring frames to the counter for her.',
      createdDaysAgo: 64,
      createdBy: UID.arjun,
    }),

    // Individual customers.
    customer({
      code: 'CUST-000010',
      name: 'Sunita Sharma',
      phone: '9791234567',
      dateOfBirth: birthDate(1985, 12, 1),
      age: 39,
      gender: 'female',
      address: {
        line1: '7 Gandhi Street',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600017',
      },
      referredBy: 'Ahmed Khan',
      referralDetails: 'Neighbour referral',
      createdDaysAgo: 27,
    }),
    customer({
      code: 'CUST-000011',
      name: 'Mohammed Rafi',
      phone: '9003344556',
      age: 47,
      gender: 'male',
      address: {
        line1: '90 Mount Road',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600002',
      },
      notes: 'Repair customer. Frames from another store.',
      createdDaysAgo: 12,
      createdBy: UID.arjun,
    }),
    customer({
      code: 'CUST-000012',
      name: 'Grace Fernandes',
      phone: '9500911223',
      dateOfBirth: birthDate(2000, 5, 19),
      age: 25,
      gender: 'female',
      address: {
        line1: '5 Church Lane',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600028',
      },
      createdDaysAgo: 3,
    }),
    customer({
      // Soft-deleted: hidden from the default list, history intact.
      code: 'CUST-000013',
      name: 'David Thomas',
      phone: '9600877665',
      age: 51,
      gender: 'male',
      notes: 'Duplicate record created in error. Deactivated by admin.',
      isActive: false,
      createdDaysAgo: 45,
    }),
  ];
}

/* -------------------------------------------------------------------------- */
/* Visits                                                                     */
/* -------------------------------------------------------------------------- */

interface VisitSeed {
  code: string;
  customerId: string;
  daysAgo: number;
  visitType: Visit['visitType'];
  oldGlasses?: OldGlasses | null;
  arReading?: Prescription | null;
  prescription?: Prescription | null;
  orders?: ProductOrder[];
  services?: ServiceJob[];
  notes?: string;
  createdBy?: string;
}

function visit(seed: VisitSeed): Visit {
  const visitDate = daysAgo(seed.daysAgo);
  const createdBy = seed.createdBy ?? UID.priya;
  return {
    id: seed.code,
    visitCode: seed.code,
    customerId: seed.customerId,
    visitDate,
    visitType: seed.visitType,
    oldGlasses: seed.oldGlasses ?? null,
    arReading: seed.arReading ?? null,
    prescription: seed.prescription ?? null,
    orders: seed.orders ?? [],
    services: seed.services ?? [],
    notes: seed.notes ?? '',
    createdAt: visitDate,
    createdBy,
    updatedAt: visitDate,
    updatedBy: createdBy,
  };
}

function buildVisits(): Visit[] {
  let seq = 0;
  const code = () => `VISIT-${`${(seq += 1)}`.padStart(6, '0')}`;

  return [
    /* Ahmed Khan — four visits, mirroring a long-standing customer. */
    visit({
      code: code(),
      customerId: 'CUST-000001',
      daysAgo: 233,
      visitType: 'prescription',
      createdBy: UID.admin,
      notes: 'First visit. Complained of eye strain after long drives.',
      prescription: prescription({
        right: { distanceSph: '-1.25', distanceCyl: '-0.50', distanceAxis: '180', pd: '32' },
        left: { distanceSph: '-1.00', distanceCyl: '-0.25', distanceAxis: '175', pd: '32' },
        binocularPd: '64',
        doctor: 'Dr. Meera Krishnan',
      }),
      orders: [
        order({
          orderType: 'spectacles',
          frameCategory: 'full_rim',
          frameCompany: 'Titan Eye+',
          frameModel: 'TE-2210 Matte Black',
          lensCompany: 'Crizal',
          lensName: 'Crizal Easy UV 1.56',
          amount: 5400,
          expectedDeliveryDate: daysAgo(226, 17, 0),
          deliveredDate: daysAgo(227, 16, 20),
          status: 'delivered',
        }),
      ],
    }),
    visit({
      code: code(),
      customerId: 'CUST-000001',
      daysAgo: 172,
      visitType: 'order',
      notes: 'Wanted a spare pair for the office.',
      orders: [
        order({
          orderType: 'spectacles',
          frameCategory: 'half_rim',
          frameCompany: 'Lenskart Air',
          frameModel: 'LA-7781 Gunmetal',
          lensCompany: 'Essilor',
          lensName: 'Eyezen Start',
          amount: 6200,
          expectedDeliveryDate: daysAgo(165, 17, 0),
          deliveredDate: daysAgo(166, 12, 30),
          status: 'delivered',
        }),
      ],
    }),
    visit({
      code: code(),
      customerId: 'CUST-000001',
      daysAgo: 47,
      visitType: 'prescription',
      createdBy: UID.arjun,
      notes: 'Annual re-check. Power increased slightly in the right eye.',
      oldGlasses: {
        prescription: prescription({
          right: { distanceSph: '-1.25', distanceCyl: '-0.50', distanceAxis: '180', pd: '32' },
          left: { distanceSph: '-1.00', distanceCyl: '-0.25', distanceAxis: '175', pd: '32' },
          binocularPd: '64',
          notes: 'Read from his current Titan frame on the lensometer.',
        }),
        lensType: 'single_vision',
        lensCompany: 'Crizal',
        lensName: 'Crizal Easy UV 1.56',
        lensDetails: 'Anti-reflective, UV protection. Light scratches on the left lens.',
      },
      arReading: prescription({
        right: { distanceSph: '-1.75', distanceCyl: '-0.75', distanceAxis: '178' },
        left: { distanceSph: '-1.25', distanceCyl: '-0.25', distanceAxis: '172' },
        binocularPd: '64',
      }),
      prescription: prescription({
        right: {
          distanceSph: '-1.50',
          distanceCyl: '-0.50',
          distanceAxis: '180',
          add: '+0.75',
          pd: '32',
        },
        left: {
          distanceSph: '-1.00',
          distanceCyl: '-0.25',
          distanceAxis: '175',
          add: '+0.75',
          pd: '32',
        },
        binocularPd: '64',
        doctor: 'Dr. Meera Krishnan',
        notes: 'Advised anti-glare coating for night driving.',
      }),
    }),
    visit({
      code: code(),
      customerId: 'CUST-000001',
      daysAgo: 1,
      visitType: 'service',
      createdBy: UID.arjun,
      notes: 'Customer requested the new pair be ready before his travel on Friday.',
      orders: [
        order({
          orderType: 'spectacles',
          frameCategory: 'rimless',
          frameCompany: 'Ray-Ban',
          frameModel: 'RB-8412 Titanium',
          lensCompany: 'Essilor',
          lensName: 'Varilux Comfort Max',
          amount: 8500,
          expectedDeliveryDate: daysAhead(5),
          status: 'in_progress',
          notes: 'Anti-glare coating added.',
        }),
      ],
      services: [
        service({
          serviceType: 'nose_pad_replacement',
          description: 'Replace broken left nose pad on the older Titan frame',
          charge: 150,
          paymentStatus: 'paid',
          expectedReadyDate: daysAhead(1),
          status: 'ready',
        }),
      ],
    }),

    /* Fatima Khan */
    visit({
      code: code(),
      customerId: 'CUST-000002',
      daysAgo: 190,
      visitType: 'prescription',
      oldGlasses: {
        prescription: prescription({
          right: { nearSph: '+0.75' },
          left: { nearSph: '+0.75' },
        }),
        lensType: 'reading',
        lensCompany: '',
        lensName: '',
        lensDetails: 'Over-the-counter readers she has been using.',
      },
      prescription: prescription({
        right: { nearSph: '+1.00', pd: '31' },
        left: { nearSph: '+1.00', pd: '31' },
        binocularPd: '62',
        doctor: 'Dr. Meera Krishnan',
        notes: 'Reading glasses only.',
      }),
      orders: [
        order({
          orderType: 'spectacles',
          frameCategory: 'full_rim',
          frameCompany: 'Vincent Chase',
          frameModel: 'VC-3390 Tortoise',
          lensCompany: 'Zeiss',
          lensName: 'Zeiss SV Clear',
          amount: 3200,
          expectedDeliveryDate: daysAgo(183, 17, 0),
          deliveredDate: daysAgo(184, 11, 0),
          status: 'delivered',
        }),
      ],
    }),
    visit({
      code: code(),
      customerId: 'CUST-000002',
      daysAgo: 9,
      visitType: 'service',
      createdBy: UID.arjun,
      services: [
        service({
          serviceType: 'frame_adjustment',
          description: 'Frame sitting loose on the left side',
          charge: 0,
          paymentStatus: 'paid',
          expectedReadyDate: daysAgo(9, 18, 0),
          deliveredDate: daysAgo(9, 18, 30),
          status: 'delivered',
          notes: 'Adjusted at the counter while the customer waited.',
        }),
      ],
    }),

    /* Ali Khan — his own independent history. */
    visit({
      code: code(),
      customerId: 'CUST-000003',
      daysAgo: 96,
      visitType: 'prescription',
      notes: 'School screening referral. First pair of glasses.',
      prescription: prescription({
        right: { distanceSph: '-0.75', pd: '28' },
        left: { distanceSph: '-0.75', distanceCyl: '-0.25', distanceAxis: '10', pd: '28' },
        binocularPd: '56',
        doctor: 'Dr. Anand Sundaram',
      }),
      orders: [
        order({
          orderType: 'spectacles',
          frameCategory: 'kids',
          frameCompany: 'Hoop',
          frameModel: 'HK-112 Blue',
          lensCompany: 'Zeiss',
          lensName: 'Zeiss Kids Clear',
          amount: 2800,
          expectedDeliveryDate: daysAgo(90, 17, 0),
          deliveredDate: daysAgo(90, 16, 45),
          status: 'delivered',
        }),
      ],
    }),
    visit({
      code: code(),
      customerId: 'CUST-000003',
      daysAgo: 4,
      visitType: 'service',
      createdBy: UID.arjun,
      notes: 'Frame bent during a football match.',
      services: [
        service({
          serviceType: 'welding',
          description: 'Weld the snapped left temple and repaint',
          charge: 350,
          paymentStatus: 'pending',
          expectedReadyDate: daysAhead(2),
          status: 'in_service',
        }),
      ],
    }),

    /* Sara Khan */
    visit({
      code: code(),
      customerId: 'CUST-000004',
      daysAgo: 96,
      visitType: 'consultation',
      notes: 'Came along with Ali. Vision check normal, no prescription needed.',
    }),

    /* Ramesh Iyer */
    visit({
      code: code(),
      customerId: 'CUST-000005',
      daysAgo: 410,
      visitType: 'prescription',
      createdBy: UID.deepa,
      prescription: prescription({
        right: { distanceSph: '+1.75', distanceCyl: '-0.75', distanceAxis: '90', add: '+2.00', pd: '33' },
        left: { distanceSph: '+1.50', distanceCyl: '-0.50', distanceAxis: '85', add: '+2.00', pd: '33' },
        binocularPd: '66',
        doctor: 'Dr. Suresh Babu',
        notes: 'Post-cataract, right eye.',
      }),
    }),
    visit({
      code: code(),
      customerId: 'CUST-000005',
      daysAgo: 120,
      visitType: 'order',
      notes: 'Progressive lenses ordered after trial.',
      orders: [
        order({
          orderType: 'spectacles',
          frameCategory: 'full_rim',
          frameCompany: 'Titan',
          frameModel: 'TT-5540 Brown',
          lensCompany: 'Essilor',
          lensName: 'Varilux Physio',
          amount: 12500,
          quantity: 1,
          expectedDeliveryDate: daysAgo(112, 17, 0),
          deliveredDate: daysAgo(111, 10, 15),
          status: 'delivered',
        }),
      ],
    }),
    visit({
      code: code(),
      customerId: 'CUST-000005',
      daysAgo: 2,
      visitType: 'follow_up',
      createdBy: UID.admin,
      notes: 'Slight discomfort with the progressive corridor. Lenses re-ordered.',
      orders: [
        order({
          orderType: 'lens_only',
          frameCategory: null,
          lensCompany: 'Essilor',
          lensName: 'Varilux Comfort Max',
          amount: 9800,
          expectedDeliveryDate: daysAhead(6),
          status: 'pending',
          notes: 'Refit into the existing Titan frame.',
        }),
      ],
    }),

    /* Lakshmi Iyer */
    visit({
      code: code(),
      customerId: 'CUST-000006',
      daysAgo: 380,
      visitType: 'prescription',
      createdBy: UID.deepa,
      prescription: prescription({
        right: { nearSph: '+1.50', pd: '30' },
        left: { nearSph: '+1.50', pd: '30' },
        binocularPd: '60',
      }),
    }),
    visit({
      code: code(),
      customerId: 'CUST-000006',
      daysAgo: 16,
      visitType: 'order',
      orders: [
        order({
          orderType: 'sunglasses',
          frameCategory: 'full_rim',
          frameCompany: 'Ray-Ban',
          frameModel: 'RB-2140 Wayfarer',
          lensCompany: 'Ray-Ban',
          lensName: 'Polarised G-15',
          amount: 7900,
          expectedDeliveryDate: daysAgo(2, 17, 0),
          status: 'ready',
          notes: 'Customer to be called for pickup.',
        }),
      ],
    }),

    /* Vignesh Iyer */
    visit({
      code: code(),
      customerId: 'CUST-000007',
      daysAgo: 150,
      visitType: 'prescription',
      notes: 'Screen fatigue. Recommended blue-filter coating.',
      prescription: prescription({
        right: { distanceSph: '-2.25', distanceCyl: '-0.50', distanceAxis: '170', pd: '32' },
        left: { distanceSph: '-2.50', distanceCyl: '-0.75', distanceAxis: '165', pd: '32' },
        binocularPd: '64',
        doctor: 'Dr. Anand Sundaram',
      }),
      orders: [
        order({
          orderType: 'spectacles',
          frameCategory: 'rimless',
          frameCompany: 'John Jacobs',
          frameModel: 'JJ-4420 Silver',
          lensCompany: 'Crizal',
          lensName: 'Crizal Prevencia',
          amount: 9600,
          expectedDeliveryDate: daysAgo(143, 17, 0),
          deliveredDate: daysAgo(142, 19, 0),
          status: 'delivered',
        }),
      ],
    }),
    visit({
      code: code(),
      customerId: 'CUST-000007',
      daysAgo: 0,
      visitType: 'service',
      createdBy: UID.arjun,
      notes: 'Walked in during lunch break.',
      services: [
        service({
          serviceType: 'screw_replacement',
          description: 'Right hinge screw missing',
          charge: 100,
          paymentStatus: 'paid',
          expectedReadyDate: daysAhead(0),
          status: 'ready',
        }),
        service({
          serviceType: 'cleaning',
          description: 'Ultrasonic cleaning',
          charge: 0,
          paymentStatus: 'paid',
          status: 'delivered',
          deliveredDate: daysAgo(0, 13, 30),
        }),
      ],
    }),

    /* Joseph Mathew */
    visit({
      code: code(),
      customerId: 'CUST-000008',
      daysAgo: 64,
      visitType: 'order',
      createdBy: UID.arjun,
      orders: [
        order({
          orderType: 'contact_lens',
          frameCategory: null,
          lensCompany: 'Bausch & Lomb',
          lensName: 'SofLens Daily Disposable (30 pack)',
          quantity: 2,
          amount: 2400,
          expectedDeliveryDate: daysAgo(60, 17, 0),
          deliveredDate: daysAgo(60, 16, 0),
          status: 'delivered',
        }),
      ],
    }),

    /* Anna Mathew */
    visit({
      code: code(),
      customerId: 'CUST-000009',
      daysAgo: 64,
      visitType: 'prescription',
      createdBy: UID.arjun,
      notes: 'Reading difficulty. Referred from Rajan Eye Care.',
      prescription: prescription({
        right: { distanceSph: '+2.00', nearSph: '+3.00', add: '+2.50', pd: '30' },
        left: { distanceSph: '+2.25', nearSph: '+3.25', add: '+2.50', pd: '30' },
        binocularPd: '60',
        doctor: 'Dr. Rajan',
      }),
      orders: [
        order({
          orderType: 'spectacles',
          frameCategory: 'full_rim',
          frameCompany: 'Titan',
          frameModel: 'TT-1180 Gold',
          lensCompany: 'Zeiss',
          lensName: 'Zeiss Progressive Plus',
          amount: 11200,
          expectedDeliveryDate: daysAgo(56, 17, 0),
          deliveredDate: daysAgo(55, 11, 30),
          status: 'delivered',
        }),
      ],
    }),
    visit({
      code: code(),
      customerId: 'CUST-000009',
      daysAgo: 0,
      visitType: 'follow_up',
      notes: 'Reported the progressive lenses are comfortable now.',
    }),

    /* Sunita Sharma */
    visit({
      code: code(),
      customerId: 'CUST-000010',
      daysAgo: 27,
      visitType: 'prescription',
      notes: 'Referred by Ahmed Khan.',
      prescription: prescription({
        right: { distanceSph: '-0.50', pd: '31' },
        left: { distanceSph: '-0.75', pd: '31' },
        binocularPd: '62',
      }),
      orders: [
        order({
          orderType: 'spectacles',
          frameCategory: 'half_rim',
          frameCompany: 'Vogue',
          frameModel: 'VO-5290 Rose Gold',
          lensCompany: 'Crizal',
          lensName: 'Crizal Sapphire',
          amount: 7400,
          expectedDeliveryDate: daysAhead(3),
          status: 'in_progress',
        }),
      ],
    }),

    /* Mohammed Rafi */
    visit({
      code: code(),
      customerId: 'CUST-000011',
      daysAgo: 12,
      visitType: 'service',
      createdBy: UID.arjun,
      notes: 'Frame purchased elsewhere. Repair only.',
      services: [
        service({
          serviceType: 'lens_fitting',
          description: 'Fit customer-supplied lenses into a new frame',
          charge: 450,
          paymentStatus: 'paid',
          expectedReadyDate: daysAgo(9, 17, 0),
          deliveredDate: daysAgo(9, 17, 20),
          status: 'delivered',
        }),
      ],
    }),
    visit({
      code: code(),
      customerId: 'CUST-000011',
      daysAgo: 0,
      visitType: 'service',
      createdBy: UID.priya,
      services: [
        service({
          serviceType: 'frame_modification',
          description: 'Shorten the temple length by 4mm on both sides',
          charge: 250,
          paymentStatus: 'pending',
          expectedReadyDate: daysAhead(1),
          status: 'in_service',
        }),
      ],
    }),

    /* Grace Fernandes */
    visit({
      code: code(),
      customerId: 'CUST-000012',
      daysAgo: 3,
      visitType: 'consultation',
      notes: 'Enquired about contact lenses. Trial scheduled for next week.',
    }),

    /* David Thomas — inactive customer keeps its history. */
    visit({
      code: code(),
      customerId: 'CUST-000013',
      daysAgo: 45,
      visitType: 'consultation',
      notes: 'Record later found to be a duplicate.',
    }),
  ];
}

/* -------------------------------------------------------------------------- */
/* Assembly                                                                   */
/* -------------------------------------------------------------------------- */

export function buildSeed(version: number): MockDb {
  orderSeq = 0;
  serviceSeq = 0;

  const users = buildUsers();
  const customers = buildCustomers();
  const visits = buildVisits();

  // Derive the denormalised visit summaries rather than hand-maintaining them.
  for (const record of customers) {
    const own = visits.filter((v) => v.customerId === record.id);
    record.visitCount = own.length;
    record.lastVisitAt = own.reduce<Date | null>(
      (latest, v) => (latest === null || v.visitDate > latest ? v.visitDate : latest),
      null,
    );
  }

  const highestCustomer = customers.reduce((max, record) => {
    const value = Number(record.customerCode.replace('CUST-', ''));
    return Number.isFinite(value) && value > max ? value : max;
  }, 0);

  return {
    version,
    users,
    customers,
    visits,
    counters: {
      customer: highestCustomer,
      visit: visits.length,
      order: orderSeq,
      service: serviceSeq,
    },
  };
}
