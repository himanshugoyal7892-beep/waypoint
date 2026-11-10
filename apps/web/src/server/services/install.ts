import "server-only";
import { PRODUCT, type InstallInstructions } from "@waypoint/shared";
import { db } from "../db";
import { env } from "../env";
import { ownProject } from "../ownership";

export function buildSnippet(publicKey: string, sdkUrl: string): string {
  return [
    `<!-- ${PRODUCT.name} product tours -->`,
    "<script>",
    `  window.${PRODUCT.sdk.configGlobal} = {`,
    `    projectId: ${JSON.stringify(publicKey)}`,
    "  };",
    "</script>",
    `<script async src=${JSON.stringify(sdkUrl)}></script>`,
  ].join("\n");
}

export async function getInstallInstructions(
  userId: string,
  projectId: string,
): Promise<InstallInstructions> {
  await ownProject(userId, projectId);
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { publicKey: true, allowedOrigins: true },
  });
  const sdkUrl = env().NEXT_PUBLIC_SDK_URL;
  const sdkOrigin = new URL(sdkUrl).origin;
  const apiOrigin = new URL(env().NEXT_PUBLIC_APP_URL).origin;
  return {
    publicKey: project.publicKey,
    sdkUrl,
    snippet: buildSnippet(project.publicKey, sdkUrl),
    allowedOrigins: project.allowedOrigins,
    cspDirectives: [`script-src ${sdkOrigin}`, `connect-src ${apiOrigin}`],
    builderQueryParam: PRODUCT.sdk.builderQueryParam,
  };
}
