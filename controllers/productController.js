const Product = require('../models/Product');

exports.getAllProducts = async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    let query = {};
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    let sortOption = {};
    switch(sort) {
      case 'price-low':
        sortOption = { price: 1 };
        break;
      case 'price-high':
        sortOption = { price: -1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }
    
    const products = await Product.find(query).sort(sortOption);
    
    res.render('products', {
      title: 'Products - SheenClassics',
      products,
      currentCategory: category || 'All',
      searchQuery: search || '',
      sortOption: sort || 'newest'
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).render('error', {
      title: 'Error - SheenClassics',
      error: 'Failed to load products'
    });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).render('404', { title: 'Product Not Found - SheenClassics' });
    }
    
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id }
    }).limit(4);
    
    res.render('product-detail', {
      title: `${product.name} - SheenClassics`,
      product,
      relatedProducts
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).render('error', {
      title: 'Error - SheenClassics',
      error: 'Failed to load product'
    });
  }
};

