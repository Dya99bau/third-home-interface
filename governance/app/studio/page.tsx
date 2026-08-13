export default function StudioPage() {
  return (
    <iframe
      src="/open_studio.html"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        border: "none",
        zIndex: 40,
      }}
      title="Open Studio"
      allowFullScreen
    />
  );
}
