import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { QueryAdminUsersDto } from './dto/query-admin-users.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAllUsers(query: QueryAdminUsersDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.userRepository.createQueryBuilder('user');

    if (query.search && query.search.trim() !== '') {
      const search = query.search.trim().toLowerCase();
      qb.where(
        '(LOWER(user.username) LIKE :search OR LOWER(user.displayName) LIKE :search OR LOWER(user.email) LIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }
    return user;
  }

  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findUserById(id);
    Object.assign(user, updateData);
    return this.userRepository.save(user);
  }

  async deleteUser(id: string): Promise<{ message: string; id: string }> {
    const user = await this.findUserById(id);
    await this.userRepository.remove(user);
    return { message: 'User deleted successfully', id };
  }
}
