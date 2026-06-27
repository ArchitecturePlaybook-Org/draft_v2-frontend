export type CategoryNode = {
  [key: string]: CategoryNode | string[];
};

export const CATEGORY_DATA: CategoryNode = {
  "Main Contractors": {
    "Infrastructure & Site": [
      "Civil Contractors",
      "Excavation & Earthwork",
      "Demolition Specialists"
    ],
    "Trade Specialists": {
      "MEP": [
        "Mechanical",
        "Electrical",
        "Plumbing"
      ],
      "Structural": [
        "Carpentry",
        "Masonry"
      ],
      "Enclosure": [
        "Roofing",
        "Siding"
      ],
      "Finishes": [
        "Drywall",
        "Paint",
        "Flooring"
      ]
    },
    "Management Level": [
      "General Contractor",
      "Construction Manager",
      "Design-Build Contractor"
    ]
  },

  "Project Suppliers": {
    "Service & Logistics": [
      "Utility: Power/Water/Waste",
      "Transport: Haulage/Shipping",
      "Tech: Software/BIM Vendors"
    ],
    "Systems & Equipment": [
      "Fixed Systems: HVAC/Elevators",
      "Plant Hire: Cranes/Excavators",
      "Tooling: Power Tools"
    ],
    "Construction Materials": [
      "Raw Materials: Concrete/Steel/Sand",
      "Building Products: Lumber/Bricks",
      "Finishing: Tiles/Paint/Glass"
    ]
  },

  "Project Clients": {
    "By Professional Goal": [
      "End-Users: Personal Use",
      "Developers: Build-to-sell",
      "Investors: Build-to-lease"
    ],
    "By Ownership": [
      "Private/Domestic",
      "Commercial/Corporate",
      "Public/Government"
    ]
  },

  "Architects": {
    "Planning": [
      "Urban Designers",
      "Town Planners"
    ],
    "Design": [
      "Sustainable/Green",
      "Conservation/Restoration",
      "Interior Architects",
      "Landscape"
    ],
    "Building Type": [
      "Residential",
      "Commercial",
      "Industrial",
      "Institutional"
    ]
  },

  "Builders": {
    "Specialty Trades": [
      "Finishing: Paint & Flooring",
      "Exterior: Roofing & Cladding",
      "Systems: MEP (Elec/Plumb/HVAC)",
      "Structural: Frame & Masonry"
    ],
    "Project Delivery": [
      "General Contractors",
      "Design-Build Firms",
      "Turnkey Contractors"
    ],
    "Sector": [
      "Residential Builders",
      "Commercial Builders",
      "Industrial Builders",
      "Civil/Infrastructure"
    ]
  }
};
