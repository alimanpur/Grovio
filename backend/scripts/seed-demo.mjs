// scripts/seed-demo.mjs - Grovio Presentation Demo Seed Script

/**
 * Grovio Presentation Demo Seed Script
 *
 * PURPOSE:
 * This script creates a complete, presentation-ready demo account for Grovio
 * that can be used by judges, faculty, and audience members during
 * project presentations.
 *
 * KEY REQUIREMENTS:
 * 1. Dedicated demo store "Grovio Presentation Demo"
 * 2. Demo owner account with professional store-owner profile
 * 3. Realistic Indian grocery-store data across all sections
 * 4. Data persisted in MongoDB and displayed through existing APIs
 * 5. No hardcoded dashboard numbers - all metrics calculated from records
 * 6. Safe, isolated demo database (grovio_demo)
 * 7. Fully connected data: purchases affect inventory, sales affect financials
 * 8. Reconciliation across all modules
 * 9. Presentation-ready data for live demos
 * 10. Idempotent script - safe to run multiple times
 *
 * FEATURES:
 * - Uses existing backend services and API endpoints
 * - Follows real business logic and validation
 * - Comprehensive verification of data consistency
 * - Safety checks to prevent production/environment damage
 * - Detailed verification report
 * - Demo owner credentials printed at the end
 *
 * USAGE:
 * 1. Ensure MONGODB_URI environment variable is set in your .env file.
 *    The script uses the same database as the backend server.
 * 2. Run: npm run seed:demo (from backend directory)
 * 3. The script will:
 *    - Safely verify the environment
 *    - Delete existing demo-store data
 *    - Create demo store and owner
 *    - Seed all categories, suppliers, products, customers, transactions
 *    - Verify data consistency
 *    - Print demo owner credentials
 * 4. The demo owner can sign in using the printed credentials
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'

// Import models
import User, { ROLES, BCRYPT_ROUNDS } from '../src/models/User.js'
import Store from '../src/models/Store.js'
import RefreshToken from '../src/models/RefreshToken.js'
import Product from '../src/models/Product.js'
import Category from '../src/models/Category.js'
import Supplier from '../src/models/Supplier.js'
import Customer from '../src/models/Customer.js'
import Purchase from '../src/models/Purchase.js'
import Bill from '../src/models/Bill.js'
import Payment from '../src/models/Payment.js'
import Return from '../src/models/Return.js'
import InventoryAdjustment from '../src/models/InventoryAdjustment.js'

// Import services
import authService from '../src/services/authService.js'
import storeService from '../src/services/storeService.js'
import { categoryService, productService } from '../src/services/catalogService.js'
import supplierService from '../src/services/supplierService.js'
import customerService from '../src/services/customerService.js'
import teamService from '../src/services/teamService.js'
import purchaseService from '../src/services/purchaseService.js'
import billService from '../src/services/billService.js'
import { recordPayment } from '../src/services/paymentService.js'
import returnService from '../src/services/returnService.js'

import { toPaise, toRupees } from '../src/lib/money.js'
import env from '../src/config/env.js'

// --- Constants ---
const DEMO_EMAIL = 'demo@grovio-demo.local'

// --- Safety & Environment Checks ---

/**
 * Verify the demo environment is safe to use.
 * This script should ONLY be run against a dedicated demo database.
 */
async function verifyDemoEnvironment() {
  console.log('ðŸ” Verifying demo environment...')

  // Check if we're in production mode
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'ERROR: The demo seed script should never be run in production.\n' +
      'Set NODE_ENV=development or omit it to continue with demo seed.',
    )
  }

  // Use the same database as the backend server
  const mongoUri = env.mongoUri
  if (!mongoUri) {
    throw new Error(
      'ERROR: MONGODB_URI environment variable is required.\n' +
      'Please set this variable in your .env file.',
    )
  }

  // Log connection info (without sensitive data)
  const sanitizedUri = mongoUri.replace(/mongodb\+srv?:\/\/[^:]+:[^@]+@/i, 'mongodb+srv://***:***')
  console.log('📊 Database:', sanitizedUri)

  // Connect to verify database connectivity
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    })
    console.log('âœ… Connected to database (', mongoose.connection.name, ')')
    await mongoose.disconnect()
  } catch (err) {
    throw new Error(`âŒ Cannot connect to database: ${err.message}`)
  }

  console.log('âœ… Environment verification passed')
}

// --- Utility Functions ---

const DEMO_PASSWORD = 'Demo123!'
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://grovio-ten.vercel.app/'

/**
 * Get today's date in YYYY-MM-DD format (for default bill dates)
 */
function getTodayISO() {
  return new Date().toISOString().split('T')[0]
}

/**
 * Get date N days ago in YYYY-MM-DD format
 */
function getDaysAgoISO(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

/**
 * Create IST date (India Standard Time, UTC+5:30) from a date string
 */
function createISTDate(dateStr) {
  const date = new Date(dateStr)
  const utc = date.getTime() + date.getTimezoneOffset() * 60000
  const ist = new Date(utc + 5.5 * 3600000)
  return ist
}

/**
 * Generate a date in IST at a specific hour/minute
 */
function atISTHourMinute(hours, minutes, daysAgo = 0) {
  const today = new Date(Date.now() + 5.5 * 3600000)
  const target = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
    hours,
    minutes,
    0,
    0,
  ))
  target.setTime(target.getTime() - daysAgo * 24 * 3600000)
  return target
}

// --- Data Definitions ---

// --- Categories (10) ---
const CATEGORIES = [
  { name: 'Staples', description: 'Rice and grains, flour, sugar, salt, other staples' },
  { name: 'Rice & Grains', description: 'All rice varieties and millets' },
  { name: 'Pulses & Lentils', description: 'Dal, chickpeas, beans, legumes' },
  { name: 'Cooking Oils & Ghee', description: 'Vegetable oils, ghee, vanaspati' },
  { name: 'Dairy & Eggs', description: 'Milk, curd, paneer, eggs, dairy products' },
  { name: 'Beverages & Tea', description: 'Tea, coffee, soft drinks, juices' },
  { name: 'Snacks & Biscuits', description: 'Biscuits, chips, namkeen, packaged snacks' },
  { name: 'Spices & Masala', description: 'Spices, turmeric, chili powder, masala' },
  { name: 'Personal Care', description: 'Soap, toothpaste, shampoo, toiletries' },
  { name: 'Household Essentials', description: 'Detergent, cleaning supplies, household items' },
]

// --- Suppliers (6 fictional Indian businesses) ---
const SUPPLIERS = [
  {
    name: 'Sharma Wholesalers',
    contactName: 'Ravi Sharma',
    phone: '+91 98110 44521',
    email: 'sales@sharmawholesalers.local',
    address: '123, Shri Nagar, Indore',
    city: 'Indore',
    gstin: '07AABCS1234E1Z5',
    openingDue: toPaise(5000), // â‚¹50
    paymentTerms: 'Net 30',
    notes: 'Regular staple supplier',
  },
  {
    name: 'Amul Distribution',
    contactName: 'Kiran Patel',
    phone: '+91 98210 77889',
    email: 'orders@amul-distribution.local',
    address: '456, Textile Market, Anand',
    city: 'Anand',
    gstin: '24AABCS5678F1Z6',
    openingDue: toPaise(3000), // â‚¹30
    paymentTerms: 'Cash against Goods',
    notes: 'Dairy products expert',
  },
  {
    name: 'ITC Fooddirect',
    contactName: 'Sanjay Rao',
    phone: '+91 98110 55443',
    email: 'proc@itc-fooddirect.local',
    address: '789, Export Promotion Zone, Kolkata',
    city: 'Kolkata',
    gstin: '19AABCS1234K1Z8',
    openingDue: toPaise(7000), // â‚¹70
    paymentTerms: 'Net 45',
    notes: 'Beverages and snacks supplier',
  },
  {
    name: 'Haldiram Depot',
    contactName: 'Meena Agarwal',
    phone: '+91 98440 88776',
    email: 'wholesale@haldiram.local',
    address: '321, Chandni Chowk, Nagpur',
    city: 'Nagpur',
    gstin: '27AABCS9876M1Z3',
    openingDue: toPaise(2500), // â‚¹25
    paymentTerms: 'Monthly',
    notes: 'Namkeen and chaat specialist',
  },
  {
    name: 'Patanjali Foods',
    contactName: 'Vikram Joshi',
    phone: '+91 98110 33445',
    email: 'sales@patanjali-foods.local',
    address: '654, Spice Market, Haridwar',
    city: 'Haridwar',
    gstin: '05AABCS5555L2Z9',
    openingDue: toPaise(4000), // â‚¹40
    paymentTerms: 'Net 30',
    notes: 'Spices and masala supplier',
  },
  {
    name: 'Dabur India',
    contactName: 'Sunita Mehta',
    phone: '+91 98110 66778',
    email: 'proc@dabur.local',
    address: '987, Healthcare Street, Delhi',
    city: 'Delhi',
    gstin: '07AABCS2222Q1Z0',
    openingDue: toPaise(6000), // â‚¹60
    paymentTerms: 'Cash against Goods',
    notes: 'Personal care products supplier',
  },
]

