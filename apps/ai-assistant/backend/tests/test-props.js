const fs = require('fs');
const data = JSON.parse(fs.readFileSync('raw-notion-output.json', 'utf8'));

if (data.results && data.results.length > 0) {
  const props = Object.keys(data.results[0].properties);
  console.log("Property keys:", props);
  console.log("\nFirst item full properties:\n", JSON.stringify(data.results[0].properties, null, 2));
} else {
  console.log("No results");
}
