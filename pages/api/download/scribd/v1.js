import axios from "axios";
class ScribdDownloader {
  constructor() {
    this.baseUrl = "https://api.scrbdownloader.com/download-file/";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
      Referer: "https://scridownloader.com/"
    };
  }
  parseId(url) {
    try {
      const match = url.match(/^https?:\/\/[^\s/]+scribd\.com\/(?:doc|document)\/(\d{2,})/i);
      return match ? match[1] : null;
    } catch (error) {
      throw new Error("Gagal mengekstrak ID dari URL.");
    }
  }
  async download({
    url
  }) {
    try {
      const id = this.parseId(url);
      if (!id) throw new Error("ID Scribd tidak ditemukan dalam URL.");
      const response = await axios.get(`${this.baseUrl}${id}`, {
        headers: this.headers
      });
      return {
        success: true,
        data: response.data,
        contentType: response.headers["content-type"] || "application/json"
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        contentType: "application/json"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  try {
    const scribd = new ScribdDownloader();
    const result = await scribd.download(params);
    res.setHeader("Content-Type", result.contentType);
    res.status(result.success ? 200 : 400).send(result.success ? result.data : {
      error: result.error
    });
  } catch (error) {
    res.status(500).json({
      error: "Terjadi kesalahan server"
    });
  }
}