export interface JwtPayload {
  sub: string;
  email: string;
  roleId: string;
  enterpriseId: string | null;
  jti?: string;
}
