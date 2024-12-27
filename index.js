require('dotenv').config();
const express = require('express');
const Shopify = require('shopify-api-node');

const app = express();
const port = process.env.PORT || 3000;

const shopify = new Shopify({
  shopName: process.env.SHOP_NAME,
  accessToken: process.env.ACCESS_TOKEN,
  apiVersion: '2024-01'
});

async function updatePrices() {
  try {
    const products = await shopify.product.list({
      collection_id: process.env.SALE_COLLECTION_ID
    });

    for (const product of products) {
      const metafields = await shopify.metafield.list({
        metafield: {
          owner_id: product.id,
          owner_resource: 'product'
        }
      });

      const originalPrice = metafields.find(
        m => m.namespace === 'price_automation' && m.key === 'original_price'
      );

      if (originalPrice) {
        for (const variant of product.variants) {
          await shopify.productVariant.update(variant.id, {
            compare_at_price: originalPrice.value
          });
        }
      }
    }
  } catch (error) {
    console.error('Error updating prices:', error);
  }
}

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Price Automation Service Running');
});

// Trigger price update manually if needed
app.post('/update-prices', async (req, res) => {
  try {
    await updatePrices();
    res.send('Price update completed');
  } catch (error) {
    res.status(500).send('Error updating prices');
  }
});

// Run price update every hour
setInterval(updatePrices, 3600000);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
