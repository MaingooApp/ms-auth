export const NATS_SERVICE = 'NATS_SERVICE';

export const AuthSubjects = {
  register: 'auth.register',
  login: 'auth.login',
  refresh: 'auth.refresh',
  profile: 'auth.getProfile',
  verify: 'auth.verify',
  getRoles: 'auth.getRoles',
  health: 'auth.health.check',
} as const;

export const AuthEvents = {
  userCreated: 'auth.user.created',
} as const;
