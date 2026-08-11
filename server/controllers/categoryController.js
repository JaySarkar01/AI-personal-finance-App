const Category = require('../models/Category');

// Default system categories seeded per user
const DEFAULT_CATEGORIES = [
  { name: 'Food',               icon: '🍽️', color: '#F97316', type: 'expense' },
  { name: 'Kirana/Groceries',   icon: '🛒', color: '#10B981', type: 'expense' },
  { name: 'Fuel',               icon: '⛽', color: '#F59E0B', type: 'expense' },
  { name: 'Transport',          icon: '🛺', color: '#3B82F6', type: 'expense' },
  { name: 'Rent',               icon: '🏠', color: '#64748B', type: 'expense' },
  { name: 'Utilities',          icon: '⚡', color: '#EAB308', type: 'expense' },
  { name: 'Mobile',             icon: '📱', color: '#06B6D4', type: 'expense' },
  { name: 'Education',          icon: '📚', color: '#0EA5E9', type: 'expense' },
  { name: 'Healthcare',         icon: '💊', color: '#F43F5E', type: 'expense' },
  { name: 'EMI',                icon: '🏦', color: '#EF4444', type: 'expense' },
  { name: 'Insurance',          icon: '🛡️', color: '#8B5CF6', type: 'expense' },
  { name: 'Shopping',           icon: '🛍️', color: '#EC4899', type: 'expense' },
  { name: 'Entertainment',      icon: '🎬', color: '#D946EF', type: 'expense' },
  { name: 'Subscriptions',      icon: '🔁', color: '#7C3AED', type: 'expense' },
  { name: 'Investments',        icon: '📈', color: '#22C55E', type: 'expense' },
  { name: 'Other',              icon: '📦', color: '#94A3B8', type: 'both'    },
  { name: 'Salary',             icon: '💼', color: '#22C55E', type: 'income'  },
  { name: 'Freelance',          icon: '💻', color: '#14B8A6', type: 'income'  },
  { name: 'Investment Returns', icon: '📈', color: '#F59E0B', type: 'income'  },
  { name: 'Transfer',           icon: '🔄', color: '#0D9488', type: 'both'    },
];

/**
 * Seed default categories for a new user if they have none.
 */
const seedDefaultCategories = async (userId) => {
  const count = await Category.countDocuments({ user: userId });
  if (count === 0) {
    const categories = DEFAULT_CATEGORIES.map((c) => ({
      ...c,
      user: userId,
      isSystem: true,
    }));
    await Category.insertMany(categories, { ordered: false });
  }
};

// @desc   Get all categories for the authenticated user
// @route  GET /api/categories
// @access Private
exports.getCategories = async (req, res, next) => {
  try {
    await seedDefaultCategories(req.user._id);

    const { type } = req.query;
    const filter = { user: req.user._id };
    if (type && ['income', 'expense', 'both'].includes(type)) {
      filter.type = { $in: [type, 'both'] };
    }

    const categories = await Category.find(filter).sort({ isSystem: -1, name: 1 });
    res.status(200).json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    next(error);
  }
};

// @desc   Create a custom category
// @route  POST /api/categories
// @access Private
exports.createCategory = async (req, res, next) => {
  try {
    const { name, icon, color, type } = req.body;

    const category = await Category.create({
      user: req.user._id,
      name,
      icon: icon || '💰',
      color: color || '#0D9488',
      type: type || 'both',
      isSystem: false,
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A category with this name already exists' });
    }
    next(error);
  }
};

// @desc   Update a category
// @route  PUT /api/categories/:id
// @access Private
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, user: req.user._id });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    if (category.isSystem) {
      return res.status(403).json({ success: false, message: 'System categories cannot be modified' });
    }

    const { name, icon, color, type } = req.body;
    if (name !== undefined) category.name = name;
    if (icon !== undefined) category.icon = icon;
    if (color !== undefined) category.color = color;
    if (type !== undefined) category.type = type;

    await category.save();
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A category with this name already exists' });
    }
    next(error);
  }
};

// @desc   Delete a custom category
// @route  DELETE /api/categories/:id
// @access Private
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, user: req.user._id });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    if (category.isSystem) {
      return res.status(403).json({ success: false, message: 'System categories cannot be deleted' });
    }

    await category.deleteOne();
    res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
};
