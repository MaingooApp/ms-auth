export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roleId: string;
  roleName?: string;
  enterpriseId: string | null;
  phonePrefix?: string | null;
  phoneNumber?: string | null;
  emailFluvia?: string | null;
  createdAt: Date;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}
