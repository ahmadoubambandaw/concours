// Seed de démonstration : un établissement complet (Groupe Scolaire Les
// Baobabs, Dakar) avec classes, enseignants, élèves, notes, paiements…
// et un compte SUPER_ADMIN pour la plateforme.
//
//   npm run seed
//
// Comptes créés (mot de passe : Passer123!) :
//   superadmin@scolaris.app  — SUPER_ADMIN
//   admin@baobabs.sn         — SCHOOL_ADMIN
//   directeur@baobabs.sn     — DIRECTOR
//   comptable@baobabs.sn     — ACCOUNTANT
//   prof.diop@baobabs.sn     — TEACHER
//   parent.ndiaye@gmail.com  — PARENT

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';

const prisma = new PrismaClient();

const PASSWORD = 'Passer123!';

const FIRST_NAMES_M = ['Mamadou', 'Ousmane', 'Ibrahima', 'Abdoulaye', 'Moussa', 'Cheikh', 'Modou', 'Serigne', 'Pape', 'Aliou'];
const FIRST_NAMES_F = ['Fatou', 'Aminata', 'Awa', 'Khady', 'Mariama', 'Ndeye', 'Adja', 'Sokhna', 'Bineta', 'Coumba'];
const LAST_NAMES = ['Ndiaye', 'Diop', 'Fall', 'Gueye', 'Seck', 'Ba', 'Sy', 'Sarr', 'Faye', 'Cissé', 'Diallo', 'Sow'];

const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