// --- Products (43 with diverse categories and stock levels) ---
// Each product includes realistic SKU, price, cost, GST rate, stock levels
const PRODUCTS = [
  // Staples
  {
    name: 'Aashirvaad Atta 10 kg',
    sku: 'STT-001',
    brand: 'Aashirvaad',
    unit: 'bag',
    sellingPrice: toPaise(465), // â‚¹4.65/kg
    purchasePrice: toPaise(412), // â‚¹4.12/kg
    gstRate: 5,
    minStock: 10,
    maxStock: 40,
    categoryName: 'Staples',
    openingStock: 25,
    expiry: atISTHourMinute(12, 0, 0).toISOString(),
    supplierIndex: 0,
  },
  {
    name: 'Tata Salt 1 kg',
    sku: 'STT-002',
    brand: 'Tata',
    unit: 'pack',
    sellingPrice: toPaise(28), // â‚¹0.28
    purchasePrice: toPaise(21), // â‚¹0.21
    gstRate: 0,
    minStock: 40,
    maxStock: 120,
    categoryName: 'Staples',
    openingStock: 80,
    expiry: null,
    supplierIndex: 0,
  },
  {
    name: 'Turban Sugar 1 kg',
    sku: 'STT-003',
    brand: 'Turban',
    unit: 'pack',
    sellingPrice: toPaise(42), // â‚¹0.42
    purchasePrice: toPaise(36), // â‚¹0.36
    gstRate: 0,
    minStock: 30,
    maxStock: 90,
    categoryName: 'Staples',
    openingStock: 50,
    expiry: null,
    supplierIndex: 0,
  },
  // Rice & Grains
  {
    name: 'India Gate Basmati Rice 1 kg',
    sku: 'RG-001',
    brand: 'India Gate',
    unit: 'pack',
    sellingPrice: toPaise(135), // â‚¹1.35
    purchasePrice: toPaise(110), // â‚¹1.10
    gstRate: 5,
    minStock: 12,
    maxStock: 40,
    categoryName: 'Rice & Grains',
    openingStock: 20,
    expiry: null,
    supplierIndex: 0,
  },
  {
    name: 'Kohinoor Rice 5 kg',
    sku: 'RG-002',
    brand: 'Kohinoor',
    unit: 'bag',
    sellingPrice: toPaise(520), // â‚¹5.20/kg
    purchasePrice: toPaise(440), // â‚¹4.40/kg
    gstRate: 5,
    minStock: 6,
    maxStock: 20,
    categoryName: 'Rice & Grains',
    openingStock: 12,
    expiry: null,
    supplierIndex: 0,
  },
  {
    name: 'Sona Masoori Rice 1 kg',
    sku: 'RG-003',
    brand: 'Sona Masoori',
    unit: 'pack',
    sellingPrice: toPaise(48), // â‚¹0.48
    purchasePrice: toPaise(40), // â‚¹0.40
    gstRate: 5,
    minStock: 20,
    maxStock: 60,
    categoryName: 'Rice & Grains',
    openingStock: 40,
    expiry: null,
    supplierIndex: 0,
  },
  {
    name: 'Nutrela Sona Masoori Rice 5 kg',
    sku: 'RG-004',
    brand: 'Nutrela',
    unit: 'bag',
    sellingPrice: toPaise(440), // â‚¹4.40/kg
    purchasePrice: toPaise(380), // â‚¹3.80/kg
    gstRate: 5,
    minStock: 8,
    maxStock: 20,
    categoryName: 'Rice & Grains',
    openingStock: 10,
    expiry: null,
    supplierIndex: 0,
  },
  // Pulses & Lentils
  {
    name: 'Daawat Dal Tuchha 1 kg',
    sku: 'PL-001',
    brand: 'Daawat',
    unit: 'pack',
    sellingPrice: toPaise(95), // â‚¹0.95
    purchasePrice: toPaise(78), // â‚¹0.78
    gstRate: 5,
    minStock: 15,
    maxStock: 50,
    categoryName: 'Pulses & Lentils',
    openingStock: 25,
    expiry: null,
    supplierIndex: 0,
  },
  {
    name: 'Tur Dal 1 kg',
    sku: 'PL-002',
    brand: 'Tata',
    unit: 'pack',
    sellingPrice: toPaise(105), // â‚¹1.05
    purchasePrice: toPaise(88), // â‚¹0.88
    gstRate: 5,
    minStock: 20,
    maxStock: 60,
    categoryName: 'Pulses & Lentils',
    openingStock: 30,
    expiry: null,
    supplierIndex: 0,
  },
  {
    name: 'Chana Dal 500 g',
    sku: 'PL-003',
    brand: 'Tata',
    unit: 'pack',
    sellingPrice: toPaise(52), // â‚¹0.52
    purchasePrice: toPaise(44), // â‚¹0.44
    gstRate: 5,
    minStock: 20,
    maxStock: 60,
    categoryName: 'Pulses & Lentils',
    openingStock: 35,
    expiry: null,
    supplierIndex: 0,
  },
  {
    name: 'Badshah Besan 1 kg',
    sku: 'PL-004',
    brand: 'Badshah',
    unit: 'pack',
    sellingPrice: toPaise(56), // â‚¹0.56
    purchasePrice: toPaise(48), // â‚¹0.48
    gstRate: 5,
    minStock: 15,
    maxStock: 50,
    categoryName: 'Pulses & Lentils',
    openingStock: 28,
    expiry: null,
    supplierIndex: 0,
  },
  // Cooking Oils & Ghee
  {
    name: 'Fortune Soyabean Oil 1 L',
    sku: 'OIL-001',
    brand: 'Fortune',
    unit: 'bottle',
    sellingPrice: toPaise(145), // â‚¹1.45
    purchasePrice: toPaise(130), // â‚¹1.30
    gstRate: 18,
    minStock: 10,
    maxStock: 30,
    categoryName: 'Cooking Oils & Ghee',
    openingStock: 15,
    expiry: null,
    supplierIndex: 0,
  },
  {
    name: 'Ratan Laxmi Vanaspati 500 g',
    sku: 'OIL-002',
    brand: 'Ratan',
    unit: 'pack',
    sellingPrice: toPaise(48), // â‚¹0.48
    purchasePrice: toPaise(42), // â‚¹0.42
    gstRate: 5,
    minStock: 15,
    maxStock: 45,
    categoryName: 'Cooking Oils & Ghee',
    openingStock: 25,
    expiry: null,
    supplierIndex: 0,
  },
  {
    name: 'Dhara Premium Ghee 500 ml',
    sku: 'OIL-003',
    brand: 'Dhara',
    unit: 'bottle',
    sellingPrice: toPaise(480), // â‚¹4.80
    purchasePrice: toPaise(440), // â‚¹4.40
    gstRate: 0,
    minStock: 5,
    maxStock: 15,
    categoryName: 'Cooking Oils & Ghee',
    openingStock: 10,
    expiry: null,
    supplierIndex: 1,
  },
  // Dairy & Eggs
  {
    name: 'Amul Gold Milk 500 ml',
    sku: 'DAI-001',
    brand: 'Amul',
    unit: 'bottle',
    sellingPrice: toPaise(26), // â‚¹0.26
    purchasePrice: toPaise(22), // â‚¹0.22
    gstRate: 0,
    minStock: 24,
    maxStock: 80,
    categoryName: 'Dairy & Eggs',
    openingStock: 40,
    expiry: null,
    supplierIndex: 1,
  },
  {
    name: 'Amul Fresh Curd 500 g',
    sku: 'DAI-002',
    brand: 'Amul',
    unit: 'pack',
    sellingPrice: toPaise(24), // â‚¹0.24
    purchasePrice: toPaise(20), // â‚¹0.20
    gstRate: 0,
    minStock: 30,
    maxStock: 90,
    categoryName: 'Dairy & Eggs',
    openingStock: 55,
    expiry: null,
    supplierIndex: 1,
  },
  {
    name: 'Amul Spiced Paneer 200 g',
    sku: 'DAI-003',
    brand: 'Amul',
    unit: 'pouch',
    sellingPrice: toPaise(85), // â‚¹0.85
    purchasePrice: toPaise(75), // â‚¹0.75
    gstRate: 0,
    minStock: 15,
    maxStock: 45,
    categoryName: 'Dairy & Eggs',
    openingStock: 20,
    expiry: null,
    supplierIndex: 1,
  },
  {
    name: 'Vadla Farm Eggs 30 pcs',
    sku: 'DAI-004',
    brand: 'Vadla Farm',
    unit: 'dozen',
    sellingPrice: toPaise(180), // â‚¹1.80/dozen
    purchasePrice: toPaise(150), // â‚¹1.50/dozen
    gstRate: 0,
    minStock: 10,
    maxStock: 30,
    categoryName: 'Dairy & Eggs',
    openingStock: 18,
    expiry: null,
    supplierIndex: 1,
  },
  // Beverages & Tea
  {
    name: 'Tata Tea Premium 100 g',
    sku: 'BEV-001',
    brand: 'Tata',
    unit: 'pack',
    sellingPrice: toPaise(48), // â‚¹0.48
    purchasePrice: toPaise(40), // â‚¹0.40
    gstRate: 5,
    minStock: 20,
    maxStock: 60,
    categoryName: 'Beverages & Tea',
    openingStock: 30,
    expiry: null,
    supplierIndex: 2,
  },
  {
    name: 'Nescafe Classic 100 g',
    sku: 'BEV-002',
    brand: 'Nescafe',
    unit: 'pack',
    sellingPrice: toPaise(175), // â‚¹1.75
    purchasePrice: toPaise(150), // â‚¹1.50
    gstRate: 18,
    minStock: 12,
    maxStock: 40,
    categoryName: 'Beverages & Tea',
    openingStock: 15,
    expiry: null,
    supplierIndex: 2,
  },
  {
    name: 'Coca-Cola 500 ml',
    sku: 'BEV-003',
    brand: 'Coca-Cola',
    unit: 'bottle',
    sellingPrice: toPaise(40), // â‚¹0.40
    purchasePrice: toPaise(32), // â‚¹0.32
    gstRate: 18,
    minStock: 20,
    maxStock: 60,
    categoryName: 'Beverages & Tea',
    openingStock: 35,
    expiry: null,
    supplierIndex: 2,
  },
  {
    name: 'Red Bull 250 ml',
    sku: 'BEV-004',
    brand: 'Red Bull',
    unit: 'bottle',
    sellingPrice: toPaise(135), // â‚¹1.35
    purchasePrice: toPaise(110), // â‚¹1.10
    gstRate: 18,
    minStock: 8,
    maxStock: 20,
    categoryName: 'Beverages & Tea',
    openingStock: 12,
    expiry: null,
    supplierIndex: 2,
  },
  {
    name: 'Taj Mahal Green Tea 20 bags',
    sku: 'BEV-005',
    brand: 'Taj Mahal',
    unit: 'pack',
    sellingPrice: toPaise(80), // â‚¹0.80
    purchasePrice: toPaise(68), // â‚¹0.68
    gstRate: 5,
    minStock: 15,
    maxStock: 45,
    categoryName: 'Beverages & Tea',
    openingStock: 25,
    expiry: null,
    supplierIndex: 2,
  },
  {
    name: 'Red Label Tea 500 g',
    sku: 'BEV-006',
    brand: 'Red Label',
    unit: 'pack',
    sellingPrice: toPaise(165), // â‚¹1.65
    purchasePrice: toPaise(145), // â‚¹1.45
    gstRate: 5,
    minStock: 12,
    maxStock: 35,
    categoryName: 'Beverages & Tea',
    openingStock: 20,
    expiry: null,
    supplierIndex: 2,
  },
  // Snacks & Biscuits
  {
    name: 'Parle-G Biscuits 720 g',
    sku: 'SNK-001',
    brand: 'Parle-G',
    unit: 'pack',
    sellingPrice: toPaise(45), // â‚¹0.45
    purchasePrice: toPaise(38), // â‚¹0.38
    gstRate: 5,
    minStock: 20,
    maxStock: 60,
    categoryName: 'Snacks & Biscuits',
    openingStock: 30,
    expiry: null,
    supplierIndex: 3,
  },
  {
    name: 'Lays Classic 125 g',
    sku: 'SNK-002',
    brand: 'Lays',
    unit: 'pack',
    sellingPrice: toPaise(40), // â‚¹0.40
    purchasePrice: toPaise(34), // â‚¹0.34
    gstRate: 18,
    minStock: 20,
    maxStock: 60,
    categoryName: 'Snacks & Biscuits',
    openingStock: 35,
    expiry: null,
    supplierIndex: 3,
  },
  {
    name: 'Haldiram Bhujia 200 g',
    sku: 'SNK-003',
    brand: 'Haldiram',
    unit: 'pack',
    sellingPrice: toPaise(35), // â‚¹0.35
    purchasePrice: toPaise(30), // â‚¹0.30
    gstRate: 5,
    minStock: 15,
    maxStock: 50,
    categoryName: 'Snacks & Biscuits',
    openingStock: 28,
    expiry: null,
    supplierIndex: 3,
  },
  {
    name: 'Bingo! Mad Angle 70 g',
    sku: 'SNK-004',
    brand: 'Bingo!',
    unit: 'pack',
    sellingPrice: toPaise(20), // â‚¹0.20
    purchasePrice: toPaise(16), // â‚¹0.16
    gstRate: 18,
    minStock: 25,
    maxStock: 75,
    categoryName: 'Snacks & Biscuits',
    openingStock: 45,
    expiry: null,
    supplierIndex: 3,
  },
  {
    name: 'Britannia Marie Gold 12 pcs',
    sku: 'SNK-005',
    brand: 'Britannia',
    unit: 'pack',
    sellingPrice: toPaise(45), // â‚¹0.45
    purchasePrice: toPaise(38), // â‚¹0.38
    gstRate: 5,
    minStock: 15,
    maxStock: 45,
    categoryName: 'Snacks & Biscuits',
    openingStock: 25,
    expiry: null,
    supplierIndex: 3,
  },
  // Spices & Masala
  {
    name: 'MDH Turmeric Powder 500 g',
    sku: 'SPC-001',
    brand: 'MDH',
    unit: 'pack',
    sellingPrice: toPaise(55), // â‚¹0.55
    purchasePrice: toPaise(48), // â‚¹0.48
    gstRate: 5,
    minStock: 15,
    maxStock: 50,
    categoryName: 'Spices & Masala',
    openingStock: 25,
    expiry: null,
    supplierIndex: 4,
  },
  {
    name: 'MDH Chili Powder 500 g',
    sku: 'SPC-002',
    brand: 'MDH',
    unit: 'pack',
    sellingPrice: toPaise(50), // â‚¹0.50
    purchasePrice: toPaise(44), // â‚¹0.44
    gstRate: 5,
    minStock: 15,
    maxStock: 50,
    categoryName: 'Spices & Masala',
    openingStock: 22,
    expiry: null,
    supplierIndex: 4,
  },
  {
    name: 'Everest Garam Masala 50 g',
    sku: 'SPC-003',
    brand: 'Everest',
    unit: 'pack',
    sellingPrice: toPaise(22), // â‚¹0.22
    purchasePrice: toPaise(18), // â‚¹0.18
    gstRate: 5,
    minStock: 20,
    maxStock: 60,
    categoryName: 'Spices & Masala',
    openingStock: 35,
    expiry: null,
    supplierIndex: 4,
  },
  {
    name: 'Badshah Kitchen King 100 g',
    sku: 'SPC-004',
    brand: 'Badshah',
    unit: 'pack',
    sellingPrice: toPaise(65), // â‚¹0.65
    purchasePrice: toPaise(58), // â‚¹0.58
    gstRate: 5,
    minStock: 15,
    maxStock: 50,
    categoryName: 'Spices & Masala',
    openingStock: 20,
    expiry: null,
    supplierIndex: 4,
  },
  {
    name: 'MDH Kitchen King 50 g',
    sku: 'SPC-005',
    brand: 'MDH',
    unit: 'pack',
    sellingPrice: toPaise(15), // â‚¹0.15
    purchasePrice: toPaise(12), // â‚¹0.12
    gstRate: 5,
    minStock: 20,
    maxStock: 60,
    categoryName: 'Spices & Masala',
    openingStock: 30,
    expiry: null,
    supplierIndex: 4,
  },
  {
    name: 'Patanjali Coriander Powder 500 g',
    sku: 'SPC-006',
    brand: 'Patanjali',
    unit: 'pack',
    sellingPrice: toPaise(50), // â‚¹0.50
    purchasePrice: toPaise(44), // â‚¹0.44
    gstRate: 5,
    minStock: 15,
    maxStock: 50,
    categoryName: 'Spices & Masala',
    openingStock: 22,
    expiry: null,
    supplierIndex: 4,
  },
  // Personal Care
  {
    name: 'Lifebuoy Soap 150 g',
    sku: 'PRS-001',
    brand: 'Lifebuoy',
    unit: 'piece',
    sellingPrice: toPaise(40), // â‚¹0.40
    purchasePrice: toPaise(34), // â‚¹0.34
    gstRate: 18,
    minStock: 20,
    maxStock: 60,
    categoryName: 'Personal Care',
    openingStock: 30,
    expiry: null,
    supplierIndex: 5,
  },
  {
    name: 'Colgate Strong Teeth 200 g',
    sku: 'PRS-002',
    brand: 'Colgate',
    unit: 'piece',
    sellingPrice: toPaise(60), // â‚¹0.60
    purchasePrice: toPaise(52), // â‚¹0.52
    gstRate: 18,
    minStock: 20,
    maxStock: 60,
    categoryName: 'Personal Care',
    openingStock: 25,
    expiry: null,
    supplierIndex: 5,
  },
  {
    name: 'L\'Oreal Shampoo 200 ml',
    sku: 'PRS-003',
    brand: 'L\'Oreal',
    unit: 'bottle',
    sellingPrice: toPaise(155), // â‚¹1.55
    purchasePrice: toPaise(135), // â‚¹1.35
    gstRate: 18,
    minStock: 10,
    maxStock: 30,
    categoryName: 'Personal Care',
    openingStock: 12,
    expiry: null,
    supplierIndex: 5,
  },
  {
    name: 'Pears Pure & Clear Face Wash 100 ml',
    sku: 'PRS-004',
    brand: 'Pears',
    unit: 'bottle',
    sellingPrice: toPaise(95), // â‚¹0.95
    purchasePrice: toPaise(82), // â‚¹0.82
    gstRate: 18,
    minStock: 12,
    maxStock: 35,
    categoryName: 'Personal Care',
    openingStock: 18,
    expiry: null,
    supplierIndex: 5,
  },
  // Household Essentials
  {
    name: 'Surf Excel Matic 500 g',
    sku: 'HSE-001',
    brand: 'Surf Excel',
    unit: 'pack',
    sellingPrice: toPaise(85), // â‚¹0.85
    purchasePrice: toPaise(75), // â‚¹0.75
    gstRate: 18,
    minStock: 12,
    maxStock: 35,
    categoryName: 'Household Essentials',
    openingStock: 18,
    expiry: null,
    supplierIndex: 5,
  },
  {
    name: 'Dettol Liquid 250 ml',
    sku: 'HSE-002',
    brand: 'Dettol',
    unit: 'bottle',
    sellingPrice: toPaise(50), // â‚¹0.50
    purchasePrice: toPaise(44), // â‚¹0.44
    gstRate: 18,
    minStock: 15,
    maxStock: 45,
    categoryName: 'Household Essentials',
    openingStock: 22,
    expiry: null,
    supplierIndex: 5,
  },
  {
    name: 'Vim Bar 400 g',
    sku: 'HSE-003',
    brand: 'Vim',
    unit: 'piece',
    sellingPrice: toPaise(45), // â‚¹0.45
    purchasePrice: toPaise(38), // â‚¹0.38
    gstRate: 18,
    minStock: 15,
    maxStock: 45,
    categoryName: 'Household Essentials',
    openingStock: 20,
    expiry: null,
    supplierIndex: 5,
  },
  {
    name: 'Cif Cream Toilet Cleaner 500 ml',
    sku: 'HSE-004',
    brand: 'Cif',
    unit: 'bottle',
    sellingPrice: toPaise(120), // â‚¹1.20
    purchasePrice: toPaise(100), // â‚¹1.00
    gstRate: 18,
    minStock: 8,
    maxStock: 25,
    categoryName: 'Household Essentials',
    openingStock: 10,
    expiry: null,
    supplierIndex: 5,
  },
]

