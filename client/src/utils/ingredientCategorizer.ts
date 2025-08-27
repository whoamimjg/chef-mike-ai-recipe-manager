// Intelligent ingredient categorization system
// Maps ingredients to their appropriate grocery store categories

export const ingredientCategories: Record<string, string> = {
  // Produce Section
  'apple': 'produce',
  'apples': 'produce',
  'banana': 'produce',
  'bananas': 'produce',
  'orange': 'produce',
  'oranges': 'produce',
  'lemon': 'produce',
  'lemons': 'produce',
  'lime': 'produce',
  'limes': 'produce',
  'strawberries': 'produce',
  'strawberry': 'produce',
  'blueberries': 'produce',
  'blueberry': 'produce',
  'grapes': 'produce',
  'grape': 'produce',
  'pineapple': 'produce',
  'mango': 'produce',
  'avocado': 'produce',
  'avocados': 'produce',
  'tomato': 'produce',
  'tomatoes': 'produce',
  'onion': 'produce',
  'onions': 'produce',
  'garlic': 'produce',
  'ginger': 'produce',
  'potato': 'produce',
  'potatoes': 'produce',
  'carrot': 'produce',
  'carrots': 'produce',
  'celery': 'produce',
  'lettuce': 'produce',
  'spinach': 'produce',
  'kale': 'produce',
  'broccoli': 'produce',
  'cauliflower': 'produce',
  'cucumber': 'produce',
  'cucumbers': 'produce',
  'bell pepper': 'produce',
  'bell peppers': 'produce',
  'pepper': 'produce',
  'peppers': 'produce',
  'mushroom': 'produce',
  'mushrooms': 'produce',
  'green beans': 'produce',
  'asparagus': 'produce',
  'zucchini': 'produce',
  'squash': 'produce',
  'eggplant': 'produce',
  'cabbage': 'produce',
  'corn': 'produce',
  'peas': 'produce',
  'sweet potato': 'produce',
  'sweet potatoes': 'produce',
  'green onion': 'produce',
  'green onions': 'produce',
  'scallions': 'produce',
  'leek': 'produce',
  'leeks': 'produce',
  'radish': 'produce',
  'radishes': 'produce',
  'beets': 'produce',
  'turnip': 'produce',
  'parsnip': 'produce',
  'herbs': 'produce',
  'basil': 'produce',
  'cilantro': 'produce',
  'parsley': 'produce',
  'thyme': 'produce',
  'rosemary': 'produce',
  'mint': 'produce',
  'dill': 'produce',
  'oregano': 'produce',
  'sage': 'produce',

  // Dairy Section
  'milk': 'dairy',
  'butter': 'dairy',
  'cheese': 'dairy',
  'cheddar cheese': 'dairy',
  'mozzarella': 'dairy',
  'parmesan': 'dairy',
  'cream cheese': 'dairy',
  'sour cream': 'dairy',
  'yogurt': 'dairy',
  'greek yogurt': 'dairy',
  'cottage cheese': 'dairy',
  'ricotta': 'dairy',
  'heavy cream': 'dairy',
  'half and half': 'dairy',
  'buttermilk': 'dairy',
  'whipped cream': 'dairy',
  'eggs': 'dairy',
  'egg': 'dairy',

  // Poultry Section
  'chicken': 'poultry',
  'chicken breast': 'poultry',
  'chicken thigh': 'poultry',
  'chicken thighs': 'poultry',
  'chicken wings': 'poultry',
  'chicken drumsticks': 'poultry',
  'ground chicken': 'poultry',
  'turkey': 'poultry',
  'ground turkey': 'poultry',
  'turkey breast': 'poultry',
  'duck': 'poultry',
  'cornish hen': 'poultry',
  'whole chicken': 'poultry',
  'rotisserie chicken': 'poultry',

  // Pork Section
  'pork': 'pork',
  'bacon': 'pork',
  'ham': 'pork',
  'pork chops': 'pork',
  'pork shoulder': 'pork',
  'pork tenderloin': 'pork',
  'ground pork': 'pork',
  'sausage': 'pork',
  'pork ribs': 'pork',
  'prosciutto': 'pork',
  'pancetta': 'pork',
  'chorizo': 'pork',
  'pepperoni': 'pork',
  'salami': 'pork',

  // Red Meat Section
  'beef': 'red-meat',
  'ground beef': 'red-meat',
  'steak': 'red-meat',
  'ribeye': 'red-meat',
  'sirloin': 'red-meat',
  'filet mignon': 'red-meat',
  'beef roast': 'red-meat',
  'brisket': 'red-meat',
  'short ribs': 'red-meat',
  'chuck roast': 'red-meat',
  'lamb': 'red-meat',
  'ground lamb': 'red-meat',
  'lamb chops': 'red-meat',
  'veal': 'red-meat',
  'venison': 'red-meat',

  // Seafood Section
  'fish': 'seafood',
  'salmon': 'seafood',
  'tuna': 'seafood',
  'cod': 'seafood',
  'halibut': 'seafood',
  'tilapia': 'seafood',
  'mahi mahi': 'seafood',
  'trout': 'seafood',
  'sea bass': 'seafood',
  'shrimp': 'seafood',
  'crab': 'seafood',
  'lobster': 'seafood',
  'scallops': 'seafood',
  'mussels': 'seafood',
  'oysters': 'seafood',
  'clams': 'seafood',
  'calamari': 'seafood',
  'octopus': 'seafood',
  'canned tuna': 'seafood',
  'canned salmon': 'canned-goods',

  // Deli Section
  'deli meat': 'deli',
  'sliced turkey': 'deli',
  'sliced ham': 'deli',
  'roast beef': 'deli',
  'pastrami': 'deli',
  'corned beef': 'deli',
  'deli cheese': 'deli',
  'sliced cheese': 'deli',
  'lunch meat': 'deli',

  // Frozen Section
  'frozen vegetables': 'frozen',
  'frozen fruit': 'frozen',
  'frozen berries': 'frozen',
  'ice cream': 'frozen',
  'frozen pizza': 'frozen',
  'frozen dinner': 'frozen',
  'frozen fish': 'frozen',
  'frozen chicken': 'frozen',
  'frozen fries': 'frozen',
  'frozen peas': 'frozen',
  'frozen corn': 'frozen',
  'frozen broccoli': 'frozen',
  'frozen spinach': 'frozen',
  'popsicles': 'frozen',
  'gelato': 'frozen',
  'sherbet': 'frozen',
  'frozen yogurt': 'frozen',
  'ice': 'frozen',

  // Beverages Section
  'water': 'beverages',
  'sparkling water': 'beverages',
  'soda': 'beverages',
  'juice': 'beverages',
  'orange juice': 'beverages',
  'apple juice': 'beverages',
  'cranberry juice': 'beverages',
  'coffee': 'beverages',
  'tea': 'beverages',
  'green tea': 'beverages',
  'black tea': 'beverages',
  'herbal tea': 'beverages',
  'energy drink': 'beverages',
  'sports drink': 'beverages',
  'wine': 'beverages',
  'beer': 'beverages',
  'kombucha': 'beverages',
  'coconut water': 'beverages',
  'almond milk': 'beverages',
  'soy milk': 'beverages',
  'oat milk': 'beverages',

  // Bread & Bakery Section
  'bread': 'bread',
  'white bread': 'bread',
  'wheat bread': 'bread',
  'sourdough': 'bread',
  'bagel': 'bread',
  'bagels': 'bread',
  'muffin': 'bread',
  'muffins': 'bread',
  'croissant': 'bread',
  'croissants': 'bread',
  'danish': 'bread',
  'donut': 'bread',
  'donuts': 'bread',
  'cake': 'bread',
  'cookies': 'bread',
  'pie': 'bread',
  'rolls': 'bread',
  'dinner rolls': 'bread',
  'hamburger buns': 'bread',
  'hot dog buns': 'bread',
  'tortilla': 'bread',
  'tortillas': 'bread',
  'pita bread': 'bread',
  'naan': 'bread',
  'english muffin': 'bread',
  'crackers': 'bread',

  // Canned Goods Section
  'canned tomatoes': 'canned-goods',
  'tomato paste': 'canned-goods',
  'tomato sauce': 'canned-goods',
  'grav mix': 'canned-goods',
  'coleslaw': 'produce',
  'tm coleslaw': 'produce',
  'velveeta': 'dairy',
  'mountain dew': 'beverages',
  'canned beans': 'canned-goods',
  'black beans': 'canned-goods',
  'kidney beans': 'canned-goods',
  'chickpeas': 'canned-goods',
  'garbanzo beans': 'canned-goods',
  'white beans': 'canned-goods',
  'pinto beans': 'canned-goods',
  'navy beans': 'canned-goods',
  'canned corn': 'canned-goods',
  'canned peas': 'canned-goods',
  'canned carrots': 'canned-goods',
  'canned green beans': 'canned-goods',
  'canned soup': 'canned-goods',
  'broth': 'canned-goods',
  'chicken broth': 'canned-goods',
  'beef broth': 'canned-goods',
  'vegetable broth': 'canned-goods',
  'stock': 'canned-goods',
  'coconut milk': 'canned-goods',
  'evaporated milk': 'canned-goods',
  'condensed milk': 'canned-goods',

  // Snacks Section
  'chips': 'snacks',
  'potato chips': 'snacks',
  'pretzels': 'snacks',
  'popcorn': 'snacks',
  'nuts': 'snacks',
  'peanuts': 'snacks',
  'almonds': 'snacks',
  'cashews': 'snacks',
  'walnuts': 'snacks',
  'pecans': 'snacks',
  'pistachios': 'snacks',
  'trail mix': 'snacks',
  'granola bars': 'snacks',
  'protein bars': 'snacks',
  'candy': 'snacks',
  'chocolate': 'snacks',
  'gum': 'snacks',
  'mints': 'snacks',

  // Pantry/Dry Goods
  'rice': 'canned-goods',
  'pasta': 'canned-goods',
  'flour': 'canned-goods',
  'sugar': 'canned-goods',
  'brown sugar': 'canned-goods',
  'salt': 'spices',
  'olive oil': 'canned-goods',
  'vegetable oil': 'canned-goods',
  'canola oil': 'canned-goods',
  'coconut oil': 'canned-goods',
  'vinegar': 'canned-goods',
  'balsamic vinegar': 'canned-goods',
  'apple cider vinegar': 'canned-goods',
  'soy sauce': 'canned-goods',
  'worcestershire sauce': 'canned-goods',
  'hot sauce': 'canned-goods',
  'ketchup': 'canned-goods',
  'mustard': 'canned-goods',
  'mayonnaise': 'canned-goods',
  'peanut butter': 'canned-goods',
  'jelly': 'canned-goods',
  'jam': 'canned-goods',
  'honey': 'canned-goods',
  'maple syrup': 'canned-goods',
  'vanilla extract': 'canned-goods',
  'baking powder': 'canned-goods',
  'baking soda': 'canned-goods',
  'yeast': 'canned-goods',
  'cornstarch': 'canned-goods',
  'sesame oil': 'canned-goods',
  'tahini': 'canned-goods',

  // Spices & Seasonings Section
  'paprika': 'spices',
  'cumin': 'spices',
  'chili powder': 'spices',
  'garlic powder': 'spices',
  'onion powder': 'spices',
  'dried herbs': 'spices',
  'bay leaves': 'spices',
  'cinnamon': 'spices',
  'nutmeg': 'spices',
  'ginger powder': 'spices',
  'turmeric': 'spices',
  'red pepper flakes': 'spices',
  'black pepper': 'spices',
  'white pepper': 'spices',
  'cayenne pepper': 'spices',
  'allspice': 'spices',
  'cardamom': 'spices',
  'cloves': 'spices',
  'coriander': 'spices',
  'fennel seeds': 'spices',
  'mustard seeds': 'spices',
  'star anise': 'spices',
  'vanilla': 'spices',
  'extract': 'spices',
  'seasoning': 'spices',
  'herb': 'spices',
  'spice': 'spices',
  'curry powder': 'spices',
  'italian seasoning': 'spices',
  'herbs de provence': 'spices',
  'everything bagel seasoning': 'spices',
  'garlic salt': 'spices',
  'onion salt': 'spices',
  'celery salt': 'spices',
  'lemon pepper': 'spices',
  'old bay': 'spices',
  'taco seasoning': 'spices',
  'ranch seasoning': 'spices',
  'dried oregano': 'spices',
  'dried basil': 'spices',
  'dried thyme': 'spices',
  'dried rosemary': 'spices',
  'dried parsley': 'spices',
  'dried dill': 'spices',
  'smoked paprika': 'spices',
  'chili flakes': 'spices',
  'dried chili': 'spices',
  'ground ginger': 'spices',
  'ground cinnamon': 'spices',
  'ground nutmeg': 'spices',
  'ground cloves': 'spices',

  // Ethnic Foods
  'tortilla chips': 'ethnic-foods',
  'salsa': 'ethnic-foods',
  'refried beans': 'ethnic-foods',
  'taco shells': 'ethnic-foods',
  'sriracha': 'ethnic-foods',
  'fish sauce': 'ethnic-foods',
  'miso paste': 'ethnic-foods',
  'curry paste': 'ethnic-foods',
  'garam masala': 'ethnic-foods',
  'coconut cream': 'ethnic-foods',
  'rice noodles': 'ethnic-foods',
  'ramen': 'ethnic-foods',
  'kimchi': 'ethnic-foods',
  'wasabi': 'ethnic-foods',
  'pickled ginger': 'ethnic-foods',
  'nori': 'ethnic-foods',
  'mirin': 'ethnic-foods',
  'sake': 'ethnic-foods',

  // Household Goods
  'toilet paper': 'household-goods',
  'paper towels': 'household-goods',
  'napkins': 'household-goods',
  'tissues': 'household-goods',
  'aluminum foil': 'household-goods',
  'plastic wrap': 'household-goods',
  'ziplock bags': 'household-goods',
  'garbage bags': 'household-goods',
  'light bulbs': 'household-goods',
  'batteries': 'household-goods',

  // Cleaning Supplies
  'dish soap': 'cleaning-supplies',
  'laundry detergent': 'cleaning-supplies',
  'fabric softener': 'cleaning-supplies',
  'bleach': 'cleaning-supplies',
  'all purpose cleaner': 'cleaning-supplies',
  'glass cleaner': 'cleaning-supplies',
  'bathroom cleaner': 'cleaning-supplies',
  'toilet bowl cleaner': 'cleaning-supplies',
  'floor cleaner': 'cleaning-supplies',
  'disinfectant': 'cleaning-supplies',

  'sponges': 'cleaning-supplies',
  'rubber gloves': 'cleaning-supplies',

  // Pet Supplies
  'dog food': 'pets',
  'cat food': 'pets',
  'pet treats': 'pets',
  'cat litter': 'pets',
  'dog treats': 'pets',
  'pet toys': 'pets',
  'bird seed': 'pets',
  'fish food': 'pets'
};

