const fs = require('fs');
const path = require('path');

function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(dir, entry.name);
        return entry.isDirectory() ? walk(fullPath) : [fullPath];
    });
}

for (const file of walk(path.join(__dirname, '..', 'views'))) {
    if (!file.endsWith('.ejs')) continue;
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    content = content.replace(/onclick="event\.stopPropagation\(\); addToCart\(/g, 'onclick="if (event) event.stopPropagation(); addToCart(');
    content = content.replace(/onclick="event\.stopPropagation\(\); addToWishlist\(/g, 'onclick="if (event) event.stopPropagation(); addToWishlist(');
    content = content.replace(/onclick="event\.stopPropagation\(\); removeFromWishlist\(/g, 'onclick="if (event) event.stopPropagation(); removeFromWishlist(');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Patched ${file}`);
    }
}