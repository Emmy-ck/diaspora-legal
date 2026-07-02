const isValidEmail = (email) => typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isStrongPassword = (password) => typeof password === 'string' && password.length >= 8;

const isValidPhone = (phone) => typeof phone === 'string' && /^\+?[0-9]{7,15}$/.test(phone);

module.exports = { isValidEmail, isStrongPassword, isValidPhone };
