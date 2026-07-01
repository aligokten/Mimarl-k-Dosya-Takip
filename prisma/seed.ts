import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { getDatabaseUrl } from "../src/lib/db-url";

const adapter = new PrismaPg({
  connectionString: getDatabaseUrl(),
});
const prisma = new PrismaClient({ adapter });

const DEFAULT_SERVICES: { name: string; stages: string[] }[] = [
  {
    name: "Mimari Proje",
    stages: [
      "Röleve / Ölçüm",
      "Ön Proje",
      "Kesin Proje",
      "Uygulama Projesi",
      "Müellif Onayı",
      "Belediye Onayı",
      "Teslim",
    ],
  },
  {
    name: "Akustik Rapor",
    stages: [
      "Saha Ölçümü",
      "Rapor Hazırlığı",
      "Kontrol / Onay",
      "İlgili Kuruma Teslim",
    ],
  },
  {
    name: "Yapı Ruhsatı",
    stages: [
      "Evrak Toplama",
      "Vekaletname Kontrolü",
      "Belediyeye Başvuru",
      "İnceleme",
      "Eksik Evrak Tamamlama",
      "Ruhsat Onayı",
      "Ruhsat Teslimi",
    ],
  },
  {
    name: "Yapı Kullanma İzni (İskan)",
    stages: [
      "Evrak Toplama",
      "Kurum Vizeleri",
      "Belediyeye Başvuru",
      "İnceleme",
      "İskan Onayı",
      "İskan Teslimi",
    ],
  },
  {
    name: "Zemin Etüdü",
    stages: ["Saha Çalışması", "Laboratuvar", "Rapor Teslimi"],
  },
];

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "aligokten99@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "degistirin123";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Ali Gökten";

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        passwordHash,
        role: "ADMIN",
      },
    });
    console.log(`Yönetici kullanıcı oluşturuldu: ${adminEmail}`);
    console.log(
      `Geçici şifre: ${adminPassword} (ilk girişten sonra değiştirin)`
    );
  } else {
    console.log(`Yönetici kullanıcı zaten mevcut: ${adminEmail}`);
  }

  for (let i = 0; i < DEFAULT_SERVICES.length; i++) {
    const { name, stages } = DEFAULT_SERVICES[i];
    const serviceType = await prisma.serviceType.upsert({
      where: { name },
      update: {},
      create: { name, order: i },
    });

    for (let j = 0; j < stages.length; j++) {
      const stageName = stages[j];
      const existingStage = await prisma.stageTemplate.findFirst({
        where: { serviceTypeId: serviceType.id, name: stageName },
      });
      if (!existingStage) {
        await prisma.stageTemplate.create({
          data: {
            name: stageName,
            order: j,
            serviceTypeId: serviceType.id,
          },
        });
      }
    }
  }

  console.log("Varsayılan hizmet türleri ve aşamalar hazırlandı.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