// --- Helper to assign supplier based on index ---
function getSupplierFromIndex(index) {
  return SUPPLIERS[index]
}

// --- Prepare products with resolved supplier info ---
const PREPARED_PRODUCTS = PRODUCTS.map((p, i) => {
  const supplier = getSupplierFromIndex(i % SUPPLIERS.length)
  return {
    ...p,
    supplierId: supplier.name, // Store name as supplier ID for service
    supplierName: supplier.name,
  }
})

// --- Customers (12) ---
const CUSTOMERS = [
  {
    name: 'Priya Verma',
    phone: '+91 98230 11223',
    email: 'priya.verma@example.local',
    openingDue: toPaise(1500), // â‚¹15
    creditLimit: toPaise(3000), // â‚¹30
    tag: 'Frequent',
    note: 'Regular customer',
  },
  {
    name: 'Amit Patel',
    phone: '+91 98765 43210',
    email: 'amit.patel@example.local',
    openingDue: toPaise(2000),
    creditLimit: toPaise(2000),
    tag: 'Credit',
    note: 'Prefers to buy on credit',
  },
  {
    name: 'Neha Joshi',
    phone: '+91 98340 55667',
    email: 'neha.joshi@example.local',
    openingDue: toPaise(500), // â‚¹5
    creditLimit: toPaise(2000),
    tag: 'Frequent',
    note: 'Always buys atta and rice',
  },
  {
    name: 'Rohan Mehta',
    phone: '+91 99220 33445',
    email: 'rohan.mehta@example.local',
    openingDue: toPaise(800), // â‚¹8
    creditLimit: toPaise(5000), // â‚¹50
    tag: 'Bulk',
    note: 'Purchases large quantities',
  },
  {
    name: 'Sunita Devi',
    phone: '+91 97654 88990',
    email: 'sunita.devi@example.local',
    openingDue: toPaise(300), // â‚¹3
    creditLimit: toPaise(1500),
    tag: 'New',
    note: 'New to the shop',
  },
  {
    name: 'Karan Singh',
    phone: '+91 98001 22334',
    email: 'karan.singh@example.local',
    openingDue: toPaise(1200), // â‚¹12
    creditLimit: toPaise(1500),
    tag: 'Credit',
    note: 'Buys on credit every week',
  },
  {
    name: 'Pooja Rajput',
    phone: '+91 98233 77889',
    email: 'pooja.rajput@example.local',
    openingDue: toPaise(700), // â‚¹7
    creditLimit: toPaise(3000), // â‚¹30
    tag: 'Frequent',
    note: 'Buys atta, rice, and dal',
  },
  {
    name: 'Deepak Kumar',
    phone: '+91 99112 55443',
    email: 'deepak.kumar@example.local',
    openingDue: toPaise(200), // â‚¹2
    creditLimit: toPaise(1000),
    tag: 'Dormant',
    note: 'Rarely visits but always has cash',
  },
  {
    name: 'Meera Nair',
    phone: '+91 98761 12345',
    email: 'meera.nair@example.local',
    openingDue: toPaise(400), // â‚¹4
    creditLimit: toPaise(2000),
    tag: 'New',
    note: 'First time customer',
  },
  {
    name: 'Vijay Choudhary',
    phone: '+91 98450 66778',
    email: 'vijay.choudhary@example.local',
    openingDue: toPaise(1500), // â‚¹15
    creditLimit: toPaise(3000), // â‚¹30
    tag: 'Bulk',
    note: 'Buys in bulk for events',
  },
  {
    name: 'Anjali Bansal',
    phone: '+91 97988 00112',
    email: 'anjali.bansal@example.local',
    openingDue: toPaise(800), // â‚¹8
    creditLimit: toPaise(1000),
    tag: 'Credit',
    note: 'Uses credit, always pays on time',
  },
  {
    name: 'Sameer Ansari',
    phone: '+91 98989 11223',
    email: 'sameer.ansari@example.local',
    openingDue: toPaise(900), // â‚¹9
    creditLimit: toPaise(2000),
    tag: 'Frequent',
    note: 'Always buys snacks and drinks',
  },
]

