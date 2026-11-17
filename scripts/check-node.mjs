if (Number(process.version.slice(1).split('.')[0]) < 24) {
  console.error(`Node.js 24 or later is required. Found ${process.version}. Install Node.js 24 and make sure node on PATH uses it.`);
  process.exit(1);
}
