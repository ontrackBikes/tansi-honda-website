const fs = require("fs");
const path = require("path");

const BASE_URL = "https://tansi-honda-website-production.up.railway.app";

const generateBikeSitemap = () => {
  try {
    const bikesPath = path.join(__dirname, "bikes.json");
    const outputPath = path.join(__dirname, "bikesitemap.xml");

    const bikes = JSON.parse(fs.readFileSync(bikesPath, "utf-8"));

    const today = new Date().toISOString().split("T")[0];

    const urls = [];

    // homepage (optional but useful)
    urls.push({
      loc: `${BASE_URL}/`,
      changefreq: "daily",
      priority: "1.0",
    });

    const categories = new Set();

    bikes.forEach((bike) => {
      if (!bike.isActive) return;

      const { category, slug } = bike;
      if (!category || !slug) return;

      categories.add(category);

      // product page
      urls.push({
        loc: `${BASE_URL}/${category}/${slug}`,
        lastmod: today,
        changefreq: "weekly",
        priority: "0.8",
      });
    });

    // category pages
    categories.forEach((cat) => {
      urls.push({
        loc: `${BASE_URL}/${cat}`,
        lastmod: today,
        changefreq: "weekly",
        priority: "0.9",
      });
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `
  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("")}
</urlset>`;

    fs.writeFileSync(outputPath, xml);

    console.log("✅ Bike sitemap generated → data/bikesitemap.xml");
  } catch (err) {
    console.error("❌ Error generating bike sitemap:", err.message);
  }
};

// allow direct run
if (require.main === module) {
  generateBikeSitemap();
}

module.exports = generateBikeSitemap;