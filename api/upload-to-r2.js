// ====== Vercel Serverless Function: رفع ملف إلى Cloudflare R2 ======
// هذا الملف يعمل على سيرفر Vercel (ليس في المتصفح)، فمفاتيح R2 السرية تبقى محمية تماماً
// المسار: /api/upload-to-r2

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = "alagat-media";
const PUBLIC_BASE_URL = process.env.R2_PUBLIC_URL; // رابط الوصول العام للـ bucket

// الحد الأقصى لحجم الملف (10 ميجابايت)، نفس الحد المستخدم في الواجهة
const MAX_FILE_SIZE = 10 * 1024 * 1024;

module.exports.config = {
  api: {
    bodyParser: false, // نتعامل مع الملف كـ stream خام (raw) بدل JSON
  },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  // ====== السماح فقط بطلبات POST ======
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ====== قراءة معلومات الملف من الـ headers ======
    const fileName = req.headers["x-file-name"];
    const fileType = req.headers["x-file-type"] || "application/octet-stream";
    const userId = req.headers["x-user-id"];

    if (!fileName || !userId) {
      return res.status(400).json({ error: "بيانات الملف غير مكتملة" });
    }

    // ====== التحقق من نوع الملف (صور وفيديو فقط) ======
    const isImage = fileType.startsWith("image/");
    const isVideo = fileType.startsWith("video/");
    if (!isImage && !isVideo) {
      return res.status(400).json({ error: "نوع الملف غير مسموح" });
    }

    // ====== قراءة محتوى الملف ======
    const fileBuffer = await readRawBody(req);

    if (fileBuffer.length === 0) {
      return res.status(400).json({ error: "الملف فاضي" });
    }
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return res.status(413).json({ error: "حجم الملف أكبر من 10 ميجابايت" });
    }

    // ====== بناء اسم ملف فريد لمنع التعارض ======
    const extRaw = (fileName.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const safeExt = extRaw.length > 0 && extRaw.length <= 10 ? extRaw : "bin";
    const uniqueKey = userId + "_" + Date.now() + "_" + Math.floor(Math.random() * 100000) + "." + safeExt;

    // ====== الرفع الفعلي إلى R2 ======
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: uniqueKey,
        Body: fileBuffer,
        ContentType: fileType,
      })
    );

    const publicUrl = PUBLIC_BASE_URL + "/" + uniqueKey;

    return res.status(200).json({
      ok: true,
      url: publicUrl,
      type: isVideo ? "video" : "image",
    });
  } catch (err) {
    console.error("R2 upload error:", err);
    return res.status(500).json({ error: "تعذر رفع الملف، حاول مرة أخرى" });
  }
};
