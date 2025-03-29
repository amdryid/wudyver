import axios from "axios";
import {
  v4 as uuidv4
} from "uuid";
class FotorAPI {
  constructor() {
    this.baseURL = "https://www.fotor.com/api/create/v1/generate";
    this.statusURL = "https://www.fotor.com/api/create/v3/get_picture_url";
    this.distinctId = uuidv4();
  }
  generateCookie() {
    const cookieData = {
      distinct_id: this.distinctId,
      props: {
        $latest_traffic_source_type: "直接流量",
        $latest_search_keyword: "未取得值_直接打开"
      },
      $device_id: this.distinctId
    };
    return `sensorsdata2015jssdkcross=${encodeURIComponent(JSON.stringify(cookieData))}`;
  }
  async generateImage({
    prompt,
    total = 1
  }) {
    try {
      const {
        data
      } = await axios.post(this.baseURL, {
        customAppName: "fotorWeb",
        content: encodeURIComponent(prompt),
        pictureNums: total
      }, {
        headers: this.getHeaders()
      });
      if (data.status && data.data) {
        const taskIds = data.data.map(item => item.taskId);
        console.log(`Generated Task IDs: ${taskIds.join(", ")}`);
        return await this.pollForResults(taskIds);
      }
      throw new Error("Invalid response from API");
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
  async pollForResults(taskIds) {
    const maxTime = Date.now() + 6e4;
    const totalTasks = taskIds.length;
    console.log(`Total Tasks to Monitor: ${totalTasks}`);
    while (Date.now() < maxTime) {
      try {
        const {
          data
        } = await axios.get(`${this.statusURL}?taskIds=${taskIds.join(",")}`, {
          headers: this.getHeaders()
        });
        for (const taskId of taskIds) {
          console.log(`Polling Task ID: ${taskId}`);
        }
        const completedTasks = data.data.filter(item => item.status === 1);
        if (completedTasks.length === totalTasks) {
          return completedTasks;
        }
      } catch (error) {
        return {
          error: error.message
        };
      }
      await new Promise(res => setTimeout(res, 3e3));
    }
    return {
      error: "Polling timed out"
    };
  }
  getHeaders() {
    return {
      accept: "application/json",
      "content-type": "application/json",
      cookie: this.generateCookie(),
      origin: "https://www.fotor.com",
      referer: "https://www.fotor.com/images/create",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      "x-app-id": "app-fotor-web"
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const fotor = new FotorAPI();
  try {
    const data = await fotor.generateImage(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}