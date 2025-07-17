/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://onlook.com',
  generateRobotsTxt: true,
  exclude: ['/api/*', '/sitemap', '/404'],
  // Uncomment below if you expect huge URL count
  // sitemapSize: 5000,
};
