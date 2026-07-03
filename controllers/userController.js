const { User, Client, Lawyer } = require('../models');
const { AppError, asyncHandler } = require('../utils/helpers');

// GET /api/users/me
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    include: [
      { model: Client, as: 'clientProfile' },
      { model: Lawyer, as: 'lawyerProfile' },
    ],
  });
  res.status(200).json({ success: true, data: { user } });
});

// PATCH /api/users/me
const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone } = req.body;
  const user = await User.findByPk(req.user.id);

  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (phone !== undefined) user.phone = phone;
  await user.save();

  res.status(200).json({ success: true, message: 'Profile updated', data: { user } });
});

// POST /api/users/me/avatar
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('An image file is required', 400);
  }

  const user = await User.findByPk(req.user.id);
  user.avatar = `/uploads/${req.file.filename}`;
  await user.save();

  res.status(200).json({ success: true, message: 'Avatar updated', data: { user } });
});

// PATCH /api/users/me/client-profile
const upsertClientProfile = asyncHandler(async (req, res) => {
  const [profile] = await Client.findOrCreate({
    where: { userId: req.user.id },
    defaults: { userId: req.user.id },
  });

  Object.assign(profile, req.body);
  await profile.save();

  res.status(200).json({ success: true, message: 'Client profile updated', data: { profile } });
});

// PATCH /api/users/me/lawyer-profile
const upsertLawyerProfile = asyncHandler(async (req, res) => {
  const [profile] = await Lawyer.findOrCreate({
    where: { userId: req.user.id },
    defaults: { userId: req.user.id, licenseNumber: req.body.licenseNumber },
  });

  Object.assign(profile, req.body);
  await profile.save();

  res.status(200).json({ success: true, message: 'Lawyer profile updated', data: { profile } });
});

// DELETE /api/users/me
const deactivateAccount = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);
  user.isActive = false;
  user.tokenVersion += 1;
  await user.save();

  res.status(200).json({ success: true, message: 'Account deactivated' });
});

// GET /api/users (admin)
const listUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role } = req.query;
  const where = {};
  if (role) where.role = role;

  const { rows, count } = await User.findAndCountAll({
    where,
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
    order: [['createdAt', 'DESC']],
  });

  res.status(200).json({ success: true, data: { users: rows, total: count, page: Number(page) } });
});

// GET /api/users/:id (admin)
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id, {
    include: [
      { model: Client, as: 'clientProfile' },
      { model: Lawyer, as: 'lawyerProfile' },
    ],
  });
  if (!user) {
    throw new AppError('User not found', 404);
  }
  res.status(200).json({ success: true, data: { user } });
});

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  upsertClientProfile,
  upsertLawyerProfile,
  deactivateAccount,
  listUsers,
  getUserById,
};