async function main() {
  console.log('🌱 Seed Scolaris…');
  const hash = await bcrypt.hash(PASSWORD, 12);

  // --- Plateforme ---
  const existingSuper = await prisma.user.findFirst({
    where: { email: 'superadmin@scolaris.app', schoolId: null },
  });
  if (!existingSuper) {
    await prisma.user.create({
      data: {
        email: 'superadmin@scolaris.app',
        password: hash,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
      },
    });
  }

  // --- École démo ---
  const existingSchool = await prisma.school.findUnique({ where: { code: 'BAOBABS' } });
  if (existingSchool) {
    console.log('École démo déjà présente, seed ignoré.');
    return;
  }

  const school = await prisma.school.create({
    data: {
      code: 'BAOBABS',
      name: 'Groupe Scolaire Les Baobabs',
      type: 'COMPLEXE',
      status: 'ACTIVE',
      address: 'Sacré-Cœur 3, Villa 123',
      city: 'Dakar',
      country: 'SN',
      phone: '+221 33 800 00 00',
      email: 'contact@baobabs.sn',
      currency: 'XOF',
      timezone: 'Africa/Dakar',
    },
  });
  const sid = school.id;

  // --- Comptes ---
  const [admin, director, accountant] = await Promise.all([
    prisma.user.create({ data: { schoolId: sid, email: 'admin@baobabs.sn', password: hash, firstName: 'Abdou', lastName: 'Kane', role: 'SCHOOL_ADMIN' } }),
    prisma.user.create({ data: { schoolId: sid, email: 'directeur@baobabs.sn', password: hash, firstName: 'Omar', lastName: 'Thiam', role: 'DIRECTOR' } }),
    prisma.user.create({ data: { schoolId: sid, email: 'comptable@baobabs.sn', password: hash, firstName: 'Ramatoulaye', lastName: 'Diagne', role: 'ACCOUNTANT' } }),
  ]);

  // --- Année scolaire + trimestres ---
  const year = await prisma.academicYear.create({
    data: {
      schoolId: sid,
      name: '2025-2026',
      startDate: new Date('2025-10-01'),
      endDate: new Date('2026-07-31'),
      terms: {
        create: [
          { schoolId: sid, name: 'Trimestre 1', order: 1, startDate: new Date('2025-10-01'), endDate: new Date('2025-12-31') },
          { schoolId: sid, name: 'Trimestre 2', order: 2, startDate: new Date('2026-01-01'), endDate: new Date('2026-03-31') },
          { schoolId: sid, name: 'Trimestre 3', order: 3, startDate: new Date('2026-04-01'), endDate: new Date('2026-07-31') },
        ],
      },
    },
    include: { terms: { orderBy: { order: 'asc' } } },
  });
  const term1 = year.terms[0];

  // --- Niveaux ---
  const levelDefs: { name: string; cycle: 'MATERNELLE' | 'PRIMAIRE' | 'COLLEGE' | 'LYCEE'; order: number }[] = [
    { name: 'Petite Section', cycle: 'MATERNELLE', order: 1 },
    { name: 'CI', cycle: 'PRIMAIRE', order: 10 },
    { name: 'CM2', cycle: 'PRIMAIRE', order: 15 },
    { name: '6e', cycle: 'COLLEGE', order: 20 },
    { name: '3e', cycle: 'COLLEGE', order: 23 },
    { name: 'Seconde', cycle: 'LYCEE', order: 30 },
    { name: 'Terminale', cycle: 'LYCEE', order: 33 },
  ];
  const levels = await Promise.all(
    levelDefs.map((l) => prisma.level.create({ data: { ...l, schoolId: sid } })),
  );
  const level6e = levels.find((l) => l.name === '6e')!;
  const levelCM2 = levels.find((l) => l.name === 'CM2')!;

  // --- Salles ---
  const rooms = await Promise.all(
    ['Salle A1', 'Salle A2', 'Salle B1', 'Salle B2'].map((name, i) =>
      prisma.classroom.create({ data: { schoolId: sid, name, capacity: 40 + i * 5 } }),
    ),
  );

  // --- Matières ---
  const subjectDefs = [
    { name: 'Mathématiques', code: 'MATH', coefficient: 4 },
    { name: 'Français', code: 'FR', coefficient: 4 },
    { name: 'Anglais', code: 'ANG', coefficient: 2 },
    { name: 'Sciences de la Vie et de la Terre', code: 'SVT', coefficient: 2 },
    { name: 'Histoire-Géographie', code: 'HG', coefficient: 2 },
    { name: 'Éducation Physique', code: 'EPS', coefficient: 1 },
  ];
  const subjects = await Promise.all(
    subjectDefs.map((s) => prisma.subject.create({ data: { ...s, schoolId: sid } })),
  );

  // --- Enseignants ---
  const teacherDefs = [
    { firstName: 'Moustapha', lastName: 'Diop', gender: 'M' as const, specialty: 'Mathématiques', salary: 350000, email: 'prof.diop@baobabs.sn' },
    { firstName: 'Aïssatou', lastName: 'Fall', gender: 'F' as const, specialty: 'Français', salary: 340000, email: 'prof.fall@baobabs.sn' },
    { firstName: 'Jean', lastName: 'Mendy', gender: 'M' as const, specialty: 'Anglais', salary: 320000, email: 'prof.mendy@baobabs.sn' },
    { firstName: 'Mame Diarra', lastName: 'Bousso', gender: 'F' as const, specialty: 'SVT', salary: 330000, email: 'prof.bousso@baobabs.sn' },
    { firstName: 'Ibrahima', lastName: 'Sarr', gender: 'M' as const, specialty: 'Histoire-Géographie', salary: 310000, email: 'prof.sarr@baobabs.sn' },
  ];
  const teachers = [];
  for (const [i, t] of teacherDefs.entries()) {
    const user =
      i === 0
        ? await prisma.user.create({
            data: { schoolId: sid, email: t.email, password: hash, firstName: t.firstName, lastName: t.lastName, role: 'TEACHER' },
          })
        : null;
    const teacher = await prisma.teacher.create({
      data: {
        schoolId: sid,
        userId: user?.id,
        firstName: t.firstName,
        lastName: t.lastName,
        gender: t.gender,
        email: t.email,
        phone: `+221 77 ${randInt(100, 999)} ${randInt(10, 99)} ${randInt(10, 99)}`,
        hireDate: new Date('2022-10-01'),
        contractType: 'CDI',
        salary: t.salary,
        specialty: t.specialty,
        diplomas: [{ title: `Licence ${t.specialty}`, year: 2018 }],
        subjects: { create: [{ subjectId: subjects[i]?.id ?? subjects[0].id }] },
      },
    });
    teachers.push(teacher);
  }

  // --- Classes ---
  const class6eA = await prisma.schoolClass.create({
    data: {
      schoolId: sid, academicYearId: year.id, levelId: level6e.id,
      classroomId: rooms[0].id, mainTeacherId: teachers[0].id, name: '6e A', capacity: 45,
    },
  });
  const class6eB = await prisma.schoolClass.create({
    data: {
      schoolId: sid, academicYearId: year.id, levelId: level6e.id,
      classroomId: rooms[1].id, mainTeacherId: teachers[1].id, name: '6e B', capacity: 45,
    },
  });
  const classCM2 = await prisma.schoolClass.create({
    data: {
      schoolId: sid, academicYearId: year.id, levelId: levelCM2.id,
      classroomId: rooms[2].id, mainTeacherId: teachers[2].id, name: 'CM2 A', capacity: 40,
    },
  });

  // --- Grille de frais ---
  await prisma.feeStructure.createMany({
    data: [
      { schoolId: sid, name: "Frais d'inscription", category: 'INSCRIPTION', amount: 25000, frequency: 'YEARLY' },
      { schoolId: sid, name: 'Scolarité mensuelle collège', category: 'SCOLARITE', amount: 35000, frequency: 'MONTHLY', levelId: level6e.id },
      { schoolId: sid, name: 'Scolarité mensuelle primaire', category: 'SCOLARITE', amount: 25000, frequency: 'MONTHLY', levelId: levelCM2.id },
      { schoolId: sid, name: 'Uniforme', category: 'UNIFORME', amount: 15000, frequency: 'ONCE' },
      { schoolId: sid, name: 'Assurance scolaire', category: 'ASSURANCE', amount: 5000, frequency: 'YEARLY' },
      { schoolId: sid, name: 'Cantine mensuelle', category: 'CANTINE', amount: 20000, frequency: 'MONTHLY' },
      { schoolId: sid, name: 'Transport mensuel', category: 'TRANSPORT', amount: 15000, frequency: 'MONTHLY' },
    ],
  });

  // --- Élèves + parents + inscriptions + finances + notes + présences ---
  const classes = [
    { cls: class6eA, count: 18 },
    { cls: class6eB, count: 16 },
    { cls: classCM2, count: 15 },
  ];
  let matriculeSeq = 0;
  let invoiceSeq = 0;
  let receiptSeq = 0;
  let parentUserCreated = false;

  for (const { cls, count } of classes) {
    // Évaluations du trimestre 1 pour cette classe (2 par matière principale).
    const classAssessments = [];
    for (const [i, subject] of subjects.slice(0, 5).entries()) {
      for (const [j, type] of (['DEVOIR', 'CONTROLE'] as const).entries()) {
        classAssessments.push(
          await prisma.assessment.create({
            data: {
              schoolId: sid,
              classId: cls.id,
              subjectId: subject.id,
              termId: term1.id,
              teacherId: teachers[i]?.id,
              title: `${type === 'DEVOIR' ? 'Devoir' : 'Contrôle'} n°${j + 1} — ${subject.name}`,
              type,
              maxScore: 20,
              coefficient: type === 'CONTROLE' ? 2 : 1,
              date: new Date(2025, 10, 10 + j * 20),
            },
          }),
        );
      }
    }

    for (let i = 0; i < count; i++) {
      matriculeSeq += 1;
      const gender = Math.random() > 0.5 ? 'M' : 'F';
      const firstName = gender === 'M' ? rand(FIRST_NAMES_M) : rand(FIRST_NAMES_F);
      const lastName = rand(LAST_NAMES);
      const matricule = `BAOBABS-2025-${String(matriculeSeq).padStart(5, '0')}`;
      const student = await prisma.student.create({
        data: {
          schoolId: sid,
          matricule,
          qrCode: await QRCode.toDataURL(matricule, { margin: 1, width: 240 }),
          firstName,
          lastName,
          gender,
          birthDate: new Date(randInt(2012, 2015), randInt(0, 11), randInt(1, 28)),
          birthPlace: 'Dakar',
          address: 'Dakar, Sénégal',
        },
      });

      // Parent (le premier reçoit un compte portail).
      let parentUserId: string | undefined;
      if (!parentUserCreated) {
        const parentUser = await prisma.user.create({
          data: {
            schoolId: sid,
            email: 'parent.ndiaye@gmail.com',
            password: hash,
            firstName: 'Astou',
            lastName: 'Ndiaye',
            role: 'PARENT',
          },
        });
        parentUserId = parentUser.id;
      }
      const guardian = await prisma.guardian.create({
        data: {
          schoolId: sid,
          firstName: gender === 'M' ? rand(FIRST_NAMES_F) : rand(FIRST_NAMES_M),
          lastName,
          phone: `+221 77 ${randInt(100, 999)} ${randInt(10, 99)} ${randInt(10, 99)}`,
          occupation: rand(['Commerçant(e)', 'Fonctionnaire', 'Enseignant(e)', 'Chauffeur', 'Infirmier(ère)']),
          ...(parentUserId ? { userId: parentUserId, email: 'parent.ndiaye@gmail.com' } : {}),
        },
      });
      parentUserCreated = true;
      await prisma.studentGuardian.create({
        data: { studentId: student.id, guardianId: guardian.id, relation: 'MOTHER', isPrimary: true },
      });

      await prisma.enrollment.create({
        data: {
          schoolId: sid,
          studentId: student.id,
          classId: cls.id,
          academicYearId: year.id,
          options: { canteen: Math.random() > 0.5 },
        },
      });

      // Facture (inscription + 3 mois de scolarité) + paiement partiel/total.
      invoiceSeq += 1;
      const tuition = cls.id === classCM2.id ? 25000 : 35000;
      const total = 25000 + tuition * 3;
      const paidAmount = Math.random() > 0.3 ? total : randInt(1, 2) * tuition;
      const invoice = await prisma.invoice.create({
        data: {
          schoolId: sid,
          studentId: student.id,
          number: `FAC-2025-${String(invoiceSeq).padStart(5, '0')}`,
          total,
          paid: Math.min(paidAmount, total),
          status: paidAmount >= total ? 'PAID' : 'PARTIALLY_PAID',
          dueDate: new Date('2026-01-15'),
          items: {
            create: [
              { label: "Frais d'inscription", unitAmount: 25000, amount: 25000 },
              { label: 'Scolarité oct–déc', quantity: 3, unitAmount: tuition, amount: tuition * 3 },
            ],
          },
        },
      });
      receiptSeq += 1;
      await prisma.payment.create({
        data: {
          schoolId: sid,
          studentId: student.id,
          invoiceId: invoice.id,
          receiptNumber: `REC-2025-${String(receiptSeq).padStart(5, '0')}`,
          amount: Math.min(paidAmount, total),
          method: rand(['CASH', 'ORANGE_MONEY', 'WAVE', 'FREE_MONEY'] as const),
          // Réparti sur l'année scolaire (oct. → aujourd'hui) pour des
          // tableaux de bord réalistes.
          paidAt: new Date(2025, 9 + randInt(0, 9), randInt(1, 28)),
          recordedById: accountant.id,
        },
      });

      // Notes du trimestre 1 (profil aléatoire par élève).
      const studentLevel = 6 + Math.random() * 12; // moyenne cible entre 6 et 18
      for (const assessment of classAssessments) {
        const score = Math.max(0, Math.min(20, studentLevel + (Math.random() - 0.5) * 6));
        await prisma.grade.create({
          data: {
            schoolId: sid,
            assessmentId: assessment.id,
            studentId: student.id,
            score: Math.round(score * 2) / 2,
          },
        });
      }

      // Présences sur les 10 derniers jours ouvrés.
      for (let d = 0; d < 10; d++) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        const roll = Math.random();
        await prisma.attendance.create({
          data: {
            schoolId: sid,
            studentId: student.id,
            classId: cls.id,
            date: new Date(date.toISOString().slice(0, 10)),
            status: roll > 0.12 ? 'PRESENT' : roll > 0.05 ? 'ABSENT' : 'LATE',
            minutesLate: roll <= 0.05 ? randInt(5, 30) : undefined,
          },
        });
      }
    }
  }

  // --- Emploi du temps de la 6e A (matin, lun–ven) ---
  const hours: [string, string][] = [['08:00', '09:00'], ['09:00', '10:00'], ['10:15', '11:15'], ['11:15', '12:15']];
  for (let day = 1; day <= 5; day++) {
    for (const [i, [startTime, endTime]] of hours.entries()) {
      const subject = subjects[(day + i) % 5];
      const teacher = teachers[(day + i) % teachers.length];
      await prisma.timetableSlot.create({
        data: {
          schoolId: sid,
          classId: class6eA.id,
          subjectId: subject.id,
          teacherId: teacher.id,
          classroomId: rooms[0].id,
          dayOfWeek: day,
          startTime,
          endTime,
        },
      });
    }
  }

  // --- Dépenses, événements, annonces ---
  await prisma.expense.createMany({
    data: [
      { schoolId: sid, label: 'Salaires novembre', category: 'SALAIRES', amount: 1650000, date: new Date('2025-11-30') },
      { schoolId: sid, label: 'Électricité & eau', category: 'CHARGES', amount: 180000, date: new Date('2025-11-15') },
      { schoolId: sid, label: 'Fournitures pédagogiques', category: 'FOURNITURES', amount: 240000, date: new Date('2025-10-20') },
    ],
  });
  await prisma.schoolEvent.createMany({
    data: [
      { schoolId: sid, title: 'Conseil de classes — Trimestre 1', type: 'REUNION', startDate: new Date('2026-01-08') },
      { schoolId: sid, title: 'Composition du 2e trimestre', type: 'EXAMEN', startDate: new Date('2026-03-10'), endDate: new Date('2026-03-14') },
      { schoolId: sid, title: 'Vacances de Pâques', type: 'CONGES', startDate: new Date('2026-04-06'), endDate: new Date('2026-04-13') },
    ],
  });
  await prisma.announcement.create({
    data: {
      schoolId: sid,
      title: 'Bienvenue sur Scolaris !',
      body: 'La plateforme de gestion du Groupe Scolaire Les Baobabs est désormais en ligne. Parents : créez votre compte pour suivre la scolarité de vos enfants.',
      pinned: true,
    },
  });

  // --- Bibliothèque, transport, cantine (échantillons) ---
  await prisma.book.createMany({
    data: [
      { schoolId: sid, title: 'Une si longue lettre', author: 'Mariama Bâ', category: 'Roman', copies: 12, available: 12 },
      { schoolId: sid, title: "L'Aventure ambiguë", author: 'Cheikh Hamidou Kane', category: 'Roman', copies: 8, available: 8 },
      { schoolId: sid, title: 'Manuel de Mathématiques 6e', author: 'Collection CIAM', category: 'Manuel', copies: 30, available: 30 },
    ],
  });
  const bus = await prisma.bus.create({
    data: { schoolId: sid, name: 'Bus 1', plate: 'DK-1234-AB', capacity: 30, driverName: 'Modou Mbaye', driverPhone: '+221 77 555 44 33' },
  });
  await prisma.transportRoute.create({
    data: {
      schoolId: sid,
      busId: bus.id,
      name: 'Ligne Ouakam — Sacré-Cœur',
      monthlyFee: 15000,
      stops: [
        { name: 'Ouakam Cité', time: '07:00' },
        { name: 'Mermoz', time: '07:20' },
        { name: 'École', time: '07:45' },
      ],
    },
  });
  await prisma.canteenMenu.createMany({
    data: [0, 1, 2, 3, 4].map((d) => {
      const date = new Date();
      date.setDate(date.getDate() + d);
      return {
        schoolId: sid,
        date: new Date(date.toISOString().slice(0, 10)),
        meal: rand(['Thiéboudienne', 'Yassa poulet', 'Mafé', 'Thiou légumes', 'Riz sauce arachide']),
        price: 1000,
      };
    }),
  });

  console.log('✅ Seed terminé.');
  console.log(`   École : ${school.name} (code ${school.code})`);
  console.log(`   Comptes (mot de passe : ${PASSWORD})`);
  console.log('   - superadmin@scolaris.app (SUPER_ADMIN)');
  console.log('   - admin@baobabs.sn (SCHOOL_ADMIN)');
  console.log('   - directeur@baobabs.sn (DIRECTOR)');
  console.log('   - comptable@baobabs.sn (ACCOUNTANT)');
  console.log('   - prof.diop@baobabs.sn (TEACHER)');
  console.log('   - parent.ndiaye@gmail.com (PARENT)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
