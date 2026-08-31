/**
 * Comprehensive Catalog of all 58 Construction BOQ Calculators & Archetypes
 * =========================================================================
 * Aligned with CPWD DSR 2023, IS 1200, IS 456, IS 1905, IS 2470, MoRTH & IRC standards.
 */

export interface ParameterDef {
  key: string;
  label: string;
  unit: string;
  type: 'number' | 'select' | 'bool';
  default: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string | number; label: string }[];
  category?: string;
  stage?: 'earthwork' | 'foundation' | 'superstructure' | 'rcc' | 'finishes' | 'openings' | 'mep';
}

export interface BOQTemplateDef {
  slug: string;
  family: string;
  name: string;
  icon: string;
  tagline: string;
  summary: string;
  is_codes: string[];
  default_sor: string;
  default_scope: {
    earthwork: boolean;
    foundation: boolean;
    superstructure: boolean;
    rcc: boolean;
    finishes: boolean;
    openings: boolean;
    mep: boolean;
  };
  parameters: ParameterDef[];
  notes: string[];
}

export interface FamilyDef {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export interface ArchetypePreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  modules: {
    slug: string;
    params?: Record<string, any>;
  }[];
}

export const BOQ_FAMILIES: FamilyDef[] = [
  { id: 'residential', label: 'Residential Buildings', icon: '🏠', description: 'Houses for individuals & families — rural to multi-storey apartments.' },
  { id: 'institutional', label: 'Institutional Buildings', icon: '🏫', description: 'Schools, anganwadis, PHCs, panchayat halls & public facilities.' },
  { id: 'specialty', label: 'Industrial & Specialty', icon: '🏭', description: 'Warehouses, petrol pumps, cremation shelters & commercial sheds.' },
  { id: 'walls', label: 'Walls & Boundaries', icon: '🧱', description: 'Compound walls, retaining walls & plot boundaries.' },
  { id: 'roads', label: 'Roads & Pavements', icon: '🛣️', description: 'BT & CC roads (per km) + footpaths & paver blocks.' },
  { id: 'bridges-drains', label: 'Bridges, Culverts & Drains', icon: '🌉', description: 'Cross-drainage works, storm drains & minor bridges.' },
  { id: 'sanitation-watershed', label: 'Sanitation & Watershed', icon: '🚽', description: 'On-site sewage, toilets, farm ponds & check dams.' },
  { id: 'water-supply', label: 'Water Supply (JJM)', icon: '💧', description: 'Source → treatment → storage → transmission → distribution.' },
  { id: 'interiors', label: 'Interior Works & Fitouts', icon: '🛋️', description: 'Modular kitchen, bath, false ceiling, wardrobes, flooring & painting.' },
];

