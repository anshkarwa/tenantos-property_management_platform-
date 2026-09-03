const fs = require('fs');
const path = require('path');
const { 
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, 
  WidthType, BorderStyle, AlignmentType, ShadingType 
} = require('docx');

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        // Title
        new Paragraph({
          text: "Project Proposal: TenantOS",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          text: "End-to-End Operating System for Property Management, Tenant Relations, & Automated Rent Collections in India",
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({
              text: "End-to-End Operating System for Property Management, Tenant Relations, & Automated Rent Collections in India",
              italic: true,
              color: "555555"
            })
          ]
        }),

        // 1. Executive Summary
        new Paragraph({ text: "1. Executive Summary", heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 120 } }),
        new Paragraph({
          text: "TenantOS is a multi-tenant, cloud-based property management platform engineered specifically for the Indian real estate ecosystem (Residential, Commercial, PG/Hostels, and Co-living spaces). By unifying landlord operations, tenant self-service portals, legal compliance workflows, and financial integrations, TenantOS eliminates manual record-keeping, delayed rent collections, unverified tenancy risks, and fragmented maintenance communication.",
          spacing: { after: 200 }
        }),

        // 2. Problem Statement & Market Opportunity
        new Paragraph({ text: "2. Problem Statement & Market Opportunity", heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 120 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Challenge", bold: true })] })], shading: { fill: "E0E0E0", type: ShadingType.CLEAR } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Impact on Landlords", bold: true })] })], shading: { fill: "E0E0E0", type: ShadingType.CLEAR } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Impact on Tenants", bold: true })] })], shading: { fill: "E0E0E0", type: ShadingType.CLEAR } }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Manual Rent Tracking" })] }),
                new TableCell({ children: [new Paragraph({ text: "Cash-flow delays, unrecorded cash/UPI transfers, manual receipting" })] }),
                new TableCell({ children: [new Paragraph({ text: "Lack of standardized rent receipts for HRA tax exemptions" })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Identity & Risk Management" })] }),
                new TableCell({ children: [new Paragraph({ text: "High risk of unverified tenants, manual police verification delays" })] }),
                new TableCell({ children: [new Paragraph({ text: "Cumbersome paper verification processes" })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Lease & E-Signatures" })] }),
                new TableCell({ children: [new Paragraph({ text: "Paper contract degradation, compliance variation across states" })] }),
                new TableCell({ children: [new Paragraph({ text: "Lack of transparent, easily accessible lease terms" })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Maintenance Handling" })] }),
                new TableCell({ children: [new Paragraph({ text: "Disorganized WhatsApp chats, untracked vendor costs" })] }),
                new TableCell({ children: [new Paragraph({ text: "Slow repair resolution, zero visibility into ticket status" })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Multi-Occupancy / Co-Tenancy" })] }),
                new TableCell({ children: [new Paragraph({ text: "Splitting rent manually leads to disputes" })] }),
                new TableCell({ children: [new Paragraph({ text: "Individual liability confusion and awkward group math" })] }),
              ]
            }),
          ]
        }),

        // 3. Technical Architecture & Stack
        new Paragraph({ text: "3. Technical Architecture & Tech Stack", heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 120 } }),
        new Paragraph({ text: "• Frontend: Vite + React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, i18next" }),
        new Paragraph({ text: "• Backend: Fastify (Node.js), TypeScript, JWT Auth, Zod validation, Swagger OpenAPI" }),
        new Paragraph({ text: "• Database & Storage: PostgreSQL via Prisma ORM (hosted on Supabase Engine)" }),
        new Paragraph({ text: "• Core Integrations: Razorpay Payment Gateway, Nodemailer Email Engine, PDFKit Generator, Node-Cron Automation" }),

        // 4. Key Platform Features & Workflows
        new Paragraph({ text: "4. Key Platform Features & Workflows", heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 120 } }),
        new Paragraph({ text: "4.1 Property & Unit Inventory Management", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Categorize Residential, Commercial, PG/Hostel properties. Track unit states (Occupied, Vacant, Maintenance) and build listings with furnishing specs and photos." }),

        new Paragraph({ text: "4.2 Lease Lifecycle & Digital E-Signatures", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "State-compliant legal templates (Karnataka, Maharashtra, NCR, etc.), automated annual escalation, notice periods, and digital sign tracking." }),

        new Paragraph({ text: "4.3 Smart Rent Collection & Financial Engine", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "UPI/Card/Bank integration via Razorpay, automatic co-tenant rent splits, instant HRA tax receipt PDFs, and automated WhatsApp/Email late fee notifications." }),

        new Paragraph({ text: "4.4 Tenant Onboarding, KYC & Police Verification", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Verification workflows for Aadhaar (masked), PAN, Passport, Driving License, along with local police verification tracking and tenant referral rewards." }),

        new Paragraph({ text: "4.5 Maintenance & Vendor Dispatch System", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Categorized issue logging with photo upload, direct assignment to registered local technicians, cost tracking, and tenant ratings." }),

        new Paragraph({ text: "4.6 Analytics & Command Center", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Real-time revenue charts, occupancy analytics, overdue balance reports, and system activity logs." }),

        // 5. Business Model
        new Paragraph({ text: "5. Business Model & Monetization Strategy", heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 120 } }),
        new Paragraph({ text: "• Freemium Landlord Tiers: Free (up to 2 units), Pro (multi-unit + WhatsApp automation), Portfolio (unlimited units + custom domain)." }),
        new Paragraph({ text: "• Tenant Memberships: Zero-fee processing options, priority maintenance SLA, referral cashback." }),
        new Paragraph({ text: "• Transaction / Convenience Fees: Per-lease digital execution and payment routing fees." }),

        // 6. Deliverables
        new Paragraph({ text: "6. Codebase Deliverables Summary", heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 120 } }),
        new Paragraph({ text: "• Backend: Node.js + Fastify API Server located in /backend" }),
        new Paragraph({ text: "• Database: Complete schema located in /backend/prisma/schema.prisma" }),
        new Paragraph({ text: "• Frontend: React + Vite + Tailwind CSS SPA located in /frontend" }),
      ]
    }
  ]
});

Packer.toBuffer(doc).then((buffer) => {
  const outputPath = path.join(process.cwd(), 'TenantOS_Project_Proposal.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log('Docx created successfully at: ' + outputPath);
});
