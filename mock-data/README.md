# Mock Law Firm Data - Peninsula IP Partners

This directory contains mock data representing a small IP law firm's document history for testing purposes.

## Overview
- **Firm:** Peninsula IP Partners
- **Attorneys:** 2 (Sarah Chen, Michael Rodriguez)
- **Clients:** 4 total (2 per attorney)
- **Documents:** ~20 total (5 per client)
- **Timeline:** 2022-2024

## Purpose
This mock data is designed to test CLI tools that:
- Extract context from legal documents
- Identify attorney writing styles
- Understand document relationships
- Process various IP document types

## Structure
```
attorneys/
├── sarah-chen/          # Tech patents specialist
│   └── clients/
│       ├── techflow-solutions/     # Software company
│       └── cheminnovate-labs/      # Chemical company
└── michael-rodriguez/   # Creative IP specialist
    └── clients/
        ├── iris-design-studio/     # Logo designer
        └── rainbow-tales-publishing/ # Children's author
```

## Document Types Included
- Patent applications (provisional, utility, continuation)
- Trademark applications
- NDAs and confidentiality agreements
- License agreements
- Assignment agreements
- Office action responses
- Cease and desist letters
- Copyright registrations

## Usage
Each client folder contains:
- `client-info.json` - Client metadata
- Various dated documents showing progression of matters
- Related documents that reference each other

## Note
All names, companies, and technical details are fictional. Any resemblance to real persons or companies is purely coincidental. 