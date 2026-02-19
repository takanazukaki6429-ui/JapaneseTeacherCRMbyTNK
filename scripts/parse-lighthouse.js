const fs = require('fs');
try {
    const report = JSON.parse(fs.readFileSync('lighthouse-report.json', 'utf8'));
    const categories = report.categories;
    console.log('--------------------------------');
    console.log('Lighthouse Scores:');
    console.log('--------------------------------');
    console.log('Performance:   ', categories.performance.score * 100);
    console.log('Accessibility: ', categories.accessibility.score * 100);
    console.log('Best Practices:', categories['best-practices'].score * 100);
    console.log('SEO:           ', categories.seo.score * 100);
    console.log('--------------------------------');
} catch (e) {
    console.error('Error parsing report:', e);
}
