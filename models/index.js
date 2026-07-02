const { sequelize } = require('../config/database');

const User = require('./User');
const Lawyer = require('./Lawyer');
const Client = require('./Client');
const Consultation = require('./Consultation');
const Appointment = require('./Appointment');
const Document = require('./Document');
const Payment = require('./Payment');
const Notification = require('./Notification');
const Message = require('./Message');

// --- User <-> role profiles (1:1) --------------------------------------
User.hasOne(Lawyer, { foreignKey: 'userId', as: 'lawyerProfile', onDelete: 'CASCADE' });
Lawyer.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(Client, { foreignKey: 'userId', as: 'clientProfile', onDelete: 'CASCADE' });
Client.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// --- Consultations -------------------------------------------------------
Client.hasMany(Consultation, { foreignKey: 'clientId', as: 'consultations' });
Consultation.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

Lawyer.hasMany(Consultation, { foreignKey: 'lawyerId', as: 'consultations' });
Consultation.belongsTo(Lawyer, { foreignKey: 'lawyerId', as: 'lawyer' });

// --- Appointments ----------------------------------------------------------
Consultation.hasMany(Appointment, { foreignKey: 'consultationId', as: 'appointments', onDelete: 'CASCADE' });
Appointment.belongsTo(Consultation, { foreignKey: 'consultationId', as: 'consultation' });

Client.hasMany(Appointment, { foreignKey: 'clientId', as: 'appointments' });
Appointment.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

Lawyer.hasMany(Appointment, { foreignKey: 'lawyerId', as: 'appointments' });
Appointment.belongsTo(Lawyer, { foreignKey: 'lawyerId', as: 'lawyer' });

// --- Documents ------------------------------------------------------------
Consultation.hasMany(Document, { foreignKey: 'consultationId', as: 'documents', onDelete: 'CASCADE' });
Document.belongsTo(Consultation, { foreignKey: 'consultationId', as: 'consultation' });

User.hasMany(Document, { foreignKey: 'uploadedBy', as: 'uploadedDocuments' });
Document.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

// --- Payments ---------------------------------------------------------------
Consultation.hasMany(Payment, { foreignKey: 'consultationId', as: 'payments' });
Payment.belongsTo(Consultation, { foreignKey: 'consultationId', as: 'consultation' });

Client.hasMany(Payment, { foreignKey: 'clientId', as: 'payments' });
Payment.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

Lawyer.hasMany(Payment, { foreignKey: 'lawyerId', as: 'payments' });
Payment.belongsTo(Lawyer, { foreignKey: 'lawyerId', as: 'lawyer' });

// --- Notifications --------------------------------------------------------
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// --- Messages ---------------------------------------------------------------
Consultation.hasMany(Message, { foreignKey: 'consultationId', as: 'messages', onDelete: 'CASCADE' });
Message.belongsTo(Consultation, { foreignKey: 'consultationId', as: 'consultation' });

User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

User.hasMany(Message, { foreignKey: 'receiverId', as: 'receivedMessages' });
Message.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

module.exports = {
  sequelize,
  User,
  Lawyer,
  Client,
  Consultation,
  Appointment,
  Document,
  Payment,
  Notification,
  Message,
};
