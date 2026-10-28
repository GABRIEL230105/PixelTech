export default function Logo({ size = 28 }) {
  return (
    <img
      src="/logo.png"
      alt="PixelTech"
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        flexShrink: 0,
        display: "block",
      }}
    />
  );
}