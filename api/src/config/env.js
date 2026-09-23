import 'dotenv/config';
export const config = {
  port: process.env.PORT || 3001,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/workan',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'workan-development-secret',
  defaultUserPassword: process.env.DEFAULT_USER_PASSWORD || 'Workan@2026!',
  initialAdmin: {
    name: process.env.INITIAL_ADMIN_NAME || 'Administrador',
    email: process.env.INITIAL_ADMIN_EMAIL || 'admin@workan.local',
    password: process.env.INITIAL_ADMIN_PASSWORD || process.env.DEFAULT_USER_PASSWORD || 'Workan@2026!',
  },
};
