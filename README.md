# Visual Notebook

Visual Notebook là workspace học tập local-first để quản lý, xem, chỉnh sửa và tạo tài liệu **HTML, Markdown, PDF** với trợ lý AI. Ứng dụng đọc và ghi trực tiếp vào thư mục bạn chọn trên máy, giúp bạn biến tài liệu rời rạc thành một thư viện trực quan, dễ tìm, dễ chỉnh và dễ tái sử dụng.

[Trải nghiệm Visual Notebook](https://visual-notebook.vercel.app/)

![Visual Notebook overview](images/visual-notebook-overview.png)

## Tính Năng Nổi Bật

- **Local-first, làm việc trực tiếp với ổ đĩa**: chọn một thư mục bằng File System Access API, Visual Notebook đọc và ghi các file `.html`, `.md`, `.pdf` ngay trong trình duyệt. Dữ liệu tài liệu không cần upload lên cloud.
- **Thư viện tài liệu trực quan**: duyệt theo cây thư mục, xem dạng lưới hoặc danh sách, tìm kiếm nhanh, đánh dấu yêu thích, gắn tag và gom file vào bộ sưu tập.
- **Metadata nằm cạnh dữ liệu thật**: tag, collection, tiêu đề và trạng thái yêu thích được lưu trong `.visualnotebook/manifest.json` ngay trong workspace.
- **Preview và chỉnh sửa trong cùng một nơi**: xem HTML/Markdown bằng iframe, mở PDF trực tiếp, chỉnh source bằng CodeMirror và lưu thay đổi về file gốc.
- **Khoanh vùng để AI sửa đúng chỗ**: chọn đoạn trong source hoặc khoanh vùng trên bản xem trước HTML, rồi yêu cầu AI chỉ chỉnh phần đó thay vì viết lại toàn bộ file.
- **Tạo tài liệu HTML bằng AI**: mô tả nội dung cần học, chọn theme, phong cách viết và các năng lực như công thức toán, biểu đồ, sơ đồ, mô phỏng, code highlight.
- **Chuyển PDF sang HTML**: trích nội dung PDF, kết hợp ảnh trang và dựng lại thành tài liệu HTML sạch, dễ đọc, dễ chỉnh.
- **Tạo slide HTML**: biến PDF, HTML, Markdown hoặc link tài liệu public thành slide deck HTML, có theme màu và prompt mẫu cho bài giảng, pitch deck, workshop.
- **Hỗ trợ nhiều nhà cung cấp AI**: Claude, OpenAI, Gemini và Local Gateway tương thích OpenAI.
- **Có demo mẫu sẵn**: khi mở một workspace mới, app có thể tạo thư mục `demo/` với các file HTML mẫu để bạn thử ngay.

> Lưu ý: cần dùng **Google Chrome** hoặc **Microsoft Edge** vì app dựa trên File System Access API. Firefox và Safari hiện chưa hỗ trợ đầy đủ API này.

## Demo Public

Các file demo nằm trong [`demo/`](demo/) và được publish qua `public/demos/`.

- [`/demos/`](public/demos/index.html)
- [`/demos/fastapi-production.html`](public/demos/fastapi-production.html)
- [`/demos/calculus-derivative.html`](public/demos/calculus-derivative.html)
- [`/demos/git-workflow.html`](public/demos/git-workflow.html)

## Chạy Local

```bash
npm install
npm run dev
```

Mở http://localhost:3333 bằng Chrome hoặc Edge.

Để dùng trợ lý AI, mở **Cài đặt** trong app và nhập API key cho ít nhất một provider, hoặc cấu hình biến môi trường phía server.

```bash
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
```

## Scripts

```bash
npm run dev      # chạy dev server ở port 3333
npm run build    # build production
npm run start    # chạy production server ở port 3333
npm run lint     # kiểm tra lint
```

## Deploy Lên Vercel

1. Push code lên GitHub và import project vào Vercel.
2. Thêm Environment Variables nếu muốn dùng API key chung phía server:
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY`
   - `GOOGLE_GENERATIVE_AI_API_KEY`
3. Deploy và mở domain bằng Chrome hoặc Edge.

### Lưu Ý Về Local Gateway Sau Khi Deploy

Provider **Local Gateway** được gọi từ server route `/api/ai/*` của Next.js. Khi app đã deploy, `http://localhost:20128/v1` sẽ trỏ tới máy chủ deploy, không phải máy cá nhân của bạn.

Local Gateway chỉ phù hợp trong các trường hợp sau:

- Chạy app Next trên cùng máy với gateway bằng `npm run dev` hoặc `npm run build && npm run start`.
- Expose gateway bằng URL HTTPS public hoặc tunnel, rồi điền URL đó vào **Cài đặt -> Local Gateway -> Base URL**.
- Dùng provider cloud như OpenAI, Claude hoặc Gemini và cấu hình API key trên Vercel Environment Variables.

## Kiến Trúc

- **Next.js 16 App Router**, React 19 và Tailwind CSS v4.
- **Không cần database**: file thật nằm trong thư mục người dùng chọn, metadata nằm trong sidecar JSON.
- **Vercel AI SDK** cho các route `/api/ai/*`, hỗ trợ streaming để giảm rủi ro timeout.
- **PDF pipeline client-side** dùng `pdfjs-dist` để trích text và ảnh trang trước khi gửi yêu cầu dựng lại bằng AI.
- **State management** bằng Zustand, lưu cấu hình người dùng bằng IndexedDB/local browser storage.

## Luồng Sử Dụng Gợi Ý

1. Mở app tại https://visual-notebook.vercel.app/.
2. Chọn một thư mục workspace trên máy bằng Chrome hoặc Edge.
3. Duyệt file HTML, Markdown, PDF hoặc tạo tài liệu mới bằng AI.
4. Gắn tag, thêm vào collection, đánh dấu yêu thích để tổ chức thư viện.
5. Chỉnh sửa source, khoanh vùng nội dung cần AI sửa, hoặc chuyển PDF/tài liệu hiện có thành HTML slide.
