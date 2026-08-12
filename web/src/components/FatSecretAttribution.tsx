import "./FatSecretAttribution.css";

// Required by FatSecret Platform API Terms of Use §1.3 + Attribution Policy
// (https://platform.fatsecret.com/attribution) — must appear wherever FatSecret
// content is shown. Do not remove (R-06) or restructure this markup.
export default function FatSecretAttribution() {
  return (
    <a href="https://platform.fatsecret.com" target="_blank" rel="noopener noreferrer" className="fatsecret-attribution">
      <img
        src="https://platform.fatsecret.com/api/static/images/powered_by_fatsecret_horizontal_brand.png"
        alt="Powered by fatsecret Platform API"
      />
    </a>
  );
}
