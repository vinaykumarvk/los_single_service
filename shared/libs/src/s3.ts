import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export function createS3Client() {
  const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
  const port = process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT, 10) : 9000;
  const region = process.env.MINIO_REGION || 'us-east-1';
  const accessKeyId = process.env.MINIO_ACCESS_KEY || 'minio';
  const secretAccessKey = process.env.MINIO_SECRET_KEY || 'minio123';
  const useSSL = process.env.MINIO_USE_SSL === 'true';

  return new S3Client({
    region,
    endpoint: `${useSSL ? 'https' : 'http'}://${endpoint}:${port}`,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey }
  });
}

export async function putObjectBuffer(
  client: S3Client,
  params: { bucket: string; key: string; body: Buffer; contentType?: string }
) {
  await client.send(
    new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType
    })
  );
}

export async function getPresignedUrl(
  client: S3Client,
  params: { bucket: string; key: string; expiresInSec?: number }
): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: params.bucket, Key: params.key });
  return getSignedUrl(client, cmd, { expiresIn: params.expiresInSec ?? 300 });
}


