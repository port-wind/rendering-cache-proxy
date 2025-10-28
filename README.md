# 渲染缓存代理

一个用于代理渲染和传递图像的 Cloudflare Worker 服务。

## 功能

此服务支持两种模式的图片请求，通过文件扩展名区分：

### 模式 1：报纸编号模式（.jpg）

```
GET /{gameType}/{year}/{issue}/{newspaperCode}.jpg
```

使用 col API：
```
GET https://rendering-client.pwtk.cc/rendering-client/rendering/col/{gameType}/{year}/{issue}/{newspaperCode}
```

### 模式 2：关键词模式（.png）

```
GET /{gameType}/{year}/{issue}/{keyword}.png
```

使用 keyword API：
```
GET https://rendering-client.pwtk.cc/rendering-client/rendering/keyword/{gameType}/{year}/{issue}/{keyword}
```

### 处理流程

对于每个请求，服务将：

1. 根据文件扩展名（.jpg 或 .png）选择对应的渲染 API
2. 从渲染 API 获取图片路径
3. 使用 API 响应中的路径，从配置的图片服务器获取图片
4. 将图片返回给客户端，并附带适合 CDN 的缓存头信息

## 配置

服务通过`wrangler.jsonc`配置:

- `IMAGE_SERVICE_URL`: 图片服务器的基础 URL
- `RENDERING_API_URL`: 渲染服务 API 的基础 URL（会自动添加 /col 或 /keyword 路径）

## 开发

```bash
# 安装依赖
npm install

# 启动本地开发服务器
npm run dev

# 部署到Cloudflare
npm run deploy
```

## API 响应格式

渲染 API 返回以下格式的 JSON:

```json
{
  "success": true,
  "errCode": "0",
  "errMessage": "success",
  "data": "path/to/image.jpg"
}
```

## 错误处理

- 404: 当图片或 API 响应未找到时返回
- 500: 对于内部服务器错误返回

## 缓存

服务在响应中设置`Cache-Control: public, max-age=86400`头信息，以便外部 CDN 可以缓存 24 小时。
