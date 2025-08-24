import OpenAI from "openai";
import fs from "fs";
import path from "path";

// Check if OpenAI API key is properly configured
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY environment variable is required');
  throw new Error('OPENAI_API_KEY environment variable is required');
}

console.log('receiptOCR: OpenAI API Key configured:', !!process.env.OPENAI_API_KEY);
console.log('receiptOCR: OpenAI API Key length:', process.env.OPENAI_API_KEY?.length);

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export interface ReceiptItem {
  name: string;
  quantity: string;
  unit: string;
  price: number;
  category: string;
}

export interface ReceiptData {
  storeName: string;
  purchaseDate: string;
  totalAmount: number;
  items: ReceiptItem[];
}

// Category mapping for common grocery items
const getCategoryForItem = (itemName: string): string => {
  const name = itemName.toLowerCase();
  
  if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt') || 
      name.includes('butter') || name.includes('cream') || name.includes('dairy')) {
    return 'dairy';
  }
  
  if (name.includes('chicken') || name.includes('beef') || name.includes('pork') || 
      name.includes('fish') || name.includes('turkey') || name.includes('lamb') ||
      name.includes('meat') || name.includes('salmon') || name.includes('tuna')) {
    return 'meat & poultry';
  }
  
  if (name.includes('apple') || name.includes('banana') || name.includes('orange') ||
      name.includes('lettuce') || name.includes('tomato') || name.includes('carrot') ||
      name.includes('potato') || name.includes('onion') || name.includes('pepper') ||
      name.includes('fruit') || name.includes('vegetable') || name.includes('produce')) {
    return 'produce';
  }
  
  if (name.includes('bread') || name.includes('pasta') || name.includes('rice') ||
      name.includes('cereal') || name.includes('flour') || name.includes('grain') ||
      name.includes('bakery')) {
    return 'bakery & grains';
  }
  
  if (name.includes('frozen') || name.includes('ice cream') || name.includes('pizza')) {
    return 'frozen';
  }
  
  if (name.includes('soap') || name.includes('shampoo') || name.includes('detergent') ||
      name.includes('cleaning') || name.includes('personal care')) {
    return 'household & personal care';
  }
  
  if (name.includes('juice') || name.includes('soda') || name.includes('water') ||
      name.includes('beer') || name.includes('wine') || name.includes('beverage')) {
    return 'beverages';
  }
  
  return 'pantry & other';
};


export async function processReceiptImage(imagePath: string): Promise<ReceiptData> {
  try {
    console.log('Processing receipt image:', imagePath);
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Receipt image file not found: ${imagePath}`);
    }
    
    // Check if it's a PDF file
    if (path.extname(imagePath).toLowerCase() === '.pdf') {
      throw new Error('PDF files are not directly supported yet. Please convert your PDF receipt to an image (PNG, JPG) and try again. You can do this by taking a screenshot of the PDF or using an online PDF-to-image converter.');
    }
    
    // Read image file and convert to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    console.log('Image file size:', imageBuffer.length, 'bytes');
    console.log('Base64 image length:', base64Image.length);

    const prompt = `
    ULTRA-CRITICAL RECEIPT ANALYSIS: Extract EVERY SINGLE LINE ITEM from this receipt. You are a professional receipt analyzer and must catch 100% of purchasable items.

    STEP-BY-STEP PROCESS:
    1. Scan the receipt image line by line from top to bottom
    2. For EACH line that contains a product name and price, create a separate item entry
    3. Look for patterns like "PRODUCT NAME    PRICE" or "BARCODE PRODUCT NAME PRICE"
    4. Count as you go - you should find 20-30+ items on most grocery receipts

    JSON FORMAT REQUIRED:
    {
      "storeName": "Store name from receipt",
      "purchaseDate": "YYYY-MM-DD format",
      "totalAmount": total_number,
      "items": [
        {
          "name": "Exact product name from receipt",
          "quantity": "quantity or 1",
          "unit": "unit or each", 
          "price": actual_price_number
        }
      ]
    }

    ABSOLUTE REQUIREMENTS:
    ✓ EVERY purchasable line = separate item (even identical products with different prices)
    ✓ Include ALL sections: grocery, pharmacy, general merchandise, everything
    ✓ Different barcodes = different items (85582300716 vs 85582300718)
    ✓ Different prices = different items (same product, different sizes/offers)
    ✓ Weighted items: extract actual weight as quantity (2.07 lb becomes quantity: "2.07", unit: "lb")
    ✓ Missing info: guess rather than skip (unclear text → best guess name, missing price → 0.00)
    
    IGNORE ONLY:
    ✗ Store headers, payment info, card numbers
    ✗ "SUBTOTAL", "TOTAL", "TAX", "SAVINGS", "COUPON" lines
    ✗ Negative discount amounts (but include the products they apply to)

    CRITICAL SUCCESS METRIC: Find 25+ items. If you find fewer than 20 items, you failed - scan again more carefully.

    Return ONLY the JSON object.
    `;

    console.log('Sending request to OpenAI...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000,
    });
    
    console.log('OpenAI response received, parsing...');

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    console.log('Raw OCR result from OpenAI:', {
      storeName: result.storeName,
      itemCount: result.items?.length || 0,
      items: result.items
    });
    
    // Add categories to items and ensure all required fields
    const itemsWithCategories = (result.items || []).map((item: any, index: number) => {
      const processedItem = {
        ...item,
        category: getCategoryForItem(item.name),
        price: typeof item.price === 'string' ? parseFloat(item.price) || 0 : (item.price || 0),
        quantity: item.quantity || "1",
        unit: item.unit || "each"
      };
      console.log(`Item ${index + 1}:`, processedItem);
      return processedItem;
    });

    console.log('Final processed items being returned:', itemsWithCategories.length, 'items');

    return {
      storeName: result.storeName || 'Unknown Store',
      purchaseDate: result.purchaseDate || new Date().toISOString().split('T')[0],
      totalAmount: typeof result.totalAmount === 'string' ? parseFloat(result.totalAmount) : result.totalAmount,
      items: itemsWithCategories
    };

  } catch (error) {
    console.error('Error processing receipt image:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Check for specific OpenAI errors
      if (error.message.includes('API key') || error.message.includes('401')) {
        throw new Error('OpenAI API key configuration issue. Please check your API key.');
      } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        throw new Error('OpenAI API rate limit exceeded. Please try again in a few moments.');
      } else if (error.message.includes('file not found')) {
        throw new Error('Receipt image file was not uploaded properly. Please try uploading again.');
      } else if (error.message.includes('insufficient_quota') || error.message.includes('quota')) {
        throw new Error('OpenAI API quota exceeded. Please check your OpenAI account.');
      } else if (error.message.includes('timeout')) {
        throw new Error('OpenAI API request timed out. Please try again.');
      } else {
        // Return the actual error for debugging
        throw new Error(`Receipt processing failed: ${error.message}`);
      }
    }
    
    throw new Error('Failed to process receipt image. Please try again or add items manually.');
  }
}

export async function deleteReceiptImage(imagePath: string): Promise<void> {
  try {
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  } catch (error) {
    console.error('Error deleting receipt image:', error);
    // Don't throw error for cleanup failures
  }
}