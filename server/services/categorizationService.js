const MerchantRule = require('../models/MerchantRule');
const Category = require('../models/Category');
const { generateContent } = require('./aiService');

// Configurable merchant rules for common Indian merchants
const GLOBAL_MERCHANTS = {
  'swiggy': 'Food Delivery',
  'zomato': 'Food Delivery',
  'blinkit': 'Groceries',
  'zepto': 'Groceries',
  'instamart': 'Groceries',
  'uber': 'Transport',
  'ola': 'Transport',
  'rapido': 'Transport',
  'jio': 'Mobile',
  'airtel': 'Mobile',
  'vi': 'Mobile',
  'netflix': 'Entertainment',
  'amazon': 'Shopping',
  'flipkart': 'Shopping'
};

/**
 * Clean a description to find a merchant pattern.
 */
const cleanDescription = (desc) => {
  if (!desc) return '';
  return desc.toLowerCase()
    .replace(/[0-9]/g, '') // remove numbers
    .replace(/[^a-z\s]/g, '') // remove special chars
    .trim()
    .split(/\s+/)[0]; // take the first significant word
};

/**
 * Categorize a transaction based on description.
 * Priority: User Rule (1) -> Global Merchant (2) -> Cached AI (3) -> Gemini API
 */
exports.predictCategory = async (userId, description) => {
  if (!description) return null;

  const pattern = cleanDescription(description);
  if (!pattern || pattern.length < 3) return null;

  // 1 & 3. Find matching DB rules (User override=1, AI cached=3)
  const rules = await MerchantRule.find({ pattern, user: userId })
    .sort({ priority: 1 }).populate('category');

  if (rules.length > 0 && rules[0].category) {
    return rules[0].category._id;
  }

  // 2. Fallback to Global Merchant rule
  if (GLOBAL_MERCHANTS[pattern]) {
    const targetCategoryName = GLOBAL_MERCHANTS[pattern];
    // Find if user has a category with this name (or similar)
    const userCat = await Category.findOne({ 
      user: userId, 
      name: { $regex: new RegExp(targetCategoryName, 'i') } 
    });
    if (userCat) {
      return userCat._id;
    }
  }

  // 2. If no rule matched, fallback to Gemini
  try {
    // Get user's categories
    const categories = await Category.find({ user: userId }).select('name _id').lean();
    if (categories.length === 0) return null;

    const catList = categories.map(c => `- ${c.name} (${c._id})`).join('\n');
    
    const prompt = `You are an Indian personal finance categorizer.
Match the transaction description to the MOST APPROPRIATE category ID from the list.
Return ONLY the exact Category ID. If none match, return "NULL".

Transaction Description: "${description}"

Categories:
${catList}

Category ID:`;

    const aiResponse = await generateContent(prompt);
    if (!aiResponse) return null;

    const matchId = aiResponse.trim();
    const isValid = categories.some(c => c._id.toString() === matchId);

    if (isValid) {
      // 3. Cache the AI classification for future
      await MerchantRule.create({
        user: userId,
        pattern,
        category: matchId,
        priority: 3 // AI Cached
      });
      return matchId;
    }
    
    return null;
  } catch (error) {
    console.error('Categorization AI Error:', error.message);
    return null;
  }
};

/**
 * User corrected a category manually. Update/create a rule.
 */
exports.learnUserCorrection = async (userId, description, categoryId) => {
  if (!description || !categoryId) return;
  const pattern = cleanDescription(description);
  if (!pattern || pattern.length < 3) return;

  // Upsert user correction (Priority 1)
  await MerchantRule.findOneAndUpdate(
    { user: userId, pattern },
    { category: categoryId, priority: 1 },
    { upsert: true, new: true }
  );
};
