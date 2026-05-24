import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
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
  }

  private async seedProfileDefaults(): Promise<void> {
    const specializationDefaults = [
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
}
