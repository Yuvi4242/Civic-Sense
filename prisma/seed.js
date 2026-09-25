const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Seed Departments
  const departmentsData = [
    {
      name: 'Roads & Infrastructure',
      description: 'Maintenance of municipal roads, bridges, pavements, and traffic signage.',
    },
    {
      name: 'Sanitation',
      description: 'Waste management, public garbage collection, and municipal cleanliness.',
    },
    {
      name: 'Electrical',
      description: 'Streetlights, power distribution hazards, and municipal electrical infrastructure.',
    },
    {
      name: 'Water Supply & Drainage',
      description: 'Water distribution, pipe leakages, storm drains, and sewage control.',
    },
    {
      name: 'Parks & Environment',
      description: 'Public parks, fallen trees, urban greenery, and environmental hazards.',
    },
    {
      name: 'General / Unclassified',
      description: 'General civic complaints requiring administrative triage.',
    },
  ];

  const deptMap = {};

  for (const dept of departmentsData) {
    const record = await prisma.department.upsert({
      where: { name: dept.name },
      update: { description: dept.description },
      create: { name: dept.name, description: dept.description },
    });
    deptMap[dept.name] = record.id;
    console.log(`✅ Department: ${dept.name} (${record.id})`);
  }

  // 2. Seed Category Rules
  const categoryRulesData = [
    { category: 'pothole', deptName: 'Roads & Infrastructure', slaHours: 168 },
    { category: 'road_damage', deptName: 'Roads & Infrastructure', slaHours: 168 },
    { category: 'garbage', deptName: 'Sanitation', slaHours: 48 },
    { category: 'open_manhole', deptName: 'Sanitation', slaHours: 24 },
    { category: 'streetlight', deptName: 'Electrical', slaHours: 120 },
    { category: 'exposed_wiring', deptName: 'Electrical', slaHours: 24 },
    { category: 'water_leakage', deptName: 'Water Supply & Drainage', slaHours: 72 },
    { category: 'waterlogging', deptName: 'Water Supply & Drainage', slaHours: 48 },
    { category: 'fallen_tree', deptName: 'Parks & Environment', slaHours: 96 },
    { category: 'park_maintenance', deptName: 'Parks & Environment', slaHours: 120 },
    { category: 'other', deptName: 'General / Unclassified', slaHours: 120 },
  ];

  for (const rule of categoryRulesData) {
    const departmentId = deptMap[rule.deptName];
    if (!departmentId) {
      console.warn(`⚠️ Warning: Department "${rule.deptName}" not found for category "${rule.category}"`);
      continue;
    }

    await prisma.categoryRule.upsert({
      where: { category: rule.category },
      update: {
        departmentId,
        slaHours: rule.slaHours,
      },
      create: {
        category: rule.category,
        departmentId,
        slaHours: rule.slaHours,
      },
    });
    console.log(`✅ Rule: "${rule.category}" -> ${rule.deptName} (${rule.slaHours}h SLA)`);
  }

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
