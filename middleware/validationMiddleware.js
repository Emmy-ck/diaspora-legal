const { body, param, query, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({ field: err.path, message: err.msg })),
    });
  }
  next();
};

const registerValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('phone').optional({ checkFalsy: true }).isString(),
  body('role').optional().isIn(['client', 'lawyer']).withMessage('Role must be client or lawyer'),
  validate,
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

const emailOnlyValidation = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  validate,
];

const resetPasswordValidation = [
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  validate,
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long'),
  validate,
];

// Generic, reusable across any resource route, e.g.:
//   router.get('/:id', validateUUIDParam(), controller.getOne);
const validateUUIDParam = (paramName = 'id') => [
  param(paramName).isUUID().withMessage(`${paramName} must be a valid UUID`),
  validate,
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
  validate,
];

const LEGAL_AREAS = [
  'immigration',
  'family_law',
  'business_law',
  'real_estate',
  'criminal_law',
  'civil_law',
  'employment_law',
  'tax_law',
  'other',
];

// --- User profile --------------------------------------------------------
const updateProfileValidation = [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('phone').optional().isString(),
  validate,
];

const clientProfileValidation = [
  body('homeCountry').optional().isString(),
  body('residenceCountry').optional().isString(),
  body('address').optional().isString(),
  body('occupation').optional().isString(),
  body('preferredLanguage').optional().isString(),
  body('dateOfBirth').optional().isISO8601().withMessage('dateOfBirth must be a valid date'),
  validate,
];

const lawyerProfileValidation = [
  body('licenseNumber').optional().isString(),
  body('barAssociation').optional().isString(),
  body('specialization').optional().isArray().withMessage('specialization must be an array'),
  body('yearsOfExperience').optional().isInt({ min: 0 }),
  body('bio').optional().isString(),
  body('hourlyRate').optional().isFloat({ min: 0 }),
  body('country').optional().isString(),
  body('city').optional().isString(),
  body('languages').optional().isArray().withMessage('languages must be an array'),
  validate,
];

const lawyerVerificationValidation = [
  body('verificationStatus')
    .isIn(['pending', 'verified', 'rejected'])
    .withMessage('verificationStatus must be pending, verified, or rejected'),
  validate,
];

// --- Consultations ---------------------------------------------------------
const bookConsultationValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('legalArea').isIn(LEGAL_AREAS).withMessage(`legalArea must be one of: ${LEGAL_AREAS.join(', ')}`),
  body('urgency').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid urgency'),
  body('lawyerId').optional().isUUID().withMessage('lawyerId must be a valid UUID'),
  validate,
];

const consultationStatusValidation = [
  body('status')
    .isIn(['in_progress', 'completed', 'cancelled'])
    .withMessage('status must be in_progress, completed, or cancelled'),
  validate,
];

// --- Appointments ------------------------------------------------------------
const scheduleAppointmentValidation = [
  body('consultationId').isUUID().withMessage('consultationId must be a valid UUID'),
  body('scheduledAt').isISO8601().withMessage('scheduledAt must be a valid date').toDate(),
  body('durationMinutes').optional().isInt({ min: 5, max: 480 }).withMessage('durationMinutes must be between 5 and 480'),
  body('mode').optional().isIn(['video', 'phone', 'in_person']).withMessage('Invalid mode'),
  body('meetingLink').optional().isString(),
  body('location').optional().isString(),
  validate,
];

const appointmentStatusValidation = [
  body('status')
    .isIn(['confirmed', 'completed', 'cancelled', 'no_show'])
    .withMessage('Invalid appointment status'),
  validate,
];

// --- Payments -----------------------------------------------------------------
const paymentValidation = [
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  body('currency').optional().isString().isLength({ min: 3, max: 3 }),
  body('method')
    .isIn(['card', 'bank_transfer', 'mobile_money', 'paypal'])
    .withMessage('Invalid payment method'),
  body('consultationId').optional().isUUID().withMessage('consultationId must be a valid UUID'),
  validate,
];

// --- Documents ------------------------------------------------------------------
const uploadDocumentValidation = [
  body('consultationId').optional().isUUID().withMessage('consultationId must be a valid UUID'),
  body('title').optional().isString(),
  body('category')
    .optional()
    .isIn(['contract', 'evidence', 'identification', 'court_filing', 'correspondence', 'other'])
    .withMessage('Invalid document category'),
  validate,
];

// --- Messages ---------------------------------------------------------------
const sendMessageValidation = [
  body('receiverId').isUUID().withMessage('receiverId must be a valid UUID'),
  body('content').trim().notEmpty().withMessage('Message content is required'),
  body('consultationId').optional().isUUID().withMessage('consultationId must be a valid UUID'),
  body('attachmentUrl').optional().isString(),
  validate,
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  emailOnlyValidation,
  resetPasswordValidation,
  changePasswordValidation,
  validateUUIDParam,
  paginationValidation,
  updateProfileValidation,
  clientProfileValidation,
  lawyerProfileValidation,
  lawyerVerificationValidation,
  bookConsultationValidation,
  consultationStatusValidation,
  scheduleAppointmentValidation,
  appointmentStatusValidation,
  paymentValidation,
  uploadDocumentValidation,
  sendMessageValidation,
};