// Function to intelligently categorize an ingredient
export function categorizeIngredient(itemName: string): string {
  if (!itemName || typeof itemName !== 'string') {
    console.warn('Invalid item name for categorization:', itemName);
    return 'uncategorized';
  }
  
  const normalizedName = itemName.toLowerCase().trim();
  console.log(`Categorizing: "${itemName}" -> normalized: "${normalizedName}"`);
  
  // Direct match
  if (ingredientCategories[normalizedName]) {
    const category = ingredientCategories[normalizedName];
    console.log(`Direct match found: "${normalizedName}" -> "${category}"`);
    return category;
  }
  
  // Partial match - check if the item name contains any of our known ingredients
  for (const [ingredient, category] of Object.entries(ingredientCategories)) {
    if (normalizedName.includes(ingredient) || ingredient.includes(normalizedName)) {
      console.log(`Partial match found: "${normalizedName}" contains "${ingredient}" -> "${category}"`);
      return category;
    }
  }
  
  // Pattern matching for common categories
  if (normalizedName.includes('milk') || normalizedName.includes('cream') || 
      normalizedName.includes('yogurt') || normalizedName.includes('cheese')) {
    console.log(`Pattern match (dairy): "${normalizedName}" -> "dairy"`);
    return 'dairy';
  }
  
  if (normalizedName.includes('chicken') || normalizedName.includes('turkey') || 
      normalizedName.includes('duck')) {
    return 'poultry';
  }
  
  if (normalizedName.includes('beef') || normalizedName.includes('steak') || 
      normalizedName.includes('lamb') || normalizedName.includes('veal')) {
    return 'red-meat';
  }
  
  if (normalizedName.includes('pork') || normalizedName.includes('bacon') || 
      normalizedName.includes('ham') || normalizedName.includes('sausage')) {
    return 'pork';
  }
  
  if (normalizedName.includes('salmon') || normalizedName.includes('tuna') || 
      normalizedName.includes('fish') || normalizedName.includes('shrimp') ||
      normalizedName.includes('crab') || normalizedName.includes('lobster')) {
    return 'seafood';
  }
  
  if (normalizedName.includes('frozen')) {
    return 'frozen';
  }
  
  if (normalizedName.includes('bread') || normalizedName.includes('bagel') || 
      normalizedName.includes('muffin') || normalizedName.includes('cake') ||
      normalizedName.includes('cookie') || normalizedName.includes('pie')) {
    return 'bread';
  }
  
  if (normalizedName.includes('canned') || normalizedName.includes('can ') ||
      normalizedName.includes('jar') || normalizedName.includes('bottle')) {
    return 'canned-goods';
  }
  
  if (normalizedName.includes('juice') || normalizedName.includes('soda') || 
      normalizedName.includes('water') || normalizedName.includes('coffee') ||
      normalizedName.includes('tea') || normalizedName.includes('beer') ||
      normalizedName.includes('wine')) {
    return 'beverages';
  }
  
  if (normalizedName.includes('chips') || normalizedName.includes('nuts') || 
      normalizedName.includes('candy') || normalizedName.includes('chocolate') ||
      normalizedName.includes('cookies')) {
    return 'snacks';
  }
  
  if (normalizedName.includes('spice') || normalizedName.includes('seasoning') ||
      normalizedName.includes('pepper') || normalizedName.includes('herb') ||
      normalizedName.includes('extract') || normalizedName.includes('powder') ||
      normalizedName.includes('dried') || normalizedName.includes('ground') ||
      normalizedName.includes('flakes') || normalizedName.includes('seeds') ||
      normalizedName.includes('salt') && !normalizedName.includes('saltine')) {
    return 'spices';
  }
  
  if (normalizedName.includes('cleaner') || normalizedName.includes('soap') || 
      normalizedName.includes('detergent') || normalizedName.includes('bleach')) {
    return 'cleaning-supplies';
  }
  
  if (normalizedName.includes('dog') || normalizedName.includes('cat') || 
      normalizedName.includes('pet') || normalizedName.includes('litter')) {
    return 'pets';
  }
  
  // Default to produce for fresh items or unknown items
  console.log(`No category match found for "${normalizedName}", defaulting to "produce"`);
  return 'produce';
}

// Get category display name with emoji
export const categoryDisplayNames: Record<string, string> = {
  'produce': '🥬 Produce',
  'deli': '🧀 Deli',
  'poultry': '🐔 Poultry',
  'pork': '🥓 Pork',
  'red-meat': '🥩 Red Meat',
  'seafood': '🐟 Seafood',
  'dairy': '🥛 Dairy',
  'frozen': '🧊 Frozen',
  'beverages': '🥤 Beverages',
  'snacks': '🍿 Snacks',
  'canned-goods': '🥫 Canned Goods',
  'bread': '🍞 Bread & Bakery',
  'spices': '🧂 Spices & Seasonings',
  'ethnic-foods': '🌶️ Ethnic Foods',
  'household-goods': '🏠 Household',
  'cleaning-supplies': '🧽 Cleaning',
  'pets': '🐕 Pet Supplies'
};