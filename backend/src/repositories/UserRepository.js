/**
 * User Repository - Zeni
 *
 * Repository para operações de usuários.
 */

import { BaseRepository } from './BaseRepository.js';
import bcrypt from 'bcrypt';

export class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  /**
   * Busca usuário por email
   */
  async findByEmail(email) {
    const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  /**
   * Verifica se email já está cadastrado
   */
  async emailExists(email) {
    const result = await this.pool.query('SELECT id FROM users WHERE email = $1', [email]);
    return result.rows.length > 0;
  }

  /**
   * Cria um novo usuário
   */
  async createUser(data) {
    const { name, email, password } = data;
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await this.pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [name, email, passwordHash]
    );

    return result.rows[0];
  }

  /**
   * Verifica senha do usuário
   */
  async verifyPassword(user, password) {
    return bcrypt.compare(password, user.password_hash);
  }

  /**
   * Busca perfil do usuário (sem dados sensíveis)
   */
  async getProfile(userId) {
    const result = await this.pool.query(
      `
      SELECT
        id, name, email, monthly_income,
        onboarding_completed, onboarding_profile,
        subscription_tier, subscription_expires_at,
        created_at, updated_at
      FROM users
      WHERE id = $1
    `,
      [userId]
    );

    const user = result.rows[0];
    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      monthlyIncome: user.monthly_income ? parseFloat(user.monthly_income) : null,
      onboardingCompleted: user.onboarding_completed || false,
      onboardingProfile: user.onboarding_profile || null,
      subscriptionTier: user.subscription_tier || 'free',
      subscriptionExpiresAt: user.subscription_expires_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  /**
   * Atualiza renda mensal
   */
  async updateMonthlyIncome(userId, monthlyIncome) {
    const result = await this.pool.query(
      `
      UPDATE users
      SET monthly_income = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING monthly_income
    `,
      [userId, monthlyIncome]
    );

    return result.rows[0] ? parseFloat(result.rows[0].monthly_income) : null;
  }

  /**
   * Atualiza perfil de onboarding
   */
  async updateOnboardingProfile(userId, profileData) {
    const result = await this.pool.query(
      `
      UPDATE users
      SET onboarding_profile = COALESCE(onboarding_profile, '{}'::jsonb) || $2::jsonb,
          updated_at = NOW()
      WHERE id = $1
      RETURNING onboarding_profile
    `,
      [userId, JSON.stringify(profileData)]
    );

    return result.rows[0]?.onboarding_profile || null;
  }

  /**
   * Marca onboarding como completo
   */
  async completeOnboarding(userId) {
    await this.pool.query(
      `
      UPDATE users
      SET
        onboarding_completed = true,
        onboarding_profile = COALESCE(onboarding_profile, '{}'::jsonb) || $2::jsonb,
        updated_at = NOW()
      WHERE id = $1
    `,
      [userId, JSON.stringify({ completedAt: new Date().toISOString() })]
    );
  }

  /**
   * Pula onboarding
   */
  async skipOnboarding(userId) {
    await this.pool.query(
      `
      UPDATE users
      SET
        onboarding_completed = true,
        onboarding_profile = '{"skipped": true}'::jsonb,
        updated_at = NOW()
      WHERE id = $1
    `,
      [userId]
    );
  }

  /**
   * Obtém status do onboarding
   */
  async getOnboardingStatus(userId) {
    const result = await this.pool.query(
      `
      SELECT onboarding_completed, onboarding_profile, monthly_income
      FROM users
      WHERE id = $1
    `,
      [userId]
    );

    const user = result.rows[0];
    if (!user) return null;

    return {
      completed: user.onboarding_completed || false,
      profile: user.onboarding_profile || null,
      monthlyIncome: user.monthly_income ? parseFloat(user.monthly_income) : null,
    };
  }

  /**
   * Atualiza assinatura do usuário
   */
  async updateSubscription(userId, tier, expiresAt = null) {
    const result = await this.pool.query(
      `
      UPDATE users
      SET
        subscription_tier = $2,
        subscription_expires_at = $3,
        updated_at = NOW()
      WHERE id = $1
      RETURNING subscription_tier, subscription_expires_at
    `,
      [userId, tier, expiresAt]
    );

    return result.rows[0] || null;
  }

  /**
   * Obtém dados financeiros do usuário para análise de objetivos
   */
  async getFinancialData(userId) {
    const result = await this.pool.query(
      `
      SELECT monthly_income, onboarding_profile
      FROM users
      WHERE id = $1
    `,
      [userId]
    );

    const user = result.rows[0];
    if (!user) return null;

    return {
      monthlyIncome: user.monthly_income ? parseFloat(user.monthly_income) : 0,
      profile: user.onboarding_profile || {},
      fixedExpenses: user.onboarding_profile?.totalFixed || 0,
    };
  }

  /**
   * Verifica se usuário é admin
   */
  async isAdmin(userId) {
    const result = await this.pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.is_admin || false;
  }

  /**
   * Atualiza nome do usuário
   */
  async updateName(userId, name) {
    const result = await this.pool.query(
      `
      UPDATE users
      SET name = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING name
    `,
      [userId, name]
    );

    return result.rows[0]?.name || null;
  }

  /**
   * Atualiza senha do usuário
   */
  async updatePassword(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.pool.query(
      `
      UPDATE users
      SET password_hash = $2, updated_at = NOW()
      WHERE id = $1
    `,
      [userId, passwordHash]
    );
  }
}

// Singleton instance
export const userRepository = new UserRepository();

export default UserRepository;
