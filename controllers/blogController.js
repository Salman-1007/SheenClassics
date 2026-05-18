const Blog = require('../models/Blog');

exports.getBlog = async(req, res) => {
    try {
        const blog = await Blog.findOne({ slug: req.params.slug, published: true });

        if (!blog) {
            return res.status(404).render('404', { title: 'Blog Not Found - SheenClassics' });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;

        res.render('blog-detail', {
            title: `${blog.title} - SheenClassics`,
            blog,
            metaTitle: blog.seoTitle || `${blog.title} | SheenClassics`,
            metaDescription: blog.seoDescription || blog.excerpt || blog.content.slice(0, 155),
            metaKeywords: `${blog.category}, SheenClassics, style blog`,
            canonicalUrl: `${baseUrl}/blogs/${blog.slug}`,
            ogTitle: blog.seoTitle || blog.title,
            ogDescription: blog.seoDescription || blog.excerpt || blog.content.slice(0, 155),
            ogImage: '/images/logoc.jpg',
            ogType: 'article'
        });
    } catch (error) {
        console.error('Error loading blog:', error);
        res.status(500).render('error', {
            title: 'Error - SheenClassics',
            error: 'Failed to load blog'
        });
    }
};
