import { User } from '../types';
import { UserRepository } from '../repositories/user.repository';

export class UserService {
  private userRepo: UserRepository;

  constructor() {
    this.userRepo = new UserRepository();
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);
    
    if (!user) {
      throw new Error('User not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUser(id: string, updates: any): Promise<User> {
    if (!updates) {
      throw new Error('No updates provided');
    }
    // Handle fullName from FE/Test
    if (updates.fullName && typeof updates.fullName === 'string') {
      const parts = updates.fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        updates.firstName = parts[0];
        updates.lastName = parts.slice(1).join(' ');
      } else {
        updates.firstName = updates.fullName;
      }
      delete updates.fullName;
    }

    // Remove fields that shouldn't be updated directly
    const { password: _p, role, createdAt, updatedAt, id: _id, ...safeUpdates } = updates;
    
    const user = await this.userRepo.update(id, safeUpdates);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async deleteUser(id: string): Promise<void> {
    await this.userRepo.delete(id);
  }

  async getUserCount(): Promise<number> {
    return this.userRepo.count();
  }
}
