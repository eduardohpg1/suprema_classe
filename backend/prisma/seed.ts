import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface SeedProduct {
  code: string;
  name: string;
  size: string;
  color: string;
  rentalPrice: number;
  salePrice?: number;
}

const CATEGORIES: Record<string, SeedProduct[]> = {
  'Vestido Longo': [
    { code: 'VL-001', name: 'Vestido Longo Sereia Bordado', size: 'M', color: 'Vinho', rentalPrice: 350, salePrice: 1800 },
    { code: 'VL-002', name: 'Vestido Longo Tomara que Caia', size: 'G', color: 'Azul Royal', rentalPrice: 320 },
  ],
  'Vestido Curto': [
    { code: 'VC-001', name: 'Vestido Curto Paete', size: 'P', color: 'Dourado', rentalPrice: 200, salePrice: 900 },
    { code: 'VC-002', name: 'Vestido Curto Godê', size: 'M', color: 'Preto', rentalPrice: 180 },
  ],
  'Traje Masculino': [
    { code: 'TM-001', name: 'Traje Passeio Completo', size: 'G', color: 'Cinza Chumbo', rentalPrice: 250 },
    { code: 'TM-002', name: 'Smoking Clássico', size: 'GG', color: 'Preto', rentalPrice: 300, salePrice: 1500 },
  ],
  Terno: [
    { code: 'TN-001', name: 'Terno Slim Fit', size: 'M', color: 'Azul Marinho', rentalPrice: 220 },
    { code: 'TN-002', name: 'Terno Risca de Giz', size: 'G', color: 'Grafite', rentalPrice: 240 },
  ],
  Infantil: [
    { code: 'IN-001', name: 'Vestido Infantil Princesa', size: '6', color: 'Rosa', rentalPrice: 120, salePrice: 450 },
    { code: 'IN-002', name: 'Mini Terno Festa', size: '8', color: 'Branco', rentalPrice: 130 },
  ],
};

const CUSTOMERS = [
  {
    name: 'Maria Aparecida Souza',
    cpf: '12345678901',
    rg: '12.345.678-9',
    phone: '(11) 98765-4321',
    address: 'Rua das Flores, 123 - Sao Paulo/SP',
    notes: 'Cliente preferencial.',
  },
  {
    name: 'Joao Carlos Pereira',
    cpf: '98765432100',
    rg: '98.765.432-1',
    phone: '(11) 91234-5678',
    address: 'Av. Paulista, 1000 - Sao Paulo/SP',
    notes: null,
  },
];

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('Iniciando seed...');

  // Usuario admin.
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@supremaclasse.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
  const hashed = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Administrador',
      email: adminEmail,
      password: hashed,
      role: 'ADMIN',
    },
  });
  // eslint-disable-next-line no-console
  console.log(`Usuario admin: ${adminEmail} / ${adminPassword}`);

  // Categorias + produtos.
  for (const [categoryName, products] of Object.entries(CATEGORIES)) {
    const category = await prisma.category.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName },
    });

    for (const p of products) {
      await prisma.product.upsert({
        where: { code: p.code },
        update: {},
        create: {
          code: p.code,
          name: p.name,
          categoryId: category.id,
          size: p.size,
          color: p.color,
          rentalPrice: new Prisma.Decimal(p.rentalPrice),
          salePrice:
            p.salePrice !== undefined ? new Prisma.Decimal(p.salePrice) : null,
          status: 'AVAILABLE',
        },
      });
    }
    // eslint-disable-next-line no-console
    console.log(`Categoria "${categoryName}" + ${products.length} produtos.`);
  }

  // Clientes.
  for (const c of CUSTOMERS) {
    await prisma.customer.upsert({
      where: { cpf: c.cpf },
      update: {},
      create: c,
    });
  }
  // eslint-disable-next-line no-console
  console.log(`${CUSTOMERS.length} clientes de exemplo.`);

  // eslint-disable-next-line no-console
  console.log('Seed concluido com sucesso.');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
