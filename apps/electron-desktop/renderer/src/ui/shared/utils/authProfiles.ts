export type AuthProfileMode = "api_key" | "token" | "oauth";

export type GatewayConfigPatchRpc = {
  request: <T = unknown>(method: string, params?: unknown) => Promise<T>;
};

export function buildAuthProfilePatch(params: {
  profileId: string;
  provider: string;
  mode: AuthProfileMode;
}): string {
  const { profileId, provider, mode } = params;
  return JSON.stringify(
    {
      auth: {
        profiles: {
          [profileId]: { provider, mode },
        },
        order: {
          [provider]: [profileId],
        },
      },
    },
    null,
    2
  );
}

export async function patchAuthProfile(params: {
  gw: GatewayConfigPatchRpc;
  baseHash: string;
  provider: string;
  mode: AuthProfileMode;
  notePrefix: string;
  profileId?: string;
}): Promise<string> {
  const profileId = params.profileId ?? `${params.provider}:default`;
  await params.gw.request("config.patch", {
    baseHash: params.baseHash,
    raw: buildAuthProfilePatch({ profileId, provider: params.provider, mode: params.mode }),
    note: `${params.notePrefix}: enable ${params.provider} ${params.mode} profile`,
  });
  return profileId;
}
