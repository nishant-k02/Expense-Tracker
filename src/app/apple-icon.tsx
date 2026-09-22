import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#171717",
        }}
      >
        <svg width="108" height="108" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="6" width="20" height="14" rx="2.5" fill="#2dd4bf" />
          <rect x="2" y="6" width="20" height="4" rx="2" fill="#5eead4" />
          <circle cx="16.5" cy="14" r="2.25" fill="#171717" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
