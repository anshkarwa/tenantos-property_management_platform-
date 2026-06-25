const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.time('stats_raw');
  try {
    const res = await prisma.$queryRaw`
      SELECT
        (SELECT count(*)::int FROM landlords) as total_landlords,
        (SELECT count(*)::int FROM landlords WHERE is_suspended = true) as suspended_landlords,
        (SELECT count(*)::int FROM tenants WHERE is_deleted = false) as total_tenants,
        (SELECT count(*)::int FROM tenants WHERE is_flagged = true) as flagged_tenants,
        (SELECT count(*)::int FROM properties WHERE is_deleted = false) as total_properties,
        (SELECT count(*)::int FROM units WHERE is_deleted = false) as total_units,
        (SELECT count(*)::int FROM units WHERE status = 'occupied' AND is_deleted = false) as occupied_units,
        (SELECT count(*)::int FROM leases WHERE status = 'active' AND is_deleted = false) as active_leases,
        (SELECT COALESCE(sum(amount_paid), 0)::float FROM rent_collections WHERE status = 'paid') as collected_revenue,
        (SELECT COALESCE(sum(amount_due), 0)::float FROM rent_collections WHERE status IN ('pending', 'overdue')) as pending_revenue,
        (SELECT count(*)::int FROM maintenance_requests WHERE status IN ('open', 'acknowledged', 'in_progress')) as open_maintenance
    `;
    console.log('SUCCESS:', res);
  } catch(e) {
    console.error('ERROR:', e);
  } finally {
    console.timeEnd('stats_raw');
    await prisma.$disconnect();
  }
}

run();
