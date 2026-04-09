import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getR2Config } from "@/lib/r2/client";

export async function deleteR2Object(key: string): Promise<void> {
  if (!key) return;
  const { client, bucket } = getR2Config();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

export async function deleteR2Objects(keys: string[]): Promise<void> {
  const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));
  if (uniqueKeys.length === 0) return;

  const { client, bucket } = getR2Config();
  const chunkSize = 1000;

  for (let i = 0; i < uniqueKeys.length; i += chunkSize) {
    const chunk = uniqueKeys.slice(i, i + chunkSize);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: chunk.map((Key) => ({ Key })),
          Quiet: true,
        },
      })
    );
  }
}

export async function listR2ObjectKeysByPrefix(prefix: string): Promise<string[]> {
  if (!prefix) return [];
  const { client, bucket } = getR2Config();
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    const pageKeys = (response.Contents ?? [])
      .map((item) => item.Key)
      .filter((k): k is string => Boolean(k));
    keys.push(...pageKeys);
    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return keys;
}
