const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    title: {
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
    category: {
        type: String,
        default: 'Style Notes',
        trim: true
    },
    excerpt: {
        type: String,
        default: '',
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    featured: {
        type: Boolean,
        default: false
    },
    published: {
        type: Boolean,
        default: true
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
    }
}, { timestamps: true });

blogSchema.pre('save', async function(next) {
    if (this.isModified('title') || !this.slug) {
        const baseSlug = this.title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');

        let uniqueSlug = baseSlug;
        let counter = 1;
        let existingBlog = await mongoose.model('Blog').findOne({ slug: uniqueSlug, _id: { $ne: this._id } });

        while (existingBlog) {
            uniqueSlug = `${baseSlug}-${counter}`;
            counter++;
            existingBlog = await mongoose.model('Blog').findOne({ slug: uniqueSlug, _id: { $ne: this._id } });
        }

        this.slug = uniqueSlug;
    }

    next();
});

module.exports = mongoose.model('Blog', blogSchema);
