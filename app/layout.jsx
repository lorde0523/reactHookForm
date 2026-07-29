import "antd/dist/reset.css";
import "./globals.css";

export const metadata = {
  title: "업무 게시물 통합 조회",
  description:
    "React Hook Form과 Ant Design으로 만든 실무형 조회조건 폼 예제",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
