import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient, Role } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    await this.seedDefaults();
  }

  private async seedDefaults(): Promise<void> {
    const totalUsers = await this.user.count();
    if (totalUsers === 0) {
      const passwordHash = await hash('Pass@123', 10);

      await this.user.createMany({
        data: [
          {
            email: 'superadmin@lexassess.com',
            name: 'Super Admin',
            role: Role.SUPERADMIN,
            passwordHash,
          },
          {
            email: 'admin@lexassess.com',
            name: 'Admin User',
            role: Role.ADMIN,
            passwordHash,
          },
          {
            email: 'company@lexassess.com',
            name: 'Company User',
            role: Role.COMPANY,
            passwordHash,
          },
          {
            email: 'student@lexassess.com',
            name: 'Student User',
            role: Role.USER,
            passwordHash,
          },
        ],
      });
    }

    await this.seedProfileDefaults();
    await this.seedNotificationDefaults();
  }

  private async seedProfileDefaults(): Promise<void> {
    const specializationDefaults = [
      'General',
      'Capital Markets',
      'General Corporate',
      'Disputes',
      'Maritime and Aviation',
      'Intellectual Property Rights',
      'Taxation',
      'Banking and Finance',
      'Competition',
      'Labour',
      'Data Protection',
      'Technology',
    ];

    for (let index = 0; index < specializationDefaults.length; index += 1) {
      const name = specializationDefaults[index]!;
      await this.specialization.upsert({
        where: { name },
        update: { sortOrder: index + 1, isActive: true },
        create: { name, sortOrder: index + 1, isActive: true },
      });
    }

    const lawColleges = [
      'National Law School of India University, Bengaluru',
      'National Law University, New Delhi',
      'NALSAR University of Law, Hyderabad',
      'The West Bengal National University of Juridical Sciences, Kolkata',
      'Symbiosis Law School, Pune',
      'Jamia Millia Islamia, New Delhi',
      'IIT Kharagpur - Rajiv Gandhi School of Intellectual Property Law',
      'Gujarat National Law University, Gandhinagar',
      'Siksha O Anusandhan University, Bhubaneswar',
      'Babasheb Bhimrao Ambedkar University, Lucknow',
      'Kalinga Institute of Industrial Technology, Bhubaneswar',
      'Aligarh Muslim University, Aligarh',
      'Saveetha Institute of Medical and Technical Sciences, Chennai',
      'UPES, Dehradun',
      'Dr. Ram Manohar Lohiya National Law University, Lucknow',
      'Damodaram Sanjivayya National Law University, Visakhapatnam',
      'National Law Institute University, Bhopal',
      'Maharashtra National Law University, Nagpur',
      'University of Lucknow, Lucknow',
      'National University of Study and Research in Law, Ranchi',
      'ICFAI Foundation for Higher Education, Hyderabad',
      'Manipal University Jaipur',
      'Nirma University, Ahmedabad',
      'Himachal Pradesh National Law University, Shimla',
      'National Law University and Judicial Academy, Guwahati',
      'Galgotias University, Greater Noida',
      'Army Institute of Law, Mohali',
      'GITAM School of Law, Visakhapatnam',
      'Amity University, Gurugram',
      'Central University of Punjab, Bathinda',
      'National Law University Odisha, Cuttack',
      'Maharashtra National Law University, Mumbai',
      'Maharashtra National Law University, Aurangabad',
      'Hidayatullah National Law University, Raipur',
      'Rajiv Gandhi National University of Law, Patiala',
      'National University of Advanced Legal Studies, Kochi',
      'Chanakya National Law University, Patna',
      'National Law University, Jodhpur',
      'Tamil Nadu National Law University, Tiruchirappalli',
      'Dharmashastra National Law University, Jabalpur',
      'MNLU Goa',
      'Jindal Global Law School, Sonipat',
      'Faculty of Law, University of Delhi',
      'ILS Law College, Pune',
      'Government Law College, Mumbai',
      'School of Law, Christ University, Bengaluru',
      'Bennett University School of Law, Greater Noida',
      'School of Law, NMIMS, Mumbai',
      'Lloyd Law College, Greater Noida',
      'School of Law, SRM University, Chennai',
    ];

    for (const name of lawColleges) {
      await this.lawCollege.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }

    const degreeDefaults = ['BA LLB', 'BBA LLB', 'BCom LLB', 'BSc LLB', 'LLB', 'LLM', 'BLS LLB', 'BA LLB (Hons.)', 'BBA LLB (Hons.)'];
    for (const name of degreeDefaults) {
      await this.degreeOption.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
  }

  private async seedNotificationDefaults(): Promise<void> {
    const defaults = [
      {
        placement: 'BANNER' as const,
        label: 'Update',
        title: 'New seats opened for Banking & Finance internship applicants.',
        description: null,
        sortOrder: 1,
      },
      {
        placement: 'BANNER' as const,
        label: 'Update',
        title: 'Disputes assessment window extended for the current cycle.',
        description: null,
        sortOrder: 2,
      },
      {
        placement: 'BANNER' as const,
        label: 'Update',
        title: 'Capital Markets review panel is now accepting fresh student submissions.',
        description: null,
        sortOrder: 3,
      },
      {
        placement: 'CARD' as const,
        label: 'Seats Open',
        title: 'AZB & Partners is hiring in General Corporate',
        description:
          'Fresh internship seats are now open for General Corporate applicants in the current cycle.',
        sortOrder: 1,
      },
      {
        placement: 'CARD' as const,
        label: 'Application Window',
        title: 'Disputes applications extended this week',
        description:
          'Students targeting disputes can continue submitting assessment-backed applications for the active intake.',
        sortOrder: 2,
      },
      {
        placement: 'CARD' as const,
        label: 'Hot Track',
        title: 'Banking & Finance demand is up across firms',
        description:
          'Multiple legal teams are actively scouting ranked students with Banking & Finance assessment performance.',
        sortOrder: 3,
      },
    ];

    for (const item of defaults) {
      await this.notification.upsert({
        where: {
          placement_title: {
            placement: item.placement,
            title: item.title,
          },
        },
        update: {
          label: item.label,
          description: item.description,
          sortOrder: item.sortOrder,
          isActive: true,
        },
        create: item,
      });
    }
  }
}

export interface PrismaService extends PrismaClient {}