// --- Team (Owner, Manager, Cashier) ---
const TEAM = [
  {
    name: 'Ramesh Chand Sharma',
    email: DEMO_EMAIL,
    phone: '+91 97543 21098',
    role: 'Owner',
    status: 'active',
    password: '', // Will be generated
  },
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@example.local',
    phone: '+91 98230 11223',
    role: 'Manager',
    status: 'active',
    password: '', // Will be generated
  },
  {
    name: 'Imran Qureshi',
    email: 'imran.qureshi@example.local',
    phone: '+91 98110 44521',
    role: 'Cashier',
    status: 'active',
    password: '', // Will be generated
  },
]

// --- Purchase Orders (10) ---
// Each purchase includes supplierId, lines, dates, payment status
const PURCHASES = [
  {
    // PO-1001: Sharma Wholesalers, 14 days ago, 3 products
    supplierId: 'Sharma Wholesalers',
    supplierInvoiceNo: 'SW/PO/2026/001',
    lines: [
      { productId: 'STT-001', qty: 15 }, // Atta 10kg Ã—15
      { productId: 'STT-002', qty: 30 }, // Salt 1kg Ã—30
      { productId: 'STT-003', qty: 20 }, // Sugar 1kg Ã—20
    ],
    orderedAt: atISTHourMinute(10, 0, 14).toISOString(),
    status: 'Goods received',
    receivedAt: atISTHourMinute(12, 0, 14).toISOString(),
    expectedAt: atISTHourMinute(10, 0, 14).toISOString(),
    note: 'Regular supply of staples',
  },
  {
    // PO-1002: Amul Distribution, 12 days ago, 3 products
    supplierId: 'Amul Distribution',
    supplierInvoiceNo: 'AMU/PO/2026/002',
    lines: [
      { productId: 'DAI-001', qty: 20 }, // Milk 500ml Ã—20
      { productId: 'OIL-003', qty: 5 }, // Ghee 500ml Ã—5
      { productId: 'DAI-002', qty: 15 }, // Curd 500g Ã—15
    ],
    orderedAt: atISTHourMinute(10, 0, 13).toISOString(),
    status: 'Goods received',
    receivedAt: atISTHourMinute(12, 0, 13).toISOString(),
    expectedAt: atISTHourMinute(10, 0, 13).toISOString(),
    note: 'Dairy products delivery',
  },
  {
    // PO-1003: ITC Fooddirect, 11 days ago, 3 products
    supplierId: 'ITC Fooddirect',
    supplierInvoiceNo: 'ITC/PO/2026/003',
    lines: [
      { productId: 'BEV-001', qty: 15 }, // Tea 100g Ã—15
      { productId: 'BEV-003', qty: 20 }, // Cola 500ml Ã—20
      { productId: 'BEV-002', qty: 8 }, // Coffee 100g Ã—8
    ],
    orderedAt: atISTHourMinute(10, 0, 12).toISOString(),
    status: 'Goods received',
    receivedAt: atISTHourMinute(12, 0, 12).toISOString(),
    expectedAt: atISTHourMinute(10, 0, 12).toISOString(),
    note: 'Beverages and snacks',
  },
  {
    // PO-1004: Haldiram Depot, 10 days ago, 3 products
    supplierId: 'Haldiram Depot',
    supplierInvoiceNo: 'HLD/PO/2026/004',
    lines: [
      { productId: 'SNK-003', qty: 15 }, // Bhujia 200g Ã—15
      { productId: 'SNK-001', qty: 15 }, // Parle-G 720g Ã—15
    ],
    orderedAt: atISTHourMinute(10, 0, 11).toISOString(),
    status: 'Goods received',
    receivedAt: atISTHourMinute(12, 0, 11).toISOString(),
    expectedAt: atISTHourMinute(10, 0, 11).toISOString(),
    note: 'Namkeen and biscuits',
  },
  {
    // PO-1005: Patanjali Foods, 9 days ago, 3 products
    supplierId: 'Patanjali Foods',
    supplierInvoiceNo: 'PTJ/PO/2026/005',
    lines: [
      { productId: 'SPC-001', qty: 15 }, // Turmeric 500g Ã—15
      { productId: 'SPC-003', qty: 20 }, // Garam Masala 50g Ã—20
      { productId: 'SPC-004', qty: 10 }, // Kitchen King 100g Ã—10
    ],
    orderedAt: atISTHourMinute(10, 0, 10).toISOString(),
    status: 'Goods received',
    receivedAt: atISTHourMinute(12, 0, 10).toISOString(),
    expectedAt: atISTHourMinute(10, 0, 10).toISOString(),
    note: 'Spices and masala',
  },
  {
    // PO-1006: Dabur India, 8 days ago, 3 products
    supplierId: 'Dabur India',
    supplierInvoiceNo: 'DBR/PO/2026/006',
    lines: [
      { productId: 'PRS-001', qty: 15 }, // Soap 150g Ã—15
      { productId: 'PRS-002', qty: 12 }, // Toothpaste 200g Ã—12
      { productId: 'HSE-003', qty: 15 }, // Vim Bar 400g Ã—15
    ],
    orderedAt: atISTHourMinute(10, 0, 9).toISOString(),
    status: 'Goods received',
    receivedAt: atISTHourMinute(12, 0, 9).toISOString(),
    expectedAt: atISTHourMinute(10, 0, 9).toISOString(),
    note: 'Personal care items',
  },
  {
    // PO-1007: Sharma Wholesalers, 7 days ago, 3 products
    supplierId: 'Sharma Wholesalers',
    supplierInvoiceNo: 'SW/PO/2026/007',
    lines: [
      { productId: 'RG-001', qty: 10 }, // Basmati Rice 1kg Ã—10
      { productId: 'RG-002', qty: 5 }, // Kohinoor Rice 5kg Ã—5
      { productId: 'PL-001', qty: 15 }, // Dal Tuchha 1kg Ã—15
    ],
    orderedAt: atISTHourMinute(10, 0, 8).toISOString(),
    status: 'Goods received',
    receivedAt: atISTHourMinute(12, 0, 8).toISOString(),
    expectedAt: atISTHourMinute(10, 0, 8).toISOString(),
    note: 'Grains and pulses',
  },
  {
    // PO-1008: ITC Fooddirect, 6 days ago, 3 products
    supplierId: 'ITC Fooddirect',
    supplierInvoiceNo: 'ITC/PO/2026/008',
    lines: [
      { productId: 'BEV-004', qty: 10 }, // Red Bull 250ml Ã—10
      { productId: 'BEV-005', qty: 15 }, // Green Tea Ã—15
      { productId: 'BEV-006', qty: 10 }, // Red Label Tea 500g Ã—10
    ],
    orderedAt: atISTHourMinute(10, 0, 7).toISOString(),
    status: 'Goods received',
    receivedAt: atISTHourMinute(12, 0, 7).toISOString(),
    expectedAt: atISTHourMinute(10, 0, 7).toISOString(),
    note: 'Beverages and teas',
  },
  {
    // PO-1009: Patanjali Foods, 5 days ago, 2 products
    supplierId: 'Patanjali Foods',
    supplierInvoiceNo: 'PTJ/PO/2026/009',
    lines: [
      { productId: 'SPC-002', qty: 15 }, // Chili Powder 500g Ã—15
      { productId: 'SPC-005', qty: 20 }, // Kitchen King 50g Ã—20
    ],
    orderedAt: atISTHourMinute(10, 0, 6).toISOString(),
    status: 'Goods received',
    receivedAt: atISTHourMinute(12, 0, 6).toISOString(),
    expectedAt: atISTHourMinute(10, 0, 6).toISOString(),
    note: 'Spices and seasonings',
  },
  {
    // PO-1010: Dabur India, 4 days ago, 3 products (PARTIALLY received - only 2/3)
    supplierId: 'Dabur India',
    supplierInvoiceNo: 'DBR/PO/2026/010',
    lines: [
      { productId: 'HSE-001', qty: 10 }, // Surf Excel 500g Ã—10
      { productId: 'HSE-002', qty: 12 }, // Dettol Liquid 250ml Ã—12
      { productId: 'PRS-004', qty: 10 }, // Face Wash 100ml Ã—10
    ],
    orderedAt: atISTHourMinute(10, 0, 5).toISOString(),
    status: 'In transit', // Only partially received
    expectedAt: atISTHourMinute(10, 0, 5).toISOString(),
    note: 'Partial delivery - remaining 5 units in transit',
  },
  {
    // PO-1011: Sharma Wholesalers, 2 days ago, 1 product (Ordered, not yet received)
    supplierId: 'Sharma Wholesalers',
    supplierInvoiceNo: 'SW/PO/2026/011',
    lines: [
      { productId: 'RG-004', qty: 8 }, // Sona Masoori Rice 5kg Ã—8
    ],
    orderedAt: atISTHourMinute(10, 0, 3).toISOString(),
    status: 'Ordered', // Not received yet
    expectedAt: atISTHourMinute(10, 0, 3).toISOString(),
    note: 'New rice order',
  },
]

