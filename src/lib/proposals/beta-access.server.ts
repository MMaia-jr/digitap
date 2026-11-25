import 'server-only';

const authUserId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function canUseBetaInterpretation(userId: string): boolean {
  const authorizedId = process.env.AI_BETA_AUTH_USER_ID;
  return Boolean(authorizedId && authUserId.test(authorizedId) && userId === authorizedId);
}
