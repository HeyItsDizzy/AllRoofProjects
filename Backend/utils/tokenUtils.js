const jwt = require('jsonwebtoken');

/**
 * Generate a fresh JWT token for a user with updated permissions
 * @param {Object} userData - The user object from database with fresh permissions
 * @returns {string} - New JWT token
 */
const generateFreshToken = (userData) => {
  const tokenPayload = {
    userId: userData._id.toString(),
    email: userData.email,
    role: userData.role,
    companyAdmin: userData.companyAdmin || false,
    estimator: userData.estimator || false,
    company: userData.company,
    companyId: userData.companyId,
    name: userData.name,
    firstName: userData.firstName,
    lastName: userData.lastName
  };

  return jwt.sign(tokenPayload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

module.exports = {
  generateFreshToken
};
