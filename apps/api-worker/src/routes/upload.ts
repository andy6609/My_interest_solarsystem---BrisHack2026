import { Hono } from 'hono';

type Bindings = {
  UPLOAD_BUCKET: R2Bucket;
};

export const uploadRoute = new Hono<{ Bindings: Bindings }>();

uploadRoute.post('/', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return c.json({ error: 'No file provided' }, 400);
  }

  const fileId = crypto.randomUUID();
  const key = `uploads/${fileId}/${file.name}`;

  await c.env.UPLOAD_BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  });

  return c.json({ fileId, key, fileName: file.name });
});
