const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
import mongoose from 'mongoose';
import fs from 'fs';
import dbConnect from '../lib/mongodb';
import Product from '../models/ProductModel';
import { Collection } from '../models/CategoryModel';
import slugify from 'slug';

async function seed() {
  console.log('🌱 Seeding products from hardcoded files...');
  await dbConnect();

  const collectionsDir = path.join(process.cwd(), 'app/collections');
  const dirs = fs.readdirSync(collectionsDir).filter(f => fs.statSync(path.join(collectionsDir, f)).isDirectory());

  for (const dirName of dirs) {
    const filePath = path.join(collectionsDir, dirName, 'page.tsx');
    if (!fs.existsSync(filePath)) continue;

    console.log(`Processing ${dirName}...`);
    let content = fs.readFileSync(filePath, 'utf-8');

    // Find all potential images blocks
    const imagesBlocks = content.match(/images:\s*\[([\s\S]*?)\]/g);
    if (!imagesBlocks) {
      console.log(`No images array found in ${dirName}`);
      continue;
    }

    let items: Array<{ src: string; text: string }> = [];

    for (const block of imagesBlocks) {
      // Clean comments from the block
      const cleanBlock = block.replace(/\/\/.*$/gm, '');
      
      const itemRegex = /\{\s*src:\s*['"](.*?)['"]\s*,\s*text:\s*['"](.*?)['"]\s*,?\s*\}/g;
      let match;
      while ((match = itemRegex.exec(cleanBlock)) !== null) {
        items.push({ src: match[1], text: match[2] });
      }

      const altRegex = /\{\s*text:\s*['"](.*?)['"]\s*,\s*src:\s*['"](.*?)['"]\s*,?\s*\}/g;
      while ((match = altRegex.exec(cleanBlock)) !== null) {
        items.push({ src: match[2], text: match[1] });
      }
    }

    if (items.length === 0) {
      console.log(`No items found in ${dirName}`);
      continue;
    }

    if (items.length === 0) {
      console.log(`No items found in ${dirName}`);
      continue;
    }

    // Create or update Collection
    const collectionTitle = dirName.charAt(0).toUpperCase() + dirName.slice(1).replace(/-/g, ' ');
    const collectionHandle = slugify(collectionTitle, { lower: true, strict: true });

    // Extract description from the page
    const descMatch = content.match(/<p className=\{styles\.description\}>([\s\S]*?)<\/p>/);
    const collectionDescription = descMatch ? descMatch[1].trim().replace(/\s+/g, ' ') : '';

    let collection = await Collection.findOne({ handle: collectionHandle });
    if (!collection) {
      collection = new Collection({
        title: collectionTitle,
        handle: collectionHandle,
        description: collectionDescription,
        type: 'manual',
        status: 'active',
        productIds: []
      });
      await collection.save();
    } else if (collectionDescription && !collection.description) {
      collection.description = collectionDescription;
      await collection.save();
    }

    const createdProductIds: mongoose.Types.ObjectId[] = [];

    for (const item of items) {
      const productTitle = item.text;
      const productSlug = slugify(productTitle, { lower: true, strict: true }) + '-' + Math.random().toString(36).substring(2, 5);
      
      // Check if product already exists with this image
      let product = await Product.findOne({ 'variants.images': item.src });
      
      if (!product) {
        product = new Product({
          title: productTitle,
          slug: productSlug,
          description: `Exquisite ${productTitle} from our ${collectionTitle} collection.`,
          status: 'active',
          variants: [{
            sku: `VAR-${item.text.replace(/\s+/g, '-').toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
            price: 5000 + Math.floor(Math.random() * 5000), // Random placeholder price
            options: [{ name: 'size', value: 'standard' }],
            images: [item.src],
            isActive: true
          }],
          categories: []
        });
        await product.save();
      }
      
      createdProductIds.push(product._id);
    }

    // Assign products to collection
    collection.productIds = [...new Set([...collection.productIds.map(id => id.toString()), ...createdProductIds.map(id => id.toString())])].map(id => new mongoose.Types.ObjectId(id));
    await collection.save();
    
    console.log(`✅ Seeded ${items.length} products for collection ${collectionTitle}`);
  }

  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
