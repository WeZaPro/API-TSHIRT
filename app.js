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
  const fileUrl = `${process.env.base_url_tshirt}/${filename}`;

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

  // const testTshirt = process.env.testTshirt;
  // const modelMan = process.env.modelMan;

  // let data = JSON.stringify({
  //   person_image_url: modelMan,
  //   garment_image_url: testTshirt,
  // });

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://api.developer.pixelcut.ai/v1/try-on",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-KEY": process.env.tshirt_keyApi,
    },
    data: data,
  };

  axios
    .request(config)
    .then((response) => {
      console.log("url gen image =>", JSON.stringify(response.data));

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

// ให้ Express เสิร์ฟไฟล์ใน /uploads เป็น static URL
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
