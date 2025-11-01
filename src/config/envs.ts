import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  NATS_SERVERS: string[];
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  REFRESH_JWT_SECRET: string;
  REFRESH_EXPIRES_IN: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
}

const envSchema = joi
  .object<EnvVars>({
    PORT: joi.number().default(3001),
    NATS_SERVERS: joi.array().items(joi.string()).min(1).required(),
    DATABASE_URL: joi.string().uri({ scheme: [/postgresql/] }).required(),
    JWT_SECRET: joi.string().required(),
    JWT_EXPIRES_IN: joi.string().required(),
    REFRESH_JWT_SECRET: joi.string().required(),
    REFRESH_EXPIRES_IN: joi.string().required(),
    JWT_ISSUER: joi.string().default('maingoo'),
    JWT_AUDIENCE: joi.string().default('maingoo-clients')
  })
  .unknown(true);

const { error, value } = envSchema.validate({
  ...process.env,
  NATS_SERVERS: process.env['NATS_SERVERS']?.split(',').map((item) => item.trim())
});

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars = value as EnvVars;

export const envs = {
  port: envVars.PORT,
  natsServers: envVars.NATS_SERVERS,
  databaseUrl: envVars.DATABASE_URL,
  jwtSecret: envVars.JWT_SECRET,
  jwtExpiresIn: envVars.JWT_EXPIRES_IN,
  refreshJwtSecret: envVars.REFRESH_JWT_SECRET,
  refreshExpiresIn: envVars.REFRESH_EXPIRES_IN,
  jwtIssuer: envVars.JWT_ISSUER,
  jwtAudience: envVars.JWT_AUDIENCE
};