export const BOQ_TEMPLATES: Record<string, BOQTemplateDef> = {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. RESIDENTIAL BUILDINGS
  // ───────────────────────────────────────────────────────────────────────────
  'pmay-g-rural-house': {
    slug: 'pmay-g-rural-house',
    family: 'residential',
    name: 'PMAY-G Rural House (1BHK, 25 m²)',
    icon: '🏠',
    tagline: 'PMAY-G type design: hall + kitchen + toilet + verandah',
    summary: 'Per PMAY-G type-design + IAY specs: load-bearing brick masonry house with 25 m² built-up area = 1 hall + kitchen + toilet + verandah. RCC roof slab 100 mm OR GI sheet on truss.',
    is_codes: ['IS 1905', 'IS 456', 'IS 1200 Pt 1-13', 'PMAY-G Norms'],
    default_sor: 'CPWD DSR 2023',
    default_scope: {
      earthwork: true,
      foundation: true,
      superstructure: true,
      rcc: true,
      finishes: true,
      openings: true,
      mep: true,
    },
    parameters: [
      { key: 'length_m', label: 'House length', unit: 'm', type: 'number', default: 6.0, min: 4.0, max: 8.0, step: 0.1 },
      { key: 'width_m', label: 'House width', unit: 'm', type: 'number', default: 4.5, min: 3.5, max: 6.0, step: 0.1 },
      { key: 'height_m', label: 'Wall height (floor to ceiling)', unit: 'm', type: 'number', default: 2.7, min: 2.4, max: 3.2, step: 0.1 },
      {
        key: 'wall_thk_mm',
        label: 'External wall thickness',
        unit: 'mm',
        type: 'select',
        default: 230,
        options: [
          { value: 230, label: '230 mm (full brick, standard)' },
          { value: 345, label: '345 mm (1.5 brick, high seismic / G+1 ready)' },
        ],
      },
      {
        key: 'roof_type',
        label: 'Roof type',
        unit: '',
        type: 'select',
        default: 'rcc',
        options: [
          { value: 'rcc', label: 'RCC slab 100 mm (durable, hot-dry regions)' },
          { value: 'gi', label: 'GI sheet on MS angle truss (lighter, cooler regions)' },
        ],
      },
      { key: 'with_verandah', label: 'Front verandah (~5 m²)', unit: '', type: 'bool', default: true },
      { key: 'with_finishes', label: 'Plaster + paint + tile flooring + doors/windows', unit: '', type: 'bool', default: true },
    ],
    notes: [
      'PMAY-G type design: 25 m² built-up area = 1 hall (~12 m²) + kitchen (~4 m²) + toilet (~3 m²) + verandah (~5 m²).',
      'Load-bearing masonry (no RCC frame needed for single-storey <= 25 m²) saves ~25% structural cost.',
      'DSR 2023 rates reflect Delhi Schedule; state PWD rates typically run 8-15% lower.',
    ],
  },

  'g1-residential-house': {
    slug: 'g1-residential-house',
    family: 'residential',
    name: 'G+1 Residential House (1200-1800 sqft)',
    icon: '🏡',
    tagline: 'RCC framed urban house — most-searched BOQ on Google',
    summary: 'Standard Indian urban duplex villa: 3-4 BHK RCC framed structure with isolated footings, plinth beams, columns, 125mm suspended slabs, vitrified flooring & premium finishes.',
    is_codes: ['IS 456:2000', 'IS 13920:2016', 'IS 1200 Pt 1-28', 'NBC 2016'],
    default_sor: 'CPWD DSR 2023',
    default_scope: {
      earthwork: true,
      foundation: true,
      superstructure: true,
      rcc: true,
      finishes: true,
      openings: true,
      mep: true,
    },
    parameters: [
      { key: 'length_m', label: 'Plot / Building length', unit: 'm', type: 'number', default: 12.0, min: 8.0, max: 20.0, step: 0.5 },
      { key: 'width_m', label: 'Plot / Building width', unit: 'm', type: 'number', default: 9.0, min: 6.0, max: 15.0, step: 0.5 },
      { key: 'num_floors', label: 'Number of floors', unit: '', type: 'number', default: 2, min: 1, max: 4, step: 1 },
      { key: 'height_m', label: 'Floor-to-floor height', unit: 'm', type: 'number', default: 3.0, min: 2.7, max: 3.6, step: 0.1 },
      {
        key: 'soil_type',
        label: 'Foundation soil type',
        unit: '',
        type: 'select',
        default: 'medium',
        options: [
          { value: 'soft', label: 'Soft / Loose soil (Depth 1.8m)' },
          { value: 'medium', label: 'Medium soil / Moorum (Depth 1.5m)' },
          { value: 'hard', label: 'Hard strata / Rocky (Depth 1.2m)' },
        ],
      },
      {
        key: 'masonry_type',
        label: 'Wall material',
        unit: '',
        type: 'select',
        default: 'brick',
        options: [
          { value: 'brick', label: 'Red clay bricks 230mm (DSR 6.4.2)' },
          { value: 'aac', label: 'AAC lightweight blocks 200mm (DSR 6.28)' },
          { value: 'concrete_block', label: 'Solid concrete blocks 200mm' },
        ],
      },
      { key: 'outer_door_count', label: 'Main & balcony doors', unit: 'nos', type: 'number', default: 2, min: 1, max: 6, step: 1 },
      { key: 'inner_door_count', label: 'Internal bedroom/bath doors', unit: 'nos', type: 'number', default: 6, min: 2, max: 12, step: 1 },
      { key: 'window_count', label: 'Windows & ventilators', unit: 'nos', type: 'number', default: 8, min: 4, max: 20, step: 1 },
    ],
    notes: [
      'RCC columns placed on modular bay grid (<= 4.0m span) with isolated stepped footings.',
      'Slabs measured at 125mm thickness; beams measured as web below slab (zero volume double-counting).',
      'IS 13920 ductile detailing included in column and plinth beam rebar consumption.',
    ],
  },

  'multi-storey-rcc-frame': {
    slug: 'multi-storey-rcc-frame',
    family: 'residential',
    name: 'Multi-Storey RCC Frame (G+3 to G+5)',
    icon: '🏢',
    tagline: 'IS 13920 ductile detailing, lift shaft, 4-6 floors',
    summary: 'Multi-storey apartment or commercial block with RCC shear walls, lift core, M25/M30 concrete, TMT Fe500D steel, fire staircase & basement/stilt parking.',
    is_codes: ['IS 456:2000', 'IS 13920:2016', 'IS 1893:2016', 'NBC 2016'],
    default_sor: 'CPWD DSR 2023',
    default_scope: {
      earthwork: true,
      foundation: true,
      superstructure: true,
      rcc: true,
      finishes: true,
      openings: true,
      mep: true,
    },
    parameters: [
      { key: 'length_m', label: 'Building length', unit: 'm', type: 'number', default: 24.0, min: 15.0, max: 50.0, step: 1.0 },
      { key: 'width_m', label: 'Building width', unit: 'm', type: 'number', default: 15.0, min: 10.0, max: 30.0, step: 1.0 },
      { key: 'num_floors', label: 'Number of storeys (G+N)', unit: '', type: 'number', default: 4, min: 3, max: 8, step: 1 },
      { key: 'height_m', label: 'Floor-to-floor height', unit: 'm', type: 'number', default: 3.15, min: 3.0, max: 4.0, step: 0.05 },
      { key: 'has_lift_core', label: 'RCC lift core & shaft', unit: '', type: 'bool', default: true },
      { key: 'has_stilt', label: 'Stilt ground parking floor', unit: '', type: 'bool', default: true },
    ],
    notes: [
      'Structural steel calculated at 135 kg/m³ for high seismic compliance (Zone III/IV).',
      'Includes lift shaft concrete, shear walls, machine room, and parapet coping.',
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 2. WALLS & BOUNDARIES
  // ───────────────────────────────────────────────────────────────────────────
  'boundary-wall': {
    slug: 'boundary-wall',
    family: 'walls',
    name: 'Boundary Wall (Brick & RCC Columns)',
    icon: '🧱',
    tagline: 'Brick + RCC columns + plaster + paint',
    summary: 'Standard 1.8m to 2.4m tall compound wall with 230mm brick masonry, RCC stiffener columns @ 3m c/c, continuous plinth beam, coping band, 12mm plaster & exterior weather paint.',
    is_codes: ['IS 1905', 'IS 456', 'IS 1200 Pt 1-13'],
    default_sor: 'CPWD DSR 2023',
    default_scope: {
      earthwork: true,
      foundation: true,
      superstructure: true,
      rcc: true,
      finishes: true,
      openings: true,
      mep: false,
    },
    parameters: [
      { key: 'wall_length_m', label: 'Total running length', unit: 'm', type: 'number', default: 60.0, min: 10.0, max: 500.0, step: 1.0 },
      { key: 'wall_height_m', label: 'Wall height above GL', unit: 'm', type: 'number', default: 2.1, min: 1.5, max: 3.5, step: 0.1 },
      {
        key: 'wall_thk_mm',
        label: 'Wall thickness',
        unit: 'mm',
        type: 'select',
        default: 230,
        options: [
          { value: 115, label: '115 mm (Half brick with RCC stiffeners @ 2.5m)' },
          { value: 230, label: '230 mm (Full brick standard with columns @ 3.5m)' },
        ],
      },
      { key: 'with_plaster_paint', label: 'Plaster both sides + exterior paint', unit: '', type: 'bool', default: true },
      { key: 'with_gate_opening', label: 'Deduct main gate opening (3.5m width)', unit: '', type: 'bool', default: true },
    ],
    notes: [
      'Excavation trench width = 0.60m, depth = 0.75m below GL.',
      'RCC columns (230x230mm) spaced every 3.0m to 3.5m with coping band on top.',
    ],
  },

  'cantilever-retaining-wall': {
    slug: 'cantilever-retaining-wall',
    family: 'walls',
    name: 'Cantilever Retaining Wall (RCC)',
    icon: '🪨',
    tagline: 'IS 14458 RCC stem + heel + toe + backfill',
    summary: 'Earth-retaining inverted T-shaped RCC wall: M25 concrete, tapered stem, base slab (toe + heel), PVC weep holes @ 1.5m c/c, gravel backfill & filter geotextile.',
    is_codes: ['IS 14458', 'IS 456:2000', 'IS 1200 Pt 2'],
    default_sor: 'CPWD DSR 2023',
    default_scope: {
      earthwork: true,
      foundation: true,
      superstructure: false,
      rcc: true,
      finishes: false,
      openings: false,
      mep: false,
    },
    parameters: [
      { key: 'wall_length_m', label: 'Wall running length', unit: 'm', type: 'number', default: 25.0, min: 5.0, max: 200.0, step: 1.0 },
      { key: 'retained_height_m', label: 'Retained earth height', unit: 'm', type: 'number', default: 3.5, min: 1.8, max: 6.0, step: 0.1 },
      { key: 'base_width_m', label: 'Base slab width (Toe+Heel)', unit: 'm', type: 'number', default: 2.4, min: 1.2, max: 4.5, step: 0.1 },
    ],
    notes: [
      'Base slab thickness = 0.40m; stem thickness tapers from 0.45m at base to 0.23m at top.',
      'Rebar estimated at 110 kg/m³ of high-yield TMT bars.',
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 3. SANITATION & WATERSHED
  // ───────────────────────────────────────────────────────────────────────────
  'septic-tank': {
    slug: 'septic-tank',
    family: 'sanitation-watershed',
    name: 'Septic Tank (5-50 Users, IS 2470)',
    icon: '🚰',
    tagline: 'IS 2470 Part 1 brick masonry + RCC cover',
    summary: 'Two-compartment on-site wastewater digestion tank per IS 2470: brick walls in CM 1:4 with waterproofing additive, RCC precast cover slabs with lifting hooks, baffle wall, inlet/outlet tees & 100mm vent pipe.',
    is_codes: ['IS 2470 Pt 1', 'CPHEEO Manual', 'CPWD 19.1'],
    default_sor: 'CPWD DSR 2023',
    default_scope: {
      earthwork: true,
      foundation: true,
      superstructure: true,
      rcc: true,
      finishes: true,
      openings: false,
      mep: true,
    },
    parameters: [
      { key: 'users_count', label: 'Design users (family / building)', unit: 'users', type: 'number', default: 10, min: 5, max: 50, step: 5 },
      { key: 'length_m', label: 'Internal tank length', unit: 'm', type: 'number', default: 2.3, min: 1.5, max: 5.0, step: 0.1 },
      { key: 'width_m', label: 'Internal tank width', unit: 'm', type: 'number', default: 1.1, min: 0.75, max: 2.0, step: 0.05 },
      { key: 'liquid_depth_m', label: 'Liquid depth', unit: 'm', type: 'number', default: 1.4, min: 1.0, max: 2.0, step: 0.1 },
      { key: 'with_soak_pit', label: 'Include connected circular soak pit (1.5m dia)', unit: '', type: 'bool', default: true },
    ],
    notes: [
      'Freeboard of 0.30m added above liquid depth for gas accumulation.',
      'Plaster inside finished with neat cement floating coat mixed with integral waterproofing compound.',
    ],
  },

  'soak-pit': {
    slug: 'soak-pit',
    family: 'sanitation-watershed',
    name: 'Soak Pit / Recharge Pit',
    icon: '💧',
    tagline: 'IS 2470 sanitation + IS 15797 RWH',
    summary: 'Circular dispersion pit for septic effluent or rainwater harvesting: 1.5m internal dia, 3.0m deep, lined with dry open-joint brickwork, filled with brick aggregate / coarse gravel & covered with RCC slab.',
    is_codes: ['IS 2470 Pt 2', 'IS 15797:2008'],
    default_sor: 'CPWD DSR 2023',
    default_scope: {
      earthwork: true,
      foundation: false,
      superstructure: true,
      rcc: true,
      finishes: false,
      openings: false,
      mep: true,
    },
    parameters: [
      { key: 'diameter_m', label: 'Internal diameter', unit: 'm', type: 'number', default: 1.5, min: 1.0, max: 3.0, step: 0.25 },
      { key: 'depth_m', label: 'Total depth', unit: 'm', type: 'number', default: 3.0, min: 1.8, max: 5.0, step: 0.5 },
    ],
    notes: [
      'Bottom 1.5m filled with graded brick bats / 40mm aggregate for dispersion.',
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 4. INTERIOR WORKS & FITOUTS
  // ───────────────────────────────────────────────────────────────────────────
  'modular-kitchen': {
    slug: 'modular-kitchen',
    family: 'interiors',
    name: 'Modular Kitchen (per Rft layout)',
    icon: '🍳',
    tagline: 'BWP carcass + shutters + counter + dado + sink + accessories',
    summary: 'Complete modular kitchen package: Marine ply BWP IS 710 carcass, acrylic/laminate shutters, soft-close hardware, 20mm granite/quartz counter with edge molding, dado tiles up to 600mm, SS304 double bowl sink & CP swivel tap.',
    is_codes: ['IS 710', 'IS 2046', 'CPWD 8.2', 'IS 13983'],
    default_sor: 'CPWD DSR 2023',
    default_scope: {
      earthwork: false,
      foundation: false,
      superstructure: false,
      rcc: false,
      finishes: true,
      openings: false,
      mep: true,
    },
    parameters: [
      { key: 'running_length_rft', label: 'Counter running length', unit: 'Rft', type: 'number', default: 18.0, min: 8.0, max: 40.0, step: 1.0 },
      {
        key: 'layout_shape',
        label: 'Kitchen layout',
        unit: '',
        type: 'select',
        default: 'l_shape',
        options: [
          { value: 'straight', label: 'Straight single-wall (8-12 Rft)' },
          { value: 'l_shape', label: 'L-Shaped counter (14-22 Rft)' },
          { value: 'u_shape', label: 'U-Shaped counter (20-35 Rft)' },
        ],
      },
      { key: 'has_overhead_cabinets', label: 'Include overhead storage cabinets (2 Rft height)', unit: '', type: 'bool', default: true },
      { key: 'has_granite_top', label: 'Include 20mm polished Jet Black granite top', unit: '', type: 'bool', default: true },
    ],
    notes: [
      'Carcass calculated in m² using IS 710 Boiling Water Proof (BWP) plywood with 0.8mm internal liner.',
      'Countertop includes cutouts for 4-burner hob and undermount double-bowl sink.',
    ],
  },

  'false-ceiling-package': {
    slug: 'false-ceiling-package',
    family: 'interiors',
    name: 'False Ceiling Package (Gypsum / POP / PVC)',
    icon: '🪟',
    tagline: 'GI framing + board + cove + LED + paint',
    summary: 'Suspended false ceiling system: ultra-light GI perimeter channels, intermediate channels, ceiling sections, 12.5mm tapered edge gypsum board, paper-taped jointing, cove light trough & 2-coat primer/acrylic paint.',
    is_codes: ['IS 2095 Pt 1', 'NBC 2016'],
    default_sor: 'CPWD DSR 2023',
    default_scope: {
      earthwork: false,
      foundation: false,
      superstructure: false,
      rcc: false,
      finishes: true,
      openings: false,
      mep: true,
    },
    parameters: [
      { key: 'ceiling_area_m2', label: 'Total room / ceiling area', unit: 'm²', type: 'number', default: 120.0, min: 10.0, max: 1000.0, step: 5.0 },
      { key: 'cove_perimeter_m', label: 'Cove light perimeter trough', unit: 'm', type: 'number', default: 48.0, min: 0.0, max: 400.0, step: 2.0 },
    ],
    notes: [
      'Framing uses 0.50mm B.M.T. GI channels suspended with 6mm soffit cleats.',
    ],
  },

  'painting-full-home': {
    slug: 'painting-full-home',
    family: 'interiors',
    name: 'Painting — Full Home (Interior + Exterior)',
    icon: '🎨',
    tagline: 'Surface prep + putty + primer + emulsion + exterior + door enamel',
    summary: 'Turnkey home painting package: 2 coats acrylic wall putty, 1 coat water thinnable primer, 2 coats premium washable interior emulsion, 2 coats weather-shield exterior paint & synthetic enamel on doors/grills.',
    is_codes: ['IS 1200 Pt 13', 'CPWD 13.41', 'CPWD 13.46'],
    default_sor: 'CPWD DSR 2023',
    default_scope: {
      earthwork: false,
      foundation: false,
      superstructure: false,
      rcc: false,
      finishes: true,
      openings: false,
      mep: false,
    },
    parameters: [
      { key: 'carpet_area_sqft', label: 'Total home carpet area', unit: 'sqft', type: 'number', default: 1200.0, min: 300.0, max: 5000.0, step: 50.0 },
      { key: 'include_exterior', label: 'Include exterior weather-shield painting', unit: '', type: 'bool', default: true },
      { key: 'doors_windows_nos', label: 'Number of doors/window grills for enamel', unit: 'nos', type: 'number', default: 10, min: 2, max: 30, step: 1 },
    ],
    notes: [
      'Internal wall paint area estimated at 3.5 × Carpet Area (walls + ceilings per thumb rule).',
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 5. ROADS & INFRASTRUCTURE
  // ───────────────────────────────────────────────────────────────────────────
  'rcc-drain': {
    slug: 'rcc-drain',
    family: 'bridges-drains',
    name: 'RCC Storm Drain (U-Section with Cover)',
    icon: '〰️',
    tagline: 'Open / covered U-section drain per IS 4111',
    summary: 'Monolithic RCC U-shaped roadside storm water drain: PCC M10 bed, M20/M25 concrete walls and bed, SFRC heavy duty perforated cover slabs & weep holes.',
    is_codes: ['IS 4111', 'IS 456', 'MoRTH 2900'],
    default_sor: 'CPWD DSR 2023',
    default_scope: {
      earthwork: true,
      foundation: true,
      superstructure: false,
      rcc: true,
      finishes: false,
      openings: false,
      mep: false,
    },
    parameters: [
      { key: 'drain_length_m', label: 'Drain total length', unit: 'm', type: 'number', default: 100.0, min: 10.0, max: 2000.0, step: 10.0 },
      { key: 'internal_width_m', label: 'Clear drain width', unit: 'm', type: 'number', default: 0.60, min: 0.30, max: 1.50, step: 0.05 },
      { key: 'internal_depth_m', label: 'Clear drain depth', unit: 'm', type: 'number', default: 0.75, min: 0.30, max: 2.00, step: 0.05 },
    ],
    notes: [
      'Bed and side wall thickness = 0.15m; cover slabs 75mm SFRC with lifting hooks.',
    ],
  },
};

export const ARCHETYPE_PRESETS: ArchetypePreset[] = [
  {
    id: 'complete-residential-villa',
    name: 'Complete Residential Villa Package',
    icon: '🏡',
    description: 'Turnkey G+1 Villa: Main RCC structure + Boundary wall + Septic tank & soak pit + Modular kitchen + False ceiling.',
    modules: [
      { slug: 'g1-residential-house', params: { length_m: 12.0, width_m: 9.0, num_floors: 2, height_m: 3.0 } },
      { slug: 'boundary-wall', params: { wall_length_m: 60.0, wall_height_m: 2.1, wall_thk_mm: 230 } },
      { slug: 'septic-tank', params: { users_count: 15, length_m: 2.6, width_m: 1.2, liquid_depth_m: 1.5, with_soak_pit: true } },
      { slug: 'modular-kitchen', params: { running_length_rft: 18.0, layout_shape: 'l_shape' } },
      { slug: 'false-ceiling-package', params: { ceiling_area_m2: 120.0, cove_perimeter_m: 48.0 } },
    ],
  },
  {
    id: 'pmay-g-rural-bundle',
    name: 'PMAY-G Rural Housing Scheme Bundle',
    icon: '🏠',
    description: 'Official PMAY-G 1BHK 25 m² House with front verandah + linked sanitation septic & soak pit.',
    modules: [
      { slug: 'pmay-g-rural-house', params: { length_m: 6.0, width_m: 4.5, height_m: 2.7, wall_thk_mm: 230, roof_type: 'rcc', with_verandah: true, with_finishes: true } },
      { slug: 'septic-tank', params: { users_count: 5, length_m: 1.8, width_m: 0.9, liquid_depth_m: 1.2, with_soak_pit: true } },
    ],
  },
  {
    id: 'institutional-campus',
    name: 'Institutional Campus & Infrastructure',
    icon: '🏫',
    description: 'Public building / school block + boundary wall perimeter + RCC roadside storm drain.',
    modules: [
      { slug: 'g1-residential-house', params: { length_m: 18.0, width_m: 12.0, num_floors: 1, height_m: 3.6 } },
      { slug: 'boundary-wall', params: { wall_length_m: 150.0, wall_height_m: 2.4, wall_thk_mm: 230 } },
      { slug: 'rcc-drain', params: { drain_length_m: 120.0, internal_width_m: 0.6, internal_depth_m: 0.75 } },
    ],
  },
  {
    id: 'turnkey-interior-fitout',
    name: 'Turnkey Interior Fitout Package',
    icon: '🛋️',
    description: 'Complete home interiors: Modular kitchen + False ceiling throughout + Full home painting.',
    modules: [
      { slug: 'modular-kitchen', params: { running_length_rft: 20.0, layout_shape: 'l_shape' } },
      { slug: 'false-ceiling-package', params: { ceiling_area_m2: 150.0, cove_perimeter_m: 60.0 } },
      { slug: 'painting-full-home', params: { carpet_area_sqft: 1400.0, include_exterior: false, doors_windows_nos: 12 } },
    ],
  },
];
