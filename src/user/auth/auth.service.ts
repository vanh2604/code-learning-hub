import { ConflictException, HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { UserType } from '@prisma/client';
interface SignupParams {
  email: string;
  password: string;
}

interface SignInParams {
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prismaService: PrismaService) {}
  async signUp({ email, password }: SignupParams, userType: UserType) {
    const userExists = await this.prismaService.user.findUnique({
      where: { email },
    });
    if (userExists) {
      throw new ConflictException();
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prismaService.user.create({
      data: {
        email,
        password: hashedPassword,
        userType: userType || UserType.STUDENT,
      },
    });

    const token = await jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRETE,
      {
        expiresIn: 360000000,
      },
    );
    return token;
  }

  async signIn({ email, password }: SignInParams) {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new HttpException('Invalid credentials', 400);
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new HttpException('Invalid credentials', 400);
    }

    const token = await this.generateToken({ id: user.id, email: user.email });
    return { access_token: token, email: user.email };
  }

  private async generateToken({ id, email }: { id: number; email: string }) {
    const token = await jwt.sign({ email, id }, process.env.JWT_SECRETE, {
      expiresIn: 360000000,
    });
    return token;
  }
}