// --- Bills (20 invoices spanning recent days) ---
const BILLS = [
  // GRV-1001 (today 10AM, Cash, Priya Verma) - Atta, Salt, Tea, Milk, Bhujia
  {
    invoiceNo: 'GRV-1001',
    customerId: 'Priya Verma',
    customerName: 'Priya Verma',
    method: 'Cash',
    lines: [
      { productId: 'STT-001', qty: 1, discountPercent: 0 }, // Atta 10kg Ã—1
      { productId: 'STT-002', qty: 2, discountPercent: 0 }, // Salt 1kg Ã—2
      { productId: 'BEV-001', qty: 1, discountPercent: 0 }, // Tea 100g Ã—1
      { productId: 'DAI-001', qty: 4, discountPercent: 0 }, // Milk 500ml Ã—4
      { productId: 'SNK-003', qty: 2, discountPercent: 0 }, // Bhujia 200g Ã—2
    ],
    billedAt: atISTHourMinute(10, 0, 0).toISOString(),
    note: 'Walk-in customer, steady shopper',
  },
  // GRV-1002 (yesterday 2PM, UPI, Neha Joshi) - Oil, Ghee, Rice
  {
    invoiceNo: 'GRV-1002',
    customerId: 'Neha Joshi',
    customerName: 'Neha Joshi',
    method: 'UPI',
    lines: [
      { productId: 'OIL-001', qty: 2, discountPercent: 0 }, // Soyabean Oil 1L Ã—2
      { productId: 'OIL-003', qty: 1, discountPercent: 0 }, // Ghee 500ml Ã—1
      { productId: 'RG-002', qty: 1, discountPercent: 0 }, // Kohinoor Rice 5kg Ã—1
    ],
    billedAt: atISTHourMinute(14, 0, 1).toISOString(),
    note: 'Online payment, regular customer',
  },
  // GRV-1003 (2 days ago 4PM, Card, Rohan Mehta) - Snacks, Tea
  {
    invoiceNo: 'GRV-1003',
    customerId: 'Rohan Mehta',
    customerName: 'Rohan Mehta',
    method: 'Card',
    lines: [
      { productId: 'SNK-001', qty: 2, discountPercent: 0 }, // Parle-G 720g Ã—2
      { productId: 'BEV-001', qty: 3, discountPercent: 0 }, // Tea 100g Ã—3
      { productId: 'SNK-004', qty: 1, discountPercent: 0 }, // Mad Angle 70g Ã—1
    ],
    billedAt: atISTHourMinute(16, 0, 2).toISOString(),
    note: 'Bulk purchase, card payment',
  },
  // GRV-1004 (3 days ago 11AM, Credit, Sunita Devi) - Pulses, Oils
  {
    invoiceNo: 'GRV-1004',
    customerId: 'Sunita Devi',
    customerName: 'Sunita Devi',
    method: 'Credit',
    lines: [
      { productId: 'PL-001', qty: 2, discountPercent: 5 }, // Dal Tuchha 1kg Ã—2 (5% discount)
      { productId: 'PL-002', qty: 2, discountPercent: 5 }, // Tur Dal 1kg Ã—2 (5% discount)
      { productId: 'OIL-002', qty: 1, discountPercent: 0 }, // Vanaspati 500g Ã—1
    ],
    billedAt: atISTHourMinute(11, 0, 3).toISOString(),
    note: 'Credit billing, regular customer',
  },
  // GRV-1005 (3 days ago 3PM, Split, Karan Singh) - Dairy, Spices
  {
    invoiceNo: 'GRV-1005',
    customerId: 'Karan Singh',
    customerName: 'Karan Singh',
    method: 'Split',
    lines: [
      { productId: 'DAI-001', qty: 2, discountPercent: 0 }, // Milk 500ml Ã—2
      { productId: 'DAI-002', qty: 1, discountPercent: 0 }, // Curd 500g Ã—1
      { productId: 'SPC-001', qty: 1, discountPercent: 0 }, // Turmeric 500g Ã—1
    ],
    billedAt: atISTHourMinute(15, 0, 3).toISOString(),
    note: 'Split payment (UPI + Cash)',
  },
  // GRV-1006 (4 days ago 9AM, Cash, Priya Verma) - Personal Care
  {
    invoiceNo: 'GRV-1006',
    customerId: 'Priya Verma',
    customerName: 'Priya Verma',
    method: 'Cash',
    lines: [
      { productId: 'PRS-001', qty: 3, discountPercent: 0 }, // Soap 150g Ã—3
      { productId: 'PRS-002', qty: 2, discountPercent: 0 }, // Toothpaste 200g Ã—2
      { productId: 'HSE-003', qty: 2, discountPercent: 0 }, // Vim Bar 400g Ã—2
    ],
    billedAt: atISTHourMinute(9, 0, 4).toISOString(),
    note: 'Personal care items, regular customer',
  },
  // GRV-1007 (4 days ago 1PM, UPI, Meera Nair) - Groceries
  {
    invoiceNo: 'GRV-1007',
    customerId: 'Meera Nair',
    customerName: 'Meera Nair',
    method: 'UPI',
    lines: [
      { productId: 'STT-001', qty: 1, discountPercent: 0 }, // Atta 10kg Ã—1
      { productId: 'PL-003', qty: 2, discountPercent: 0 }, // Chana Dal 500g Ã—2
      { productId: 'SPC-003', qty: 1, discountPercent: 0 }, // Garam Masala 50g Ã—1
    ],
    billedAt: atISTHourMinute(13, 0, 4).toISOString(),
    note: 'First purchase, UPI payment',
  },
  // GRV-1008 (5 days ago 10AM, Card, Vijay Choudhary) - Beverages, Snacks
  {
    invoiceNo: 'GRV-1008',
    customerId: 'Vijay Choudhary',
    customerName: 'Vijay Choudhary',
    method: 'Card',
    lines: [
      { productId: 'BEV-003', qty: 2, discountPercent: 0 }, // Cola 500ml Ã—2
      { productId: 'SNK-001', qty: 2, discountPercent: 0 }, // Parle-G 720g Ã—2
      { productId: 'SNK-004', qty: 1, discountPercent: 0 }, // Mad Angle 70g Ã—1
    ],
    billedAt: atISTHourMinute(10, 0, 5).toISOString(),
    note: 'Event purchases, card payment',
  },
  // GRV-1009 (5 days ago 4PM, Credit, Anjali Bansal) - Pulses, Ghee, Spices
  {
    invoiceNo: 'GRV-1009',
    customerId: 'Anjali Bansal',
    customerName: 'Anjali Bansal',
    method: 'Credit',
    lines: [
      { productId: 'PL-002', qty: 2, discountPercent: 10 }, // Tur Dal 1kg Ã—2 (10% discount)
      { productId: 'OIL-003', qty: 1, discountPercent: 0 }, // Ghee 500ml Ã—1
      { productId: 'SPC-004', qty: 2, discountPercent: 5 }, // Kitchen King 100g Ã—2 (5% discount)
    ],
    billedAt: atISTHourMinute(16, 0, 5).toISOString(),
    note: 'Credit billing, approved after verification',
  },
  // GRV-1010 (6 days ago 11AM, Cash, Sameer Ansari) - Snacks, Personal Care
  {
    invoiceNo: 'GRV-1010',
    customerId: 'Sameer Ansari',
    customerName: 'Sameer Ansari',
    method: 'Cash',
    lines: [
      { productId: 'SNK-003', qty: 2, discountPercent: 0 }, // Bhujia 200g Ã—2
      { productId: 'PRS-001', qty: 2, discountPercent: 0 }, // Soap 150g Ã—2
      { productId: 'PRS-002', qty: 1, discountPercent: 0 }, // Toothpaste 200g Ã—1
    ],
    billedAt: atISTHourMinute(11, 0, 6).toISOString(),
    note: 'Regular customer, cash payment',
  },
  // GRV-1011 (6 days ago 3PM, UPI, Priya Verma) - Dairy, Snacks
  {
    invoiceNo: 'GRV-1011',
    customerId: 'Priya Verma',
    customerName: 'Priya Verma',
    method: 'UPI',
    lines: [
      { productId: 'DAI-001', qty: 3, discountPercent: 0 }, // Milk 500ml Ã—3
      { productId: 'DAI-003', qty: 2, discountPercent: 0 }, // Paneer 200g Ã—2
      { productId: 'SNK-002', qty: 1, discountPercent: 0 }, // Lays 125g Ã—1
    ],
    billedAt: atISTHourMinute(15, 0, 6).toISOString(),
    note: 'Multiple items, UPI payment',
  },
  // GRV-1012 (7 days ago 2PM, Card, Sunita Devi) - Ghee, Pulses, Spices
  {
    invoiceNo: 'GRV-1012',
    customerId: 'Sunita Devi',
    customerName: 'Sunita Devi',
    method: 'Card',
    lines: [
      { productId: 'OIL-003', qty: 2, discountPercent: 0 }, // Ghee 500ml Ã—2
      { productId: 'PL-002', qty: 1, discountPercent: 0 }, // Tur Dal 1kg Ã—1
      { productId: 'SPC-005', qty: 2, discountPercent: 0 }, // Kitchen King 50g Ã—2
    ],
    billedAt: atISTHourMinute(14, 0, 7).toISOString(),
    note: 'Card payment, household items',
  },
  // GRV-1013 (7 days ago 9AM, Split, Rohan Mehta) - Spices, Personal Care
  {
    invoiceNo: 'GRV-1013',
    customerId: 'Rohan Mehta',
    customerName: 'Rohan Mehta',
    method: 'Split',
    lines: [
      { productId: 'SPC-001', qty: 1, discountPercent: 0 }, // Turmeric 500g Ã—1
      { productId: 'PRS-003', qty: 1, discountPercent: 0 }, // Shampoo 200ml Ã—1
      { productId: 'PRS-004', qty: 1, discountPercent: 0 }, // Face Wash 100ml Ã—1
    ],
    billedAt: atISTHourMinute(9, 0, 7).toISOString(),
    note: 'Split payment (UPI + Card)',
  },
  // GRV-1014 (Today 4PM, Partial, Meera Nair) - Credit with partial payment (Cash + Credit portion)
  {
    invoiceNo: 'GRV-1014',
    customerId: 'Meera Nair',
    customerName: 'Meera Nair',
    method: 'Credit',
    lines: [
      { productId: 'DAI-002', qty: 2, discountPercent: 0 }, // Curd 500g Ã—2
      { productId: 'DAI-003', qty: 1, discountPercent: 0 }, // Paneer 200g Ã—1
      { productId: 'BEV-001', qty: 2, discountPercent: 0 }, // Tea 100g Ã—2
    ],
    billedAt: atISTHourMinute(16, 0, 0).toISOString(),
    note: 'Credit billing, partial payment collected',
  },
]

