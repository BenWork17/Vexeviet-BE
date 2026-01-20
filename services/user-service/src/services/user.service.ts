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

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    // Remove fields that shouldn't be updated directly
    type UserUpdateInput = Partial<Omit<User, 'id' | 'password' | 'role' | 'createdAt'>>;
    
    const safeUpdates = updates as UserUpdateInput;

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
