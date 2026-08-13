// TODO: point this at the deployed /site app's URL once site + governance
// domains are finalized (governance and site are separate Vercel projects,
// linked by nav — see consolidation plan). The standalone clone/serve.js
// viewer this used to target is being retired in favor of the converted
// .glb models loaded directly into /site's react-three-fiber scene.
const SITE_URL = "https://third-home-interface.vercel.app";

export default function ModelPage() {
  return (
    <iframe
      src={SITE_URL}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        border: "none",
        zIndex: 40,
      }}
      title="Deployable Modules — 3D Model"
      allowFullScreen
    />
  );
}
