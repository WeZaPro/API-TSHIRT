const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors"); // 🔹 นำเข้า CORS
const fs = require("fs");
const path = require("path");
require("dotenv").config();

//controller
const controllerLineBot = require("./controllers/controller.webhook");

const app = express();
app.use(cors()); // 🔹 เปิดใช้งาน CORS
app.use(bodyParser.json({ limit: "50mb" }));

const PORT = 3000;

// ตั้งค่า Body Parser
// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("START SERVER");
});

//Webhook linebot
app.post("/webhook", controllerLineBot.lineBot);
app.post("/lineLogin", controllerLineBot.lineLogin);
app.post("/save-user", controllerLineBot.saveUser);

// Tshirt

// POST API รับข้อมูลภาพ
app.post("/api/upload-image", (req, res) => {
  const { imageBase64 } = req.body;

  const matches = imageBase64.match(/^data:(.+);base64,(.+)$/);
  if (!matches) return res.status(400).json({ error: "Invalid base64" });

  const ext = matches[1].split("/")[1];
  const data = matches[2];
  const buffer = Buffer.from(data, "base64");
  const filename = `upload_${Date.now()}.${ext}`;
  const filepath = path.join(__dirname, "uploads", filename);
  // const fileUrl = `http://localhost:3000/uploads/${filename}`;
  const fileUrl = `https://api.toponpage.com/uploads/${filename}`;
  // const fileUrl = `${process.env.base_url_tshirt}/${filename}`;

  fs.mkdirSync(path.join(__dirname, "uploads"), { recursive: true });
  fs.writeFileSync(filepath, buffer);

  return res.json({ imageUrl: fileUrl });
});

app.post("/api/upload", (req, res) => {
  const { cardImage, uploadedImage } = req.body;

  console.log("cardImage >>> ", cardImage);
  console.log("uploadedImage >>> ", uploadedImage);

  let data = JSON.stringify({
    person_image_url: uploadedImage,
    garment_image_url: cardImage,
  });

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://api.developer.pixelcut.ai/v1/try-on",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-KEY": "sk_e11acfd691564b90828d57f4a7977500",
      // /"X-API-KEY": "sk_3b33985a8efd46ab9f0d4d2ba4478264",
    },
    data: data,
  };

  axios
    .request(config)
    .then((response) => {
      console.log("url gen image =>", JSON.stringify(response.data));

      // 🔴 เพิ่มตรงนี้
      console.log("🪵 ตรวจสอบโครงสร้าง response:", response.data);

      // เอาชื่อไฟล์จาก URL และลบไฟล์ที่ใช้งาน
      const fileName = uploadedImage.split("/").pop(); // ดึงชื่อไฟล์จาก URL
      const filePath = path.join(__dirname, "uploads", fileName);

      // ลบไฟล์
      fs.unlinkSync(filePath); // ลบไฟล์ที่อัปโหลด

      res.status(200).json(response.data);
    })
    .catch((error) => {
      console.error("API error =>", error.message);
      res.status(500).json({ error: "Failed to generate image" });
    });
});

const CHANNEL_ACCESS_TOKEN =
  "+LhzvgPuLx2kLVSiuBL7urbD4dq4LYruwMH5uo9udb4qZQajCNI3aAXyXv7/Yt8dI99W4WwAUU2WMCZX0o28CW9E2+22lkS9PtuiO5lFDpIK2z3YkIrJGD/pLXzpWAsOU0/1Asx/YPHuNzxbuaKURwdB04t89/1O/w1cDnyilFU=";

app.post("/send-line-image", async (req, res) => {
  const { imageUrl, userId } = req.body;

  try {
    const response = await axios.post(
      "https://api.line.me/v2/bot/message/push",
      {
        to: userId,
        messages: [
          {
            type: "image",
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl,
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
        },
      }
    );

    res.json({ message: "✅ ส่งภาพสำเร็จ", data: response.data });
  } catch (error) {
    console.error("❌ ส่งภาพล้มเหลว:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// ให้ Express เสิร์ฟไฟล์ใน /uploads เป็น static URL
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
