import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Jimp } from 'jimp';

const s3 = new S3Client({});

export const handler = async (event: any) => {
    console.log(JSON.stringify(event, null, 2));

    const record = event.Records[0];

    const bucket = record.s3.bucket.name;

    const key = decodeURIComponent(
        record.s3.object.key.replace(/\+/g, ' ')
    );

    // images/ のみ対象
    if (!key.startsWith('images/')) {
        return;
    }

    const fileName = key.replace('images/', '');

    // S3から取得
    const originalImage = await s3.send(
        new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        })
    );

    const chunks = [];

    for await (const chunk of originalImage.Body as any) {
        chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    // Jimp読み込み
    const image = await Jimp.read(buffer);
    // リサイズ
    image.resize({ w: 300 });
    // jpeg化
    const resizedBuffer = await image.getBuffer('image/jpeg');

    // resized/ に保存
    await s3.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: `resized/${fileName}`,
            Body: resizedBuffer,
            ContentType: 'image/jpeg',
        })
    );

    console.log('resize complete');
};
