import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Crear roles por defecto
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrator with full access',
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: 'employee' },
    update: {},
    create: {
      name: 'employee',
      description: 'Employee with limited access',
    },
  });

  console.log(`✅ Created roles: ${adminRole.name}, ${employeeRole.name}`);

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
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  console.log(`✅ Created ${permissions.length} permissions`);

  // Asignar todos los permisos a admin
  const allPermissions = await prisma.permission.findMany();

  for (const permission of allPermissions) {
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

  console.log(`✅ Assigned all permissions to admin role`);

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
