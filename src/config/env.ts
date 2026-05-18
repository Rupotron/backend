import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const splitCsv = (value?: string) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const env = {
  isProduction,
  port: Number(process.env.PORT || 5000),
  allowedOrigins: splitCsv(process.env.CORS_ORIGIN),
  jwtSecret: process.env.JWT_SECRET,
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
};

export const getJwtSecret = () => {
  if (env.jwtSecret) return env.jwtSecret;
  if (env.isProduction) {
    throw new Error('JWT_SECRET is required in production');
  }
  console.warn('[Config] JWT_SECRET is not set. Using a development-only signing secret.');
  return 'development_only_jwt_secret_change_me';
};

export const getRequiredEnv = (key: keyof typeof env) => {
  const value = env[key];
  if (typeof value !== 'string' || !value) {
    throw new Error(`${String(key)} is required for this operation`);
  }
  return value;
};

export const validateEnv = () => {
  const requiredInProduction: Array<keyof typeof env> = [
    'jwtSecret',
    'razorpayKeyId',
    'razorpayKeySecret',
    'razorpayWebhookSecret',
  ];

  if (env.isProduction) {
    const missing = requiredInProduction.filter((key) => !env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required production env vars: ${missing.join(', ')}`);
    }

    if (env.allowedOrigins.length === 0) {
      throw new Error('CORS_ORIGIN must contain at least one production origin');
    }
  }
};