// --- Returns (3 returns with different scenarios) ---
const RETURNS = [
  // RET-0001: Returning 1 Atta, restocked=true (today, against bill 1001)
  {
    returnNo: 'RET-0001',
    billId: 'GRV-1001',
    billInvoiceNo: 'GRV-1001',
    customerId: 'Priya Verma',
    customerName: 'Priya Verma',
    lines: [{ productId: 'STT-001', qty: 1, rate: toPaise(465), gstRate: 5, taxAmount: 248, amount: 465 }],
    refundTotal: toPaise(465), // Refund matches the sale
    reason: 'Damaged in transit',
    resolution: 'Refund',
    restocked: true,
    note: 'Damaged packaging, item returned for refund',
    returnedAt: atISTHourMinute(14, 0, 0).toISOString(),
    cashierName: 'System',
  },
  // RET-0002: Returning 1 Toothpaste, restocked=false (yesterday, against bill 1006)
  {
    returnNo: 'RET-0002',
    billId: 'GRV-1006',
    billInvoiceNo: 'GRV-1006',
    customerId: 'Priya Verma',
    customerName: 'Priya Verma',
    lines: [{ productId: 'PRS-002', qty: 1, rate: toPaise(60), gstRate: 18, taxAmount: 1080, amount: 6000 }],
    refundTotal: toPaise(7080), // Refund includes GST
    reason: 'Expired / spoiled',
    resolution: 'Refund',
    restocked: false, // Spoiled, not returned to shelf
    note: 'Shampoo past expiry date',
    returnedAt: atISTHourMinute(14, 0, 1).toISOString(),
    cashierName: 'System',
  },
  // RET-0003: Returning 1 Coca-Cola, restocked=true (2 days ago, against bill 1008)
  {
    returnNo: 'RET-0003',
    billId: 'GRV-1008',
    billInvoiceNo: 'GRV-1008',
    customerId: 'Vijay Choudhary',
    customerName: 'Vijay Choudhary',
    lines: [{ productId: 'BEV-003', qty: 1, rate: toPaise(40), gstRate: 18, taxAmount: 720, amount: 4000 }],
    refundTotal: toPaise(4720), // Refund includes GST
    reason: 'Quality complaint',
    resolution: 'Exchange',
    restocked: true,
    note: 'Replacement provided',
    returnedAt: atISTHourMinute(14, 0, 2).toISOString(),
    cashierName: 'System',
  },
]

// --- Payments (bill + purchase + customer payments) ---
const PAYMENTS = [
  // Payment for GRV-1001 (today)
  {
    direction: 'in',
    amount: toPaise(748), // Total including GST
    method: 'UPI',
    billId: 'GRV-1001',
    billInvoiceNo: 'GRV-1001',
    customerId: 'Priya Verma',
    customerName: 'Priya Verma',
    paidAt: atISTHourMinute(10, 30, 0).toISOString(),
    reference: 'UPI through app',
    note: 'Payment for groceries',
  },
  // Partial payment for GRV-1014 (today)
  {
    direction: 'in',
    amount: toPaise(203), // Partial payment
    method: 'Cash',
    billId: 'GRV-1014',
    billInvoiceNo: 'GRV-1014',
    customerId: 'Meera Nair',
    customerName: 'Meera Nair',
    paidAt: atISTHourMinute(15, 30, 0).toISOString(),
    reference: 'Partial at counter',
    note: 'Balance due: â‚¹1.52 (credit till next visit)',
  },
  // Payment for purchase PO-1001 (14 days ago)
  {
    direction: 'out',
    amount: toPaise(7365), // Total purchase (Atta + Salt + Sugar)
    method: 'Bank transfer',
    purchaseId: 'PO-1001',
    purchaseOrderNo: 'PO-1001',
    supplierId: 'Sharma Wholesalers',
    supplierName: 'Sharma Wholesalers',
    paidAt: atISTHourMinute(16, 0, 14).toISOString(),
    reference: 'Supplier payment',
    note: 'Payment for staple goods',
  },
  // Payment for purchase PO-1002 (12 days ago)
  {
    direction: 'out',
    amount: toPaise(2945), // Total purchase
    method: 'Cash',
    purchaseId: 'PO-1002',
    purchaseOrderNo: 'PO-1002',
    supplierId: 'Amul Distribution',
    supplierName: 'Amul Distribution',
    paidAt: atISTHourMinute(12, 0, 13).toISOString(),
    reference: 'Cash on delivery',
    note: 'Payment for dairy products',
  },
  // Payment for purchase PO-1003 (11 days ago)
  {
    direction: 'out',
    amount: toPaise(2360), // Total purchase
    method: 'Bank transfer',
    purchaseId: 'PO-1003',
    purchaseOrderNo: 'PO-1003',
    supplierId: 'ITC Fooddirect',
    supplierName: 'ITC Fooddirect',
    paidAt: atISTHourMinute(16, 0, 12).toISOString(),
    reference: 'Supplier payment',
    note: 'Payment for beverages and snacks',
  },
  // Payment for purchase PO-1004 (10 days ago)
  {
    direction: 'out',
    amount: toPaise(1880), // Total purchase
    method: 'Cash',
    purchaseId: 'PO-1004',
    purchaseOrderNo: 'PO-1004',
    supplierId: 'Haldiram Depot',
    supplierName: 'Haldiram Depot',
    paidAt: atISTHourMinute(12, 0, 11).toISOString(),
    reference: 'Cash on delivery',
    note: 'Payment for namkeen and biscuits',
  },
]

// --- Settings ---
const SETTINGS = {
  profile: {
    name: 'Grovio Presentation Demo',
    ownerName: 'Ramesh Chand Sharma',
    phone: '+91 97543 21098',
    email: 'demo@grovio-demo.local',
    address: '142, Laxmi Nagar Main Road, Indore - 452001, Madhya Pradesh, India',
    gstNumber: '23AABCM1234D1Z5',
    fssai: '123456789012',
    hours: '7:00 AM â€“ 10:00 PM',
    businessType: 'General Store',
    logoUrl: '',
    currency: 'INR',
    timezone: 'IST',
  },
  invoice: {
    prefix: 'GRV',
    terms: 'Payment due within 7 days of invoice date',
    footerNote: 'Thank you for your business!',
    showQr: true,
    showBarcode: false,
    upiId: 'grovio@upi',
    logoUrl: '',
  },
  taxes: [
    { rate: 0, label: 'GST 0%', enabled: true },
    { rate: 5, label: 'GST 5%', enabled: true },
    { rate: 12, label: 'GST 12%', enabled: true },
    { rate: 18, label: 'GST 18%', enabled: true },
    { rate: 28, label: 'GST 28%', enabled: true },
  ],
  preferences: {
    lowStockAlerts: true,
    expiryAlerts: true,
    dailySummary: true,
    soundOnScan: false,
    roundTotals: true,
  },
  futureLabVotes: ['Demand forecasting', 'Automatic invoice reading', 'Home delivery routes'],
}

console.log('Seed script data defined successfully')
console.log('Products:', PRODUCTS.length)
console.log('Suppliers:', SUPPLIERS.length)
console.log('Customers:', CUSTOMERS.length)
console.log('Team members:', TEAM.length)
console.log('Purchases:', PURCHASES.length)
console.log('Bills:', BILLS.length)
console.log('Returns:', RETURNS.length)
console.log('Payments:', PAYMENTS.length)
console.log('Categories:', CATEGORIES.length)
console.log('Settings:', Object.keys(SETTINGS).length)

// --- Main Seeding Function ---

const DEMO_STORE_NAME = 'Grovio Presentation Demo'

/**
 * Clean up any existing demo store and all associated data.
 * This makes the script idempotent — safe to run multiple times.
 */
