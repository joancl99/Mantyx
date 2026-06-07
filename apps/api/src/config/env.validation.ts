import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().required(),

  REDIS_URL: Joi.string().required(),

  // Secrets must be high-entropy random values (e.g. `openssl rand -hex 32`),
  // not passphrases. 32 chars = 256-bit minimum for HS256.
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Single allowed browser origin for CORS (credentials are enabled, so this
  // must never be `*`). `.uri()` rejects `*` and malformed values.
  CORS_ORIGIN: Joi.string().uri().default('http://localhost:4200'),
});
