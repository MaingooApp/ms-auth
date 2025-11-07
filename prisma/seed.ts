import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Crear roles por defecto
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'super_admin' },
    update: {},
    create: {
      name: 'super_admin',
      description: 'Super Administrator with access to all enterprises',
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrator with full access to their enterprise',
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: 'employee' },
    update: {},
    create: {
      name: 'employee',
      description: 'Employee with limited access to their enterprise',
    },
  });

  console.log(`✅ Created roles: ${superAdminRole.name}, ${adminRole.name}, ${employeeRole.name}`);

  // Crear permisos básicos
  const permissions = [
    { name: 'users.read', description: 'Read users' },
    { name: 'users.write', description: 'Create and update users' },
    { name: 'users.delete', description: 'Delete users' },
    { name: 'invoices.read', description: 'Read invoices' },
    { name: 'invoices.write', description: 'Create and update invoices' },
    { name: 'invoices.delete', description: 'Delete invoices' },
    { name: 'suppliers.read', description: 'Read suppliers' },
    { name: 'suppliers.write', description: 'Create and update suppliers' },
    { name: 'suppliers.delete', description: 'Delete suppliers' },
    { name: 'enterprises.read', description: 'Read enterprises' },
    { name: 'enterprises.write', description: 'Create and update enterprises' },
    { name: 'enterprises.delete', description: 'Delete enterprises' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  console.log(`✅ Created ${permissions.length} permissions`);

  // Asignar todos los permisos a super_admin
  const allPermissions = await prisma.permission.findMany();

  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: permission.id,
      },
    });
  }

  console.log(`✅ Assigned all permissions to super_admin role`);

  // Asignar permisos de gestión de empresa a admin
  const adminPermissions = await prisma.permission.findMany({
    where: {
      name: {
        in: [
          'users.read',
          'users.write',
          'invoices.read',
          'invoices.write',
          'invoices.delete',
          'suppliers.read',
          'suppliers.write',
          'suppliers.delete',
        ],
      },
    },
  });

  for (const permission of adminPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  console.log(`✅ Assigned management permissions to admin role`);

  // Asignar permisos limitados a employee
  const employeePermissions = await prisma.permission.findMany({
    where: {
      name: {
        in: ['invoices.read', 'suppliers.read'],
      },
    },
  });

  for (const permission of employeePermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: employeeRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: employeeRole.id,
        permissionId: permission.id,
      },
    });
  }

  console.log(`✅ Assigned limited permissions to employee role`);
  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
