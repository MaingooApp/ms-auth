export const NATS_SERVICE = 'NATS_SERVICE';

export enum AuthSubjects {
  register = 'auth.register',
  login = 'auth.login',
  refresh = 'auth.refresh',
  profile = 'auth.getProfile',
  verify = 'auth.verify',
  getRoles = 'auth.getRoles',
  health = 'auth.health.check',
  userUpdate = 'auth.user.update',
}

export enum AuthEvents {
  userCreated = 'auth.user.created',
}
