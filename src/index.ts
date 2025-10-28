import { Hono } from "hono";

interface Env {
  IMAGE_SERVICE_URL: string;
  RENDERING_API_URL: string;
}

interface RenderingApiResponse {
  success: boolean;
  errCode: string;
  errMessage: string;
  data: string;
}

const app = new Hono<{ Bindings: Env }>();

// 使用通配符方式处理图片请求
// .jpg 使用 col API（报纸编号模式）
// .png 使用 keyword API（关键词模式）
app.get("/:gameType/:year/:issue/:codeWithExt", async (c) => {
  const { gameType, year, issue, codeWithExt } = c.req.param();

  // 检查文件扩展名，支持 .jpg 和 .png
  let fileExtension: string;
  let apiMode: "col" | "keyword";
  let code: string;

  if (codeWithExt.endsWith(".jpg")) {
    fileExtension = ".jpg";
    apiMode = "col";
    code = codeWithExt.slice(0, -4); // 移除 '.jpg'
  } else if (codeWithExt.endsWith(".png")) {
    fileExtension = ".png";
    apiMode = "keyword";
    code = codeWithExt.slice(0, -4); // 移除 '.png'
  } else {
    return new Response("不支持的文件格式，仅支持 .jpg 和 .png 格式", { status: 400 });
  }

  try {
    // 根据模式构建不同的 API URL
    const renderingApiUrl = `${c.env.RENDERING_API_URL}/${apiMode}/${gameType}/${year}/${issue}/${code}`;

    console.log(`[${apiMode.toUpperCase()}模式] 从以下地址获取图片路径: ${renderingApiUrl}`);

    // 从渲染API获取图片URL
    const apiResponse = await fetch(renderingApiUrl);

    if (!apiResponse.ok) {
      console.error(`API返回状态码: ${apiResponse.status}`);
      return new Response("未找到图片", { status: 404 });
    }

    const apiData = (await apiResponse.json()) as RenderingApiResponse;

    if (!apiData.success) {
      console.error(`API错误: ${apiData.errMessage}`);
      return new Response("未找到图片", { status: 404 });
    }

    // 从响应中获取图片URL
    const imagePath = apiData.data;
    // 使用来自环境变量的图片服务URL
    const imageUrl = `${c.env.IMAGE_SERVICE_URL}${imagePath}`;

    console.log(`从以下地址获取图片: ${imageUrl}`);

    // 获取图片
    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      console.error(`图片服务器返回状态码: ${imageResponse.status}`);
      return new Response("未找到图片", { status: 404 });
    }

    // 获取图片数据
    const imageData = await imageResponse.arrayBuffer();

    // 从上游响应头获取真实的 Content-Type，如果没有则根据请求的扩展名决定
    const contentType = imageResponse.headers.get("Content-Type") ||
                       (fileExtension === ".png" ? "image/png" : "image/jpeg");

    // 返回图片并带有适当的头信息
    return new Response(imageData, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // 允许CDN缓存24小时
      },
    });
  } catch (error) {
    console.error("代理图片时出错:", error);
    return new Response("服务器内部错误", { status: 500 });
  }
});

// 默认路由用于健康检查
app.get("/", (c) => {
  return c.text("渲染缓存代理服务正在运行");
});

export default app;
