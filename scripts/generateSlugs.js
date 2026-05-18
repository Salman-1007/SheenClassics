/**
 * Script to generate slugs for all products that don't have them
 * Run with: node scripts/generateSlugs.js
 */

const mongoose = require('mongoose');
const Product = require('../models/Product');

async function generateSlugs() {
    let connection;
    try {
        console.log('🔄 Connecting to MongoDB...');

        // Connect to database
        connection = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sheenclassics', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000,
            connectTimeoutMS: 10000
        });

        console.log('✅ MongoDB Connected');
        console.log('🔄 Starting slug generation for all products...');

        // Find all products without slugs
        const productsWithoutSlugs = await Product.find({ $or: [{ slug: null }, { slug: '' }] });

        console.log(`Found ${productsWithoutSlugs.length} products without slugs`);

        if (productsWithoutSlugs.length === 0) {
            console.log('✅ All products already have slugs!');
            mongoose.connection.close();
            return;
        }

        let updated = 0;
        let failed = 0;

        for (const product of productsWithoutSlugs) {
            try {
                // Generate slug from name
                let slug = product.name
                    .toLowerCase()
                    .trim()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-');

                // Check if slug already exists and make it unique
                let uniqueSlug = slug;
                let counter = 1;
                let existingProduct = await Product.findOne({ slug: uniqueSlug, _id: { $ne: product._id } });

                while (existingProduct) {
                    uniqueSlug = `${slug}-${counter}`;
                    counter++;
                    existingProduct = await Product.findOne({ slug: uniqueSlug, _id: { $ne: product._id } });
                }

                product.slug = uniqueSlug;
                await product.save();

                console.log(`✅ Updated "${product.name}" with slug: "${uniqueSlug}"`);
                updated++;
            } catch (error) {
                console.error(`❌ Failed to update "${product.name}":`, error.message);
                failed++;
            }
        }

        console.log(`\n📊 Summary:`);
        console.log(`   ✅ Updated: ${updated}`);
        console.log(`   ❌ Failed: ${failed}`);

        mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        mongoose.connection.close();
        process.exit(1);
    }
}

generateSlugs();