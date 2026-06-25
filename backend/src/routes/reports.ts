import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { authenticateLandlord } from '../middlewares/auth';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit') as any;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ExcelJS = require('exceljs') as any;

// ── Helpers ───────────────────────────────────────────────────────────────────
function inr(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}
function fmtDate(d: Date | string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export async function reportsRoutes(fastify: FastifyInstance) {

  // ── GET /api/reports/pl  — P&L Statement PDF ──────────────────────────────
  fastify.get('/pl', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const query = request.query as { year?: string };
    const year = parseInt(query.year || String(new Date().getFullYear()));

    const landlord = await prisma.landlord.findUnique({ where: { id: landlordId } });
    if (!landlord) return reply.status(404).send({ error: 'Landlord not found' });

    // Fetch all rent collections for this landlord's leases in the given year
    const startDate = new Date(year, 0, 1);
    const endDate   = new Date(year + 1, 0, 1);

    const collections = await prisma.rentCollection.findMany({
      where: {
        due_date: { gte: startDate, lt: endDate },
        lease: { unit: { property: { landlord_id: landlordId } } },
      },
      include: {
        lease: {
          include: {
            unit: { include: { property: true } },
            tenant: true,
          },
        },
      },
      orderBy: { due_date: 'asc' },
    });

    const maintenanceRequests = await prisma.maintenanceRequest.findMany({
      where: {
        unit: { property: { landlord_id: landlordId } },
        created_at: { gte: startDate, lt: endDate },
        repair_cost: { not: null },
      },
      include: { unit: { include: { property: true } } },
    });

    // Compute totals
    const totalExpected    = collections.reduce((s, c) => s + c.amount_due, 0);
    const totalCollected   = collections.filter(c => c.status === 'paid' || c.status === 'late').reduce((s, c) => s + (c.amount_paid || 0), 0);
    const totalOverdue     = collections.filter(c => c.status === 'overdue').reduce((s, c) => s + c.amount_due, 0);
    const totalMaintenance = maintenanceRequests.reduce((s, r) => s + (r.repair_cost || 0), 0);
    const netIncome        = totalCollected - totalMaintenance;

    // Monthly breakdown
    const months: Record<number, { expected: number; collected: number }> = {};
    for (let m = 0; m < 12; m++) months[m] = { expected: 0, collected: 0 };
    for (const c of collections) {
      const m = new Date(c.due_date).getMonth();
      months[m].expected  += c.amount_due;
      if (c.status === 'paid' || c.status === 'late') months[m].collected += (c.amount_paid || 0);
    }

    // ── Build PDF ─────────────────────────────────────────────────────────────
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    await new Promise<void>(resolve => {
      doc.on('end', resolve);

      const PRI  = '#3D7BFF';
      const GREY = '#6B7280';
      const BG   = '#F9FAFB';

      // Header bar
      doc.rect(0, 0, doc.page.width, 70).fill(PRI);
      doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text('TenantOS', 50, 22);
      doc.fontSize(9).font('Helvetica').text('Profit & Loss Statement', 50, 46);
      doc.text(`FY ${year}–${String(year + 1).slice(2)}  ·  Generated ${fmtDate(new Date())}`, 50, 58);

      // Landlord
      doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold').text(landlord.name, 50, 90);
      doc.fillColor(GREY).fontSize(9).font('Helvetica').text(landlord.email + '  ·  ' + landlord.phone, 50, 105);

      // KPI boxes
      const kpis = [
        { label: 'Rent Expected',   value: inr(totalExpected) },
        { label: 'Rent Collected',  value: inr(totalCollected) },
        { label: 'Overdue',         value: inr(totalOverdue) },
        { label: 'Maintenance Cost',value: inr(totalMaintenance) },
        { label: 'Net Income',      value: inr(netIncome) },
      ];
      const boxW = 95, boxH = 52, startX = 50, startY = 130, gap = 8;
      kpis.forEach((k, i) => {
        const x = startX + i * (boxW + gap);
        doc.rect(x, startY, boxW, boxH).fill(BG);
        doc.fillColor(GREY).fontSize(7).font('Helvetica').text(k.label.toUpperCase(), x + 6, startY + 8, { width: boxW - 12 });
        doc.fillColor(i === 4 ? PRI : '#111827').fontSize(11).font('Helvetica-Bold').text(k.value, x + 6, startY + 22, { width: boxW - 12 });
      });

      // Monthly table
      const tableY = 200;
      doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold').text('Monthly Breakdown', 50, tableY);

      const cols = [50, 140, 290, 390, 490];
      const headers = ['Month', 'Expected', 'Collected', 'Variance', 'Collection %'];
      const rowH = 22;

      // Table header
      doc.rect(50, tableY + 16, doc.page.width - 100, rowH).fill(PRI);
      headers.forEach((h, i) => {
        doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold').text(h, cols[i], tableY + 22, { width: 90 });
      });

      const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      let y = tableY + 16 + rowH;

      for (let m = 0; m < 12; m++) {
        const bg = m % 2 === 0 ? '#FFFFFF' : BG;
        doc.rect(50, y, doc.page.width - 100, rowH).fill(bg);
        const exp = months[m].expected;
        const col = months[m].collected;
        const vari = col - exp;
        const pct  = exp > 0 ? Math.round((col / exp) * 100) : 0;
        const rowData = [MONTH_NAMES[m], inr(exp), inr(col), inr(vari), pct + '%'];
        rowData.forEach((d, i) => {
          let color = '#111827';
          if (i === 3) color = vari >= 0 ? '#059669' : '#DC2626';
          if (i === 4) color = pct >= 90 ? '#059669' : pct >= 60 ? '#D97706' : '#DC2626';
          doc.fillColor(color).fontSize(8).font('Helvetica').text(d, cols[i], y + 7, { width: 90 });
        });
        y += rowH;
      }

      // Totals row
      doc.rect(50, y, doc.page.width - 100, rowH).fill(PRI);
      const totalPct = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
      ['TOTAL', inr(totalExpected), inr(totalCollected), inr(totalCollected - totalExpected), totalPct + '%'].forEach((d, i) => {
        doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold').text(d, cols[i], y + 7, { width: 90 });
      });
      y += rowH + 20;

      // Maintenance section
      if (maintenanceRequests.length > 0) {
        doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold').text('Maintenance Costs', 50, y);
        y += 18;
        doc.rect(50, y, doc.page.width - 100, rowH).fill(PRI);
        ['Date', 'Property', 'Issue', 'Cost'].forEach((h, i) => {
          doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold').text(h, [50, 140, 270, 450][i], y + 7, { width: 120 });
        });
        y += rowH;
        maintenanceRequests.forEach((r, idx) => {
          const bg = idx % 2 === 0 ? '#FFFFFF' : BG;
          doc.rect(50, y, doc.page.width - 100, rowH).fill(bg);
          const row = [fmtDate(r.created_at), r.unit.property.name, r.title, inr(r.repair_cost || 0)];
          row.forEach((d, i) => {
            doc.fillColor('#111827').fontSize(8).font('Helvetica').text(d, [50, 140, 270, 450][i], y + 7, { width: 120 });
          });
          y += rowH;
        });
      }

      // Footer
      doc.fillColor(GREY).fontSize(8).font('Helvetica')
        .text(`TenantOS — Confidential  ·  For tax filing purposes only`, 50, doc.page.height - 40, { align: 'center', width: doc.page.width - 100 });

      doc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);
    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="TenantOS_PL_${year}.pdf"`)
      .send(pdfBuffer);
  });

  // ── GET /api/reports/tds  — TDS Compliance PDF ────────────────────────────
  fastify.get('/tds', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const query = request.query as { year?: string };
    const year = parseInt(query.year || String(new Date().getFullYear()));

    const landlord = await prisma.landlord.findUnique({ where: { id: landlordId } });
    if (!landlord) return reply.status(404).send({ error: 'Landlord not found' });

    const startDate = new Date(year, 3, 1);  // April 1 (Indian FY)
    const endDate   = new Date(year + 1, 3, 1);

    // Leases with rent > 50,000 (TDS threshold)
    const tdsLeases = await prisma.lease.findMany({
      where: {
        monthly_rent: { gt: 50000 },
        unit: { property: { landlord_id: landlordId } },
        is_deleted: false,
      },
      include: {
        tenant: true,
        unit: { include: { property: true } },
        rent_collections: {
          where: {
            due_date: { gte: startDate, lt: endDate },
            status: { in: ['paid', 'late'] },
          },
        },
      },
    });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    await new Promise<void>(resolve => {
      doc.on('end', resolve);

      const PRI  = '#3D7BFF';
      const GREY = '#6B7280';
      const BG   = '#F9FAFB';
      const fyLabel = `FY ${year}–${String(year + 1).slice(2)}`;

      // Header
      doc.rect(0, 0, doc.page.width, 70).fill(PRI);
      doc.fillColor('#fff').fontSize(20).font('Helvetica-Bold').text('TenantOS', 50, 22);
      doc.fontSize(9).font('Helvetica').text('TDS Compliance Report — Section 194-IB', 50, 46);
      doc.text(`${fyLabel}  ·  Generated ${fmtDate(new Date())}`, 50, 58);

      doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold').text(landlord.name, 50, 90);
      doc.fillColor(GREY).fontSize(9).font('Helvetica').text('PAN: ' + (landlord.pan || 'Not Linked') + '  ·  ' + landlord.email, 50, 105);

      doc.fillColor(GREY).fontSize(9).font('Helvetica')
        .text('TDS @ 5% is applicable on rent exceeding ₹50,000/month under Section 194-IB of the Income Tax Act, 1961.', 50, 125, { width: doc.page.width - 100 });

      if (tdsLeases.length === 0) {
        doc.fillColor('#111827').fontSize(11).text('No leases exceed the TDS threshold of ₹50,000/month for this period.', 50, 160);
      } else {
        let y = 160;
        tdsLeases.forEach((lease, idx) => {
          const totalPaid = lease.rent_collections.reduce((s, c) => s + (c.amount_paid || 0), 0);
          const tdsAmount = Math.round(totalPaid * 0.05);

          // Lease card
          doc.rect(50, y, doc.page.width - 100, 20).fill(PRI);
          doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold')
            .text(`${idx + 1}. ${lease.tenant.name}  ·  ${lease.unit.property.name}`, 56, y + 6);
          y += 20;

          const rows = [
            ['Tenant PAN', lease.tenant.pan || 'Not Provided'],
            ['Tenant Phone', lease.tenant.phone],
            ['Property', lease.unit.property.name + ', ' + lease.unit.property.city],
            ['Monthly Rent', inr(lease.monthly_rent)],
            ['Total Rent Collected', inr(totalPaid)],
            ['TDS @ 5%', inr(tdsAmount)],
            ['Net Rent After TDS', inr(totalPaid - tdsAmount)],
          ];

          rows.forEach((row, ri) => {
            const bg = ri % 2 === 0 ? '#FFFFFF' : BG;
            doc.rect(50, y, doc.page.width - 100, 20).fill(bg);
            doc.fillColor(GREY).fontSize(8).font('Helvetica').text(row[0], 56, y + 6, { width: 160 });
            const isHighlight = ri === 5;
            doc.fillColor(isHighlight ? '#DC2626' : '#111827').fontSize(8)
              .font(isHighlight ? 'Helvetica-Bold' : 'Helvetica').text(row[1], 220, y + 6, { width: 280 });
            y += 20;
          });
          y += 12;
        });
      }

      doc.fillColor(GREY).fontSize(7).font('Helvetica')
        .text('This report is auto-generated by TenantOS for informational purposes. Consult your CA for filing.', 50, doc.page.height - 40, { align: 'center', width: doc.page.width - 100 });

      doc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);
    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="TenantOS_TDS_${year}.pdf"`)
      .send(pdfBuffer);
  });

  // ── GET /api/reports/rent-collection  — Excel ─────────────────────────────
  fastify.get('/rent-collection', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const query = request.query as { year?: string };
    const year = parseInt(query.year || String(new Date().getFullYear()));

    const startDate = new Date(year, 0, 1);
    const endDate   = new Date(year + 1, 0, 1);

    const collections = await prisma.rentCollection.findMany({
      where: {
        due_date: { gte: startDate, lt: endDate },
        lease: { unit: { property: { landlord_id: landlordId } } },
      },
      include: {
        lease: {
          include: {
            unit: { include: { property: true } },
            tenant: true,
          },
        },
      },
      orderBy: { due_date: 'asc' },
    });

    const workbook  = new ExcelJS.Workbook();
    workbook.creator = 'TenantOS';
    workbook.created  = new Date();

    const sheet = workbook.addWorksheet('Rent Collections', {
      pageSetup: { fitToPage: true, fitToWidth: 1 },
    });

    // Title row
    sheet.mergeCells('A1:K1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `TenantOS — Rent Collection Report ${year}`;
    titleCell.font  = { bold: true, size: 14, color: { argb: 'FF3D7BFF' } };
    titleCell.alignment = { horizontal: 'center' };
    sheet.getRow(1).height = 28;

    // Column headers
    sheet.addRow([]);
    const headerRow = sheet.addRow([
      'Month', 'Property', 'Tenant', 'Tenant Phone', 'Tenant PAN',
      'Due Date', 'Amount Due', 'Amount Paid', 'Status', 'Payment Method', 'Paid On',
    ]);
    headerRow.eachCell((cell: any) => {
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3D7BFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border    = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    });
    headerRow.height = 20;

    // Data rows
    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    collections.forEach((c, idx) => {
      const statusColor: Record<string, string> = {
        paid: 'FF059669', late: 'FFD97706', overdue: 'FFDC2626', pending: 'FF6B7280',
      };
      const row = sheet.addRow([
        MONTH_NAMES[new Date(c.due_date).getMonth()] + ' ' + year,
        c.lease.unit.property.name,
        c.lease.tenant.name,
        c.lease.tenant.phone,
        c.lease.tenant.pan || '—',
        new Date(c.due_date).toLocaleDateString('en-IN'),
        c.amount_due,
        c.amount_paid || 0,
        c.status.toUpperCase(),
        c.payment_method || '—',
        c.paid_at ? new Date(c.paid_at).toLocaleDateString('en-IN') : '—',
      ]);

      // Alternate row shading
      if (idx % 2 === 0) {
        row.eachCell((cell: any) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        });
      }

      // Status cell colour
      const statusCell = row.getCell(9);
      statusCell.font = { bold: true, color: { argb: statusColor[c.status] || 'FF6B7280' } };

      // Currency format for amounts
      [7, 8].forEach(col => {
        row.getCell(col).numFmt = '₹#,##0';
        row.getCell(col).alignment = { horizontal: 'right' };
      });
    });

    // Totals row
    const totalDue  = collections.reduce((s, c) => s + c.amount_due, 0);
    const totalPaid = collections.reduce((s, c) => s + (c.amount_paid || 0), 0);
    sheet.addRow([]);
    const totRow = sheet.addRow(['', '', '', '', '', 'TOTAL', totalDue, totalPaid, '', '', '']);
    totRow.getCell(6).font = { bold: true };
    [7, 8].forEach(col => {
      totRow.getCell(col).numFmt  = '₹#,##0';
      totRow.getCell(col).font    = { bold: true, color: { argb: 'FF3D7BFF' } };
      totRow.getCell(col).alignment = { horizontal: 'right' };
    });

    // Column widths
    sheet.columns = [
      { width: 12 }, { width: 24 }, { width: 20 }, { width: 15 }, { width: 14 },
      { width: 14 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 16 }, { width: 14 },
    ];

    const buffer = await workbook.xlsx.writeBuffer() as Buffer;
    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename="TenantOS_RentCollection_${year}.xlsx"`)
      .send(buffer);
  });
}
