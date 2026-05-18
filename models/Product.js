const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        lowercase: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    originalPrice: {
        type: Number,
        min: 0
    },
    category: {
        type: String,
        required: true,
        enum: ['Clothing', 'HomeDecor']
    },
    images: [{
        type: String
    }],
    sizes: [{
        type: String,
        enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    }],
    colors: [{
        type: String
    }],
    stock: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    featured: {
        type: Boolean,
        default: false
    },
    shippingFee: {
        type: Number,
        default: 250,
        min: 0
    },
    seoTitle: {
        type: String,
        default: '',
        trim: true
    },
    seoDescription: {
        type: String,
        default: '',
        trim: true
    },
    seoKeywords: {
        type: String,
        default: '',
        trim: true
    },
    metaTitle: {
        type: String,
        trim: true
    },
    metaDescription: {
        type: String,
        trim: true
    },
    metaKeywords: {
        type: String,
        trim: true
    },
    canonicalUrl: {
        type: String,
        trim: true
    },
    ogTitle: {
        type: String,
        trim: true
    },
    ogDescription: {
        type: String,
        trim: true
    },
    ogImage: {
        type: String,
        trim: true
    },
    structuredDataType: {
        type: String,
        default: 'Product',
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Auto-generate slug from product name
productSchema.pre('save', async function(next) {
    if (this.isModified('name') || !this.slug) {
        let slug = this.name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');

        // Check if slug already exists and make it unique
        let uniqueSlug = slug;
        let counter = 1;
        let existingProduct = await mongoose.model('Product').findOne({ slug: uniqueSlug, _id: { $ne: this._id } });

        while (existingProduct) {
            uniqueSlug = `${slug}-${counter}`;
            counter++;
            existingProduct = await mongoose.model('Product').findOne({ slug: uniqueSlug, _id: { $ne: this._id } });
        }

        this.slug = uniqueSlug;
    }
    next();
});

module.exports = mongoose.model('Product', productSchema);