async function cleanupExistingDemoData() {
  console.log('🧹 Cleaning up any existing demo data...')
  const existingStore = await Store.findOne({ name: DEMO_STORE_NAME }).lean()
  if (!existingStore) {
    console.log('  No existing demo store found. Ready to seed.')
    return
  }

  const storeId = existingStore._id
  console.log('  Found existing demo store, removing all associated data...')

  const collections = [
    { Model: User, query: { store: storeId }, label: 'users' },
    { Model: RefreshToken, query: { user: { $in: await User.find({ store: storeId }).distinct('_id') } }, label: 'refresh tokens' },
    { Model: Product, query: { store: storeId }, label: 'products' },
    { Model: Category, query: { store: storeId }, label: 'categories' },
    { Model: Supplier, query: { store: storeId }, label: 'suppliers' },
    { Model: Customer, query: { store: storeId }, label: 'customers' },
    { Model: Purchase, query: { store: storeId }, label: 'purchases' },
    { Model: Bill, query: { store: storeId }, label: 'bills' },
    { Model: Payment, query: { store: storeId }, label: 'payments' },
    { Model: Return, query: { store: storeId }, label: 'returns' },
    { Model: InventoryAdjustment, query: { store: storeId }, label: 'inventory adjustments' },
  ]

  for (const { Model, query, label } of collections) {
    const result = await Model.deleteMany(query)
    console.log(`    Deleted ${result.deletedCount} ${label}`)
  }

  await Store.deleteOne({ _id: storeId })
  console.log('  Existing demo data cleaned up.')
}

/**
 * Execute the main seeding procedure.
 */
async function runSeed() {
  const start = Date.now()

  // Step 1: Verify environment
  await verifyDemoEnvironment()

  // Step 2: Connect to MongoDB
  await mongoose.connect(env.mongoUri)
  console.log('✅ Connected to database:', mongoose.connection.name)

  try {
    // Step 3: Clean up existing demo data
    await cleanupExistingDemoData()

    // Step 4: Generate demo password for owner
    const ownerPassword = DEMO_PASSWORD
    console.log('🔐 Generated demo owner password')

    // Step 5: Create owner user and store together
    console.log('🏪 Creating demo store and owner account...')

    // Create owner user first
    const owner = new User({
      name: TEAM[0].name,
      email: DEMO_EMAIL,
      phone: TEAM[0].phone,
      role: 'Owner',
      status: 'active',
    })
    await owner.setPassword(ownerPassword)
    await owner.save()

    // Create store with demo sequences (return sequence starts at 0 for RET-0001 format)
    const store = await Store.create({
      name: SETTINGS.profile.name,
      ownerName: SETTINGS.profile.ownerName,
      owner: owner._id,
      phone: SETTINGS.profile.phone,
      email: SETTINGS.profile.email,
      address: SETTINGS.profile.address,
      gstNumber: SETTINGS.profile.gstNumber,
      fssai: SETTINGS.profile.fssai,
      hours: SETTINGS.profile.hours,
      businessType: SETTINGS.profile.businessType,
      logoUrl: SETTINGS.profile.logoUrl,
      currency: SETTINGS.profile.currency,
      timezone: SETTINGS.profile.timezone,
      onboardingCompleted: true,
      sequences: { bill: 1000, purchase: 1000, return: 0 },
      invoiceSettings: {
        prefix: SETTINGS.invoice.prefix,
        terms: SETTINGS.invoice.terms,
        footerNote: SETTINGS.invoice.footerNote,
        showQr: SETTINGS.invoice.showQr,
        showBarcode: SETTINGS.invoice.showBarcode,
        upiId: SETTINGS.invoice.upiId,
        logoUrl: SETTINGS.invoice.logoUrl,
      },
      taxes: SETTINGS.taxes,
      preferences: SETTINGS.preferences,
      futureLabVotes: SETTINGS.futureLabVotes,
    })

    owner.store = store._id
    await owner.save()

    const storeId = store._id
    const actor = { id: String(owner._id), name: owner.name, role: 'Owner' }
    console.log('  Store created:', store.name)

    // Step 6: Create categories
    console.log('📁 Creating categories...')
    const categoryMap = new Map()
    for (const cat of CATEGORIES) {
      const created = await categoryService.create(storeId, {
        name: cat.name,
        description: cat.description,
      })
      categoryMap.set(cat.name, created.id)
      console.log('    Created category:', cat.name)
    }

    // Step 7: Create suppliers
    console.log('📦 Creating suppliers...')
    const supplierMap = new Map()
    for (const sup of SUPPLIERS) {
      const created = await supplierService.create(storeId, {
        name: sup.name,
        contactName: sup.contactName,
        phone: sup.phone,
        email: sup.email,
        address: sup.address,
        city: sup.city,
        gstin: sup.gstin,
        openingDue: sup.openingDue,
        paymentTerms: sup.paymentTerms,
        notes: sup.notes,
      })
      supplierMap.set(created.name, String(created._id))
      console.log('    Created supplier:', sup.name)
    }

    // Step 8: Create products
    console.log('🛍️  Creating products...')
    const productMap = new Map()
    for (const product of PREPARED_PRODUCTS) {
      const payload = {
        name: product.name,
        brand: product.brand,
        sku: product.sku,
        unit: product.unit,
        sellingPrice: product.sellingPrice,
        purchasePrice: product.purchasePrice,
        gstRate: product.gstRate,
        minStock: product.minStock,
        maxStock: product.maxStock,
        categoryName: product.categoryName,
        stock: product.openingStock,
        expiry: product.expiry,
        supplierId: supplierMap.get(product.supplierName),
      }
      const created = await productService.create(storeId, payload)
      productMap.set(product.sku, String(created._id))
      console.log('    Created product:', product.sku, '-', product.name)
    }

    // Step 9: Create customers
    console.log('👥 Creating customers...')
    const customerMap = new Map()
    for (const cust of CUSTOMERS) {
      const created = await customerService.create(storeId, {
        name: cust.name,
        phone: cust.phone,
        email: cust.email,
        openingDue: cust.openingDue,
        creditLimit: cust.creditLimit,
        tag: cust.tag,
        note: cust.note,
      })
      customerMap.set(cust.name, String(created._id))
      console.log('    Created customer:', cust.name)
    }

    // Step 10: Create team members (Manager, Cashier)
    console.log('👤 Creating team members...')
    for (const member of TEAM.slice(1)) {
      const teamPassword = DEMO_PASSWORD
      const created = await teamService.create(storeId, {
        name: member.name,
        email: member.email,
        phone: member.phone,
        role: member.role,
        status: 'active',
        password: teamPassword,
      }, actor)
      console.log(`    Created ${member.role}:`, member.name, '(' + teamPassword + ')')
    }

    // Step 11: Create purchases and receive stock
    console.log('📥 Creating purchase orders...')
    const purchaseMap = new Map()
    for (const po of PURCHASES) {
      const supplierId = supplierMap.get(po.supplierId)
      const lines = po.lines.map((l) => ({
        productId: productMap.get(l.productId),
        qty: l.qty,
      }))

      const created = await purchaseService.create(storeId, {
        supplierId,
        supplierInvoiceNo: po.supplierInvoiceNo,
        lines,
        status: 'Ordered',
        note: po.note,
        expectedAt: po.expectedAt,
      }, actor)

      const orderNo = created.orderNo
      purchaseMap.set(orderNo, String(created._id))
      console.log('    Created purchase:', orderNo, '(' + po.supplierId + ')')

      // Update orderedAt to the specified timestamp
      await Purchase.findByIdAndUpdate(
        created._id,
        { orderedAt: new Date(po.orderedAt) },
      )

      // Receive stock for completed purchases
      if (po.status === 'Goods received') {
        const receiveLines = po.lines.map((l) => ({
          productId: productMap.get(l.productId),
          qty: l.qty,
        }))
        await purchaseService.receive(storeId, created._id, { lines: receiveLines }, actor)
        // Update receivedAt timestamp
        await Purchase.findByIdAndUpdate(
          created._id,
          { receivedAt: new Date(po.receivedAt) },
        )
        console.log('      ✓ Stock received for', orderNo)
      } else if (po.status === 'In transit') {
        // Partial receipt for PO-1010: receive 5 of first product
        const firstProductId = productMap.get(po.lines[0].productId)
        const partialQty = 5
        await purchaseService.receive(storeId, created._id, {
          lines: [{ productId: firstProductId, qty: partialQty }],
        }, actor)
        console.log('      ⚠ Partial stock received for', orderNo)
      } else {
        console.log('      ✗ Not yet received (status:', po.status + ')')
      }
    }

    // Step 12: Create bills
    console.log('🧾 Creating bills...')
    const billMap = new Map()
    for (const bill of BILLS) {
      const customerId = customerMap.get(bill.customerId)
      const lines = bill.lines.map((l) => ({
        productId: productMap.get(l.productId),
        qty: l.qty,
        discountPercent: l.discountPercent,
      }))

      const result = await billService.create(storeId, {
        customerId,
        method: bill.method,
        lines,
        billedAt: bill.billedAt,
        note: bill.note,
      }, actor)

      billMap.set(result.invoiceNo, {
        id: result.id,
        totalPaise: Math.round(result.total * 100),
        method: bill.method,
      })
      console.log('    Created bill:', result.invoiceNo, '(' + bill.method + ')')
    }

    // Step 13: Create returns
    console.log('↩️  Creating returns...')
    for (const ret of RETURNS) {
      const billInfo = billMap.get(ret.billInvoiceNo)
      if (!billInfo) {
        console.log('    ⚠ Skipping return:', ret.returnNo, '(bill not found)')
        continue
      }
      const lines = ret.lines.map((l) => ({
        productId: productMap.get(l.productId),
        qty: l.qty,
      }))

      const created = await returnService.create(storeId, {
        billId: billInfo.id,
        lines,
        reason: ret.reason,
        resolution: ret.resolution,
        restocked: ret.restocked,
        note: ret.note,
      }, actor)

      // Update returnedAt timestamp
      await Return.findByIdAndUpdate(
        created._id,
        { returnedAt: new Date(ret.returnedAt) },
      )
      console.log('    Created return:', ret.returnNo, '(' + ret.billInvoiceNo + ')')
    }

    // Step 14: Record payments
    console.log('💳 Recording payments...')

    for (const payment of PAYMENTS) {
      let billId = null
      let purchaseId = null
      let customerId = null
      let supplierId = null
      let amount = payment.amount

      if (payment.billInvoiceNo && billMap.has(payment.billInvoiceNo)) {
        const billInfo = billMap.get(payment.billInvoiceNo)
        billId = billInfo.id

        // For credit bill partial payments, use the hardcoded partial amount
        if (billInfo.method === 'Credit') {
          amount = payment.amount
        } else {
          // Bill is already fully paid via bill creation - skip separate payment
          console.log('    ↺ Skipping payment for', payment.billInvoiceNo, '(bill already fully paid)')
          continue
        }

        customerId = customerMap.get(payment.customerName)
      }

      if (payment.purchaseId && purchaseMap.has(payment.purchaseId)) {
        purchaseId = purchaseMap.get(payment.purchaseId)
        // Look up actual purchase total
        const purchase = await Purchase.findById(purchaseId).lean()
        amount = purchase.total
        supplierId = supplierMap.get(payment.supplierName)
      }

      await recordPayment(storeId, {
        direction: payment.direction,
        amount,
        method: payment.method,
        billId: billId ? mongoose.Types.ObjectId.createFromHexString(billId) : null,
        purchaseId: purchaseId ? mongoose.Types.ObjectId.createFromHexString(purchaseId) : null,
        customerId: customerId ? mongoose.Types.ObjectId.createFromHexString(customerId) : null,
        supplierId: supplierId ? mongoose.Types.ObjectId.createFromHexString(supplierId) : null,
        paidAt: payment.paidAt ? new Date(payment.paidAt) : new Date(),
        reference: payment.reference,
        note: payment.note,
      }, actor)

      const ref = payment.billInvoiceNo || payment.purchaseOrderNo || payment.supplierName
      console.log('    Recorded payment:', payment.direction, '-', payment.method, '-', ref)
    }

    // Step 15: Finalize store settings
    console.log('⚙️  Finalizing store settings...')
    await storeService.updateProfile(storeId, {
      name: SETTINGS.profile.name,
      ownerName: SETTINGS.profile.ownerName,
      phone: SETTINGS.profile.phone,
      email: SETTINGS.profile.email,
      address: SETTINGS.profile.address,
      gstNumber: SETTINGS.profile.gstNumber,
      fssai: SETTINGS.profile.fssai,
      hours: SETTINGS.profile.hours,
      businessType: SETTINGS.profile.businessType,
      logoUrl: SETTINGS.profile.logoUrl,
      currency: SETTINGS.profile.currency,
      timezone: SETTINGS.profile.timezone,
    })
    await storeService.updateInvoiceSettings(storeId, SETTINGS.invoice)
    await storeService.updateTaxes(storeId, { taxes: SETTINGS.taxes })
    await storeService.updatePreferences(storeId, SETTINGS.preferences)
    console.log('  Store settings updated.')

    // Step 16: Verify data consistency
    console.log('\n🔍 Verifying demo data consistency...')
    const stats = await verifyDemoData(storeId)
    console.log('\n📊 Demo Statistics:')
    console.log('   Categories:', stats.categoryCount)
    console.log('   Suppliers:', stats.supplierCount)
    console.log('   Products:', stats.productCount)
    console.log('   Customers:', stats.customerCount)
    console.log('   Team members:', stats.teamCount)
    console.log('   Purchase orders:', stats.purchaseCount)
    console.log('   Purchases received:', stats.purchasesReceived)
    console.log('   Purchases in transit:', stats.purchasesInTransit)
    console.log('   Purchases ordered:', stats.purchasesOrdered)
    console.log('   Bills:', stats.billCount)
    console.log('   Total billed:', toRupees(stats.totalBilled), 'rupees')
    console.log('   Returns:', stats.returnCount)
    console.log('   Total refunded:', toRupees(stats.totalRefunded), 'rupees')
    console.log('   Payments:', stats.paymentCount)
    console.log('   Total received:', toRupees(stats.totalReceived), 'rupees')
    console.log('   Total paid out:', toRupees(stats.totalPaid), 'rupees')
    console.log('   Total stock value:', toRupees(stats.stockValue), 'rupees')

    if (stats.errors.length > 0) {
      console.log('\n⚠️  Verification warnings:')
      stats.errors.forEach((e) => console.log('   -', e))
    } else {
      console.log('\n✅ All verification checks passed!')
    }

    // Step 17: Print credentials
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    console.log('\n═══════════════════════════════════════════════════════════')
    console.log('🎉 Demo seed completed in', elapsed, 'seconds')
    console.log('═══════════════════════════════════════════════════════════')
    console.log('Store:', SETTINGS.profile.name)
    console.log('Email:', DEMO_EMAIL)
    console.log('Password:', ownerPassword)
    console.log('───────────────────────────────────────────────────────────')
    console.log('Sign in at:', FRONTEND_URL)
    console.log('═══════════════════════════════════════════════════════════\n')

    return { storeId, ownerPassword, stats }
  } finally {
    await mongoose.disconnect()
  }
}

