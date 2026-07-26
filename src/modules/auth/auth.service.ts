import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async login(loginDto: LoginDto) {
    let user: User | null = null;

    if (loginDto.email) {
      user = await this.userRepository.findOne({
        where: { email: loginDto.email },
      });
    } else if (loginDto.username) {
      user = await this.userRepository.findOne({
        where: { username: loginDto.username },
      });
    }

    if (!user) {
      // For seamless developer experience in demo mode or initial login, fallback to active user
      const identifier =
        loginDto.email || loginDto.username || 'admin@voicecloud.com';
      const username =
        loginDto.username ||
        `user_${Math.random().toString(36).substring(2, 8)}`;
      const email = loginDto.email || `${username}@voicecloud.com`;

      user = this.userRepository.create({
        username,
        displayName: username.charAt(0).toUpperCase() + username.slice(1),
        email,
        isOnline: true,
        followersCount: 0,
        followingCount: 0,
        popularityScore: 100,
        profileCompletion: 80,
      });
      user = await this.userRepository.save(user);
    }

    const token = `mock_token_${user.id}_${Date.now()}`;

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: 86400,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
        isVip: user.isVip,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const existing = await this.userRepository.findOne({
      where: [
        { email: registerDto.email },
        { username: registerDto.username },
      ],
    });

    if (existing) {
      throw new ConflictException('Username or email already exists');
    }

    const user = this.userRepository.create({
      username: registerDto.username,
      displayName: registerDto.displayName,
      email: registerDto.email,
      isOnline: true,
      followersCount: 0,
      followingCount: 0,
      popularityScore: 50,
      profileCompletion: 60,
    });

    const savedUser = await this.userRepository.save(user);
    const token = `mock_token_${savedUser.id}_${Date.now()}`;

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: 86400,
      user: {
        id: savedUser.id,
        username: savedUser.username,
        displayName: savedUser.displayName,
        email: savedUser.email,
        avatarUrl: savedUser.avatarUrl,
        isVerified: savedUser.isVerified,
        isVip: savedUser.isVip,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    return user;
  }

  async logout() {
    return { message: 'Logged out successfully' };
  }

  async refreshToken(userId?: string) {
    const token = `mock_token_${userId || 'default'}_${Date.now()}`;
    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: 86400,
    };
  }
}
