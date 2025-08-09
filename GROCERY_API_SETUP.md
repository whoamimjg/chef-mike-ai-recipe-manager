# Grocery Store API Setup Guide

Your Chef Mike's app now supports **real grocery store pricing** from major retailers! Here's how to get authentic pricing data instead of mock data.

## Option 1: Kroger API (Recommended - FREE) ✅

**Coverage**: 2,700+ stores nationwide  
**Cost**: Free tier with 1000 calls/day  
**Setup Time**: 10 minutes  

### Steps to Get Real Kroger Pricing:

1. **Register**: Go to [developer.kroger.com](https://developer.kroger.com/)
2. **Create Account**: Sign up with your business email
3. **Complete Tutorial**: Kroger requires a quick knowledge check
4. **Create App**: 
   - App Name: "Chef Mike's Recipe App"
   - Description: "Recipe management with shopping list pricing"
   - Website: Your Replit app URL
5. **Get Credentials**: Copy your Client ID and Client Secret

### Add to Your App:
In your Replit secrets (🔒 icon in left sidebar), add:
- `KROGER_CLIENT_ID`: Your client ID from Kroger
- `KROGER_CLIENT_SECRET`: Your client secret from Kroger

**That's it!** Your app will automatically start showing real Kroger prices.

---

## Option 2: Target API (Requires Approval)

**Coverage**: 1,800+ Target stores  
**Cost**: Free for approved partners  
**Setup Time**: 2-4 weeks approval process  

### Steps:
1. Apply at [partners.target.com](https://partners.target.com/)
2. Provide business documentation
3. Wait for approval (typically 2-4 weeks)
4. Add `TARGET_API_KEY` to your secrets

---

## Option 3: Walmart (Limited Access)

**Status**: No public grocery API available  
**Alternative**: Walmart Marketplace API (sellers only)  

Walmart doesn't offer public grocery pricing APIs. You'd need to:
- Become a Walmart marketplace seller, OR
- Use third-party scraping services (not recommended)

---

## Option 4: Third-Party Aggregators

If you want **multiple stores** at once:

### Actowiz Solutions
- **Coverage**: Kroger, Walmart, Target, Safeway, Whole Foods
- **Cost**: $99-999/month based on usage
- **Setup**: Contact [actowizsolutions.com](https://actowizsolutions.com)

### FoodSpark
- **Coverage**: 50+ grocery chains
- **Cost**: $0.01-0.10 per API call
- **Setup**: Register at [foodspark.io](https://foodspark.io)

---

## How It Works in Your App

Once you add API keys, here's what happens:

1. **User clicks "Show Prices"** on shopping list
2. **App tries real APIs first** (Kroger, Target, etc.)
3. **Real pricing displays** with store names, sales, availability
4. **Fallback to mock data** only if APIs fail

### Example Real Data:
```
🏪 Kroger Store #123
🥛 Milk, 1 Gallon: $3.49 (was $3.99) ✅ In Stock 🏷️ ON SALE

🎯 Target Store #456  
🥛 Milk, 1 Gallon: $3.79 ✅ In Stock
```

---

## Recommended Setup

**For immediate results**: Start with Kroger API (free, fast approval)  
**For comprehensive pricing**: Add FoodSpark for multi-store comparison  
**For enterprise use**: Consider Actowiz Solutions for full coverage

The pricing system will automatically use real data when available and fall back to realistic mock data when needed.

Want me to help you set up any of these APIs?