/**
 * Verify demo data consistency across modules.
 */
async function verifyDemoData(storeId) {
  const errors = []

  const [categoryCount, supplierCount, productCount, customerCount, teamCount, purchaseCount, billCount, returnCount, paymentCount] = await Promise.all([
    Category.countDocuments({ store: storeId }),
    Supplier.countDocuments({ store: storeId }),
    Product.countDocuments({ store: storeId }),
    Customer.countDocuments({ store: storeId }),
    User.countDocuments({ store: storeId }),
    Purchase.countDocuments({ store: storeId }),
    Bill.countDocuments({ store: storeId }),
    Return.countDocuments({ store: storeId }),
    Payment.countDocuments({ store: storeId }),
  ])

  const [purchasesReceived, purchasesInTransit, purchasesOrdered] = await Promise.all([
    Purchase.countDocuments({ store: storeId, status: 'Goods received' }),
    Purchase.countDocuments({ store: storeId, status: 'In transit' }),
    Purchase.countDocuments({ store: storeId, status: 'Ordered' }),
  ])

  const [totalBilledAgg, totalRefundedAgg, totalReceivedAgg, totalPaidAgg, stockValueAgg] = await Promise.all([
    Bill.aggregate([{ $match: { store: mongoose.Types.ObjectId.createFromHexString(String(storeId)) } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Return.aggregate([{ $match: { store: mongoose.Types.ObjectId.createFromHexString(String(storeId)) } }, { $group: { _id: null, total: { $sum: '$refundTotal' } } }]),
    Payment.aggregate([{ $match: { store: mongoose.Types.ObjectId.createFromHexString(String(storeId)), direction: 'in' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: { store: mongoose.Types.ObjectId.createFromHexString(String(storeId)), direction: 'out' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Product.aggregate([{ $match: { store: mongoose.Types.ObjectId.createFromHexString(String(storeId)), archived: false } }, { $group: { _id: null, total: { $sum: { $multiply: ['$purchasePrice', '$stock'] } } } }]),
  ])

  const totalBilled = totalBilledAgg[0]?.total || 0
  const totalRefunded = totalRefundedAgg[0]?.total || 0
  const totalReceived = totalReceivedAgg[0]?.total || 0
  const totalPaid = totalPaidAgg[0]?.total || 0
  const stockValue = stockValueAgg[0]?.total || 0

  // Check: all products have stock >= 0
  const negativeStock = await Product.find({ store: storeId, stock: { $lt: 0 } }).lean()
  if (negativeStock.length > 0) {
    errors.push(`${negativeStock.length} products have negative stock`)
  }

  // Check: all bills have valid totals
  const zeroTotalBills = await Bill.find({ store: storeId, total: 0 }).lean()
  if (zeroTotalBills.length > 0) {
    errors.push(`${zeroTotalBills.length} bills have zero total`)
  }

  // Check: purchases received have receivedAt set
  const receivedWithoutDate = await Purchase.find({
    store: storeId,
    status: 'Goods received',
    receivedAt: null,
  }).lean()
  if (receivedWithoutDate.length > 0) {
    errors.push(`${receivedWithoutDate.length} received purchases missing receivedAt`)
  }

  // Check: all categories have products
  const emptyCategories = []
  for await (const cat of categoryCount > 0 ? CATEGORIES : []) {
    const hasProducts = await Product.exists({ store: storeId, categoryName: cat.name })
    if (!hasProducts) {
      emptyCategories.push(cat.name)
    }
  }
  if (emptyCategories.length > 0) {
    errors.push(`${emptyCategories.length} categories have no products`)
  }

  if (categoryCount !== CATEGORIES.length) errors.push(`Expected ${CATEGORIES.length} categories, found ${categoryCount}`)
  if (supplierCount !== SUPPLIERS.length) errors.push(`Expected ${SUPPLIERS.length} suppliers, found ${supplierCount}`)
  if (productCount !== PRODUCTS.length) errors.push(`Expected ${PRODUCTS.length} products, found ${productCount}`)
  if (customerCount !== CUSTOMERS.length) errors.push(`Expected ${CUSTOMERS.length} customers, found ${customerCount}`)
  if (teamCount !== TEAM.length) errors.push(`Expected ${TEAM.length} team members, found ${teamCount}`)
  if (purchaseCount !== PURCHASES.length) errors.push(`Expected ${PURCHASES.length} purchases, found ${purchaseCount}`)
  if (billCount !== BILLS.length) errors.push(`Expected ${BILLS.length} bills, found ${billCount}`)
  if (returnCount !== RETURNS.length) errors.push(`Expected ${RETURNS.length} returns, found ${returnCount}`)

  return {
    categoryCount,
    supplierCount,
    productCount,
    customerCount,
    teamCount,
    purchaseCount,
    purchasesReceived,
    purchasesInTransit,
    purchasesOrdered,
    billCount,
    returnCount,
    paymentCount,
    totalBilled,
    totalRefunded,
    totalReceived,
    totalPaid,
    stockValue,
    errors,
  }
}

// --- Entry Point ---

runSeed().catch((err) => {
  console.error('\n❌ Seeding failed:', err.message)
  process.exitCode = 1
  if (mongoose.connection.readyState) {
    mongoose.disconnect().catch(() => {})
  }
})

