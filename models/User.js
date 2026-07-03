const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcrypt');
const { sequelize } = require('../config/database');
const { generateToken } = require('../utils/helpers');

class User extends Model {
  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  }

  // Sets a hashed verification token + 24h expiry on the instance and
  // returns the raw token to be emailed to the user. Caller must save().
  createEmailVerificationToken() {
    const { rawToken, hashedToken } = generateToken();
    this.emailVerificationToken = hashedToken;
    this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return rawToken;
  }

  // Sets a hashed reset token + 1h expiry on the instance and returns the
  // raw token to be emailed to the user. Caller must save().
  createPasswordResetToken() {
    const { rawToken, hashedToken } = generateToken();
    this.passwordResetToken = hashedToken;
    this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    return rawToken;
  }

  toJSON() {
    const values = { ...this.get() };
    delete values.password;
    delete values.emailVerificationToken;
    delete values.emailVerificationExpires;
    delete values.passwordResetToken;
    delete values.passwordResetExpires;
    delete values.tokenVersion;
    return values;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { len: [8, 100] },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM('client', 'lawyer', 'admin'),
      allowNull: false,
      defaultValue: 'client',
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    emailVerificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    emailVerificationExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    passwordResetToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    tokenVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Incremented to invalidate all previously issued JWTs (logout-all, password change/reset)',
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    hooks: {
      beforeSave: async (user) => {
        if (user.changed('password')) {
          const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
          user.password = await bcrypt.hash(user.password, saltRounds);
        }
      },
    },
  }
);

module.exports = User;
