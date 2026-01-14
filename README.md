Guestara Menu & Services Management Backend
📋 Table of Contents

Project Overview
Architecture & Design
Data Modeling
Core Business Logic
API Documentation
Technical Decisions
Setup Instructions
Testing
Challenges & Learnings
Future Improvements


Project Overview
What This System Does
This is a production-grade backend system for managing restaurant menus, services, and bookings. It handles:

Hierarchical organization: Categories → Subcategories → Items
Flexible pricing: 5 different pricing models (static, tiered, complimentary, discounted, dynamic)
Smart tax inheritance: Tax rules flow from Category → Subcategory → Item without data duplication
Booking management: Prevents double-booking with transaction-safe conflict detection
Add-ons system: Items can have optional/mandatory add-ons that affect pricing
Advanced search: Filter, sort, and paginate across relationships

Key Differentiators
This is not just CRUD. The system demonstrates:

Real-time calculated fields (tax, pricing) vs stored values
Complex business rules (XOR constraints, time-based availability)
Transaction handling for race conditions
Soft deletes with virtual cascading
Dynamic pricing based on context (quantity, time)


Architecture & Design
High-Level Architecture
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│                  (API Consumers, Postman, Web Apps)              │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    HTTP SERVER (Express.js)                      │
│         Rate Limiting • CORS • Security Headers • Logging        │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       MIDDLEWARE LAYER                           │
│        Validation (Zod) • Error Handling • Async Wrappers       │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         ROUTE LAYER                              │
│      Categories • Items • Bookings • Addons • Availability      │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER ⭐                           │
│    Tax Inheritance • Pricing Engine • Booking Conflicts         │
│    Search & Filter • Soft Delete Cascade • Validation           │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER (Mongoose)                  │
│           Category • Subcategory • Item • Booking Models         │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE (MongoDB)                          │
└─────────────────────────────────────────────────────────────────┘
Why This Layered Approach?
Separation of Concerns:

Routes: Handle HTTP (request/response)
Services: Contain business logic (testable, reusable)
Models: Define data structure and basic queries

Benefits:

✅ Easy to test (mock services in unit tests)
✅ Reusable logic (multiple routes can call same service)
✅ Clear ownership (know where to add features)
✅ Explainable (each layer has a single responsibility)


Data Modeling
Entity Relationship Diagram
┌─────────────────────┐
│     Category        │
│ ─────────────────── │
│ _id                 │◄─────────┐
│ name (unique)       │          │
│ image               │          │ Many-to-One
│ description         │          │
│ tax_applicable      │          │
│ tax_percentage      │          │
│ is_active           │          │
└─────────────────────┘          │
         │ 1:N                   │
         ▼                       │
┌─────────────────────┐          │
│   Subcategory       │          │
│ ─────────────────── │          │
│ _id                 │          │
│ category_id ────────┼──────────┘
│ name                │◄─────────┐
│ image               │          │
│ description         │          │
│ tax_applicable      │          │
│ tax_percentage      │          │
│ is_active           │          │
└─────────────────────┘          │
                                 │ Many-to-One
         ┌───────────────────────┘
         │ 1:N
         ▼
┌─────────────────────────────────────┐
│             Item                     │
│ ─────────────────────────────────── │
│ _id                                  │
│ name                                 │
│ description                          │
│ image                                │
│ category_id (optional)               │
│ subcategory_id (optional)            │──┐
│ pricing_type (enum)                  │  │
│ pricing_config (object)              │  │ 1:N
│ tax_applicable (optional)            │  │
│ tax_percentage (optional)            │  │
│ is_bookable                          │  │
│ is_active                            │  │
│ addons (embedded array) ─────┐       │  │
└─────────────────────────────┼───────┘  │
                              │          │
         ┌────────────────────┘          │
         │                               │
         ▼                               ▼
┌─────────────────────┐      ┌─────────────────────┐
│   Addon (Embedded)  │      │   Availability      │
│ ─────────────────── │      │ ─────────────────── │
│ name                │      │ _id                 │
│ price               │      │ item_id             │
│ is_mandatory        │      │ day_of_week         │
│ addon_group         │      │ start_time          │
│ is_active           │      │ end_time            │
└─────────────────────┘      │ is_active           │
                             └─────────────────────┘
                                        │
                                        │ 1:N
                                        ▼
                             ┌─────────────────────┐
                             │      Booking        │
                             │ ─────────────────── │
                             │ _id                 │
                             │ item_id             │
                             │ booking_date        │
                             │ start_time          │
                             │ end_time            │
                             │ customer_name       │
                             │ status              │
                             │ created_at          │
                             └─────────────────────┘
Key Design Decisions
1. Item Parent Relationship (XOR Constraint)
typescript// An item belongs to EITHER a category OR a subcategory, NOT BOTH
item.category_id XOR item.subcategory_id
Implementation:

Zod validation enforces this at runtime
Service layer checks prevent invalid states
MongoDB doesn't enforce this natively, so we handle it in code

Why this matters:

Prevents ambiguous hierarchies
Simplifies tax inheritance logic
Clear data ownership


2. Embedded vs Referenced Documents
EntityStorage StrategyReasoningAddonsEmbedded in Item• Always fetched together• Atomic updates• No JOIN overheadCategories/SubcategoriesReferenced• Queried independently• Shared across items• Clear hierarchyBookingsSeparate collection• Large volume expected• Queried by date ranges• Need indexing

3. Pricing Configuration (JSONB-Style)
Instead of separate tables per pricing type, we store flexible configs:
typescript// Static pricing
{
  type: 'static',
  price: 200
}

// Tiered pricing
{
  type: 'tiered',
  tiers: [
    { max_quantity: 1, price: 300 },
    { max_quantity: 2, price: 500 },
    { max_quantity: 4, price: 800 }
  ]
}

// Dynamic (time-based) pricing
{
  type: 'dynamic',
  windows: [
    { start_time: '08:00', end_time: '11:00', price: 199 },
    { start_time: '11:00', end_time: '14:00', price: 299 }
  ]
}
Benefits:

✅ Schema flexibility (easy to add new pricing types)
✅ All pricing logic in service layer (testable)
✅ No complex table joins
✅ Clear, readable configs

Tradeoff:

❌ Can't query "all items with price > 100" efficiently
✅ But we prioritize flexibility over query optimization at this scale


Core Business Logic
1. Tax Inheritance (The Critical Feature)
The Problem
When a category's tax changes, all items inheriting that tax must reflect the new value without manually updating every item record.
The Solution: Runtime Resolution
Strategy: Tax is never duplicated. It's calculated at request time by walking up the hierarchy.
typescriptfunction resolveTax(item: Item): TaxInfo {
  // 1. Check item level first
  if (item.tax_applicable !== null) {
    return {
      applicable: item.tax_applicable,
      percentage: item.tax_percentage,
      source: 'item'
    };
  }

  // 2. Check subcategory level
  if (item.subcategory_id?.tax_applicable !== null) {
    return {
      applicable: item.subcategory_id.tax_applicable,
      percentage: item.subcategory_id.tax_percentage,
      source: 'subcategory'
    };
  }

  // 3. Fall back to category level
  const category = item.subcategory_id?.category_id || item.category_id;
  return {
    applicable: category.tax_applicable,
    percentage: category.tax_percentage,
    source: 'category'
  };
}
```

#### Tax Inheritance Flow
```
Query: GET /items/123/price

Step 1: Fetch item with populated references
  Item.findById(123)
    .populate('category_id')
    .populate({ 
      path: 'subcategory_id',
      populate: { path: 'category_id' }
    })

Step 2: Walk the hierarchy
  Item tax_applicable = null → Check subcategory
  Subcategory tax_applicable = null → Check category
  Category tax_applicable = true, tax_percentage = 18

Step 3: Return
  {
    tax: {
      applicable: true,
      percentage: 18,
      amount: 117,  // Calculated: 650 * 0.18
      inherited_from: 'category'
    }
  }
```

#### Why This Design?

| Approach | Pros | Cons | Our Choice |
|----------|------|------|------------|
| **Denormalize** (store tax in items) | Fast queries | Stale data, complex updates | ❌ |
| **Triggers** (auto-update on change) | Always synced | DB-specific, hard to test | ❌ |
| **Runtime resolution** (our approach) | Always fresh, simple | 2-3 queries per request | ✅ |

**At scale:** We'd cache the category tree in Redis. But for this assignment, **correctness > optimization**.

---

### 2. Pricing Engine (5 Pricing Types)

The pricing engine is a **pure function** that calculates price based on type and context.

#### Architecture
```
PricingService
├── calculate(item, options) → price
├── validateConfig(type, config) → void
└── Calculators:
    ├── calculateStatic(config)
    ├── calculateTiered(config, quantity)
    ├── calculateComplimentary()
    ├── calculateDiscounted(config)
    └── calculateDynamic(config, time)
Type-Specific Logic
1. Static Pricing
typescript// Config: { type: 'static', price: 200 }
calculateStatic(config) {
  return config.price; // Simple!
}
2. Tiered Pricing
typescript// Config: { type: 'tiered', tiers: [...] }
calculateTiered(config, quantity) {
  const tier = config.tiers.find(t => quantity <= t.max_quantity);
  if (!tier) throw new Error('Quantity exceeds max tier');
  return tier.price;
}

// Example:
// quantity = 2 → Tier 2 (up to 2 hours) → ₹500
3. Complimentary
typescript// Config: { type: 'complimentary' }
calculateComplimentary() {
  return 0; // Always free
}
4. Discounted Pricing
typescript// Config: { type: 'discounted', base_price: 500, discount: { type: 'percentage', value: 20 } }
calculateDiscounted(config) {
  let finalPrice = config.base_price;
  
  if (config.discount.type === 'percentage') {
    finalPrice = finalPrice * (1 - config.discount.value / 100);
  } else if (config.discount.type === 'flat') {
    finalPrice = finalPrice - config.discount.value;
  }
  
  return Math.max(0, finalPrice); // Never negative
}
5. Dynamic (Time-Based) Pricing
typescript// Config: { type: 'dynamic', windows: [...] }
calculateDynamic(config, currentTime) {
  const window = config.windows.find(w => 
    currentTime >= w.start_time && currentTime < w.end_time
  );
  
  if (!window) {
    throw new Error('Item not available at this time');
  }
  
  return window.price;
}

// Example:
// 10:30 AM → Window: 08:00-11:00 → ₹199
// 03:00 PM → No matching window → Error
Full Price Calculation Example
httpGET /items/123/price?quantity=2&time=10:30&addons[]=addon1

Response:
{
  "item_id": "123",
  "item_name": "Meeting Room",
  "pricing_rule": "tiered",
  "base_price": 500,          // Tier 2 (2 hours)
  "addons": [
    { "name": "Projector", "price": 100 }
  ],
  "addon_total": 100,
  "subtotal": 600,            // 500 + 100
  "tax": {
    "applicable": true,
    "percentage": 18,
    "amount": 108,            // 600 * 0.18
    "inherited_from": "category"
  },
  "grand_total": 708          // 600 + 108
}
```

---

### 3. Booking Conflict Prevention

#### The Challenge

**Race condition:**
```
T1: User A checks slot 10:00-11:00 → Available ✓
T2: User B checks slot 10:00-11:00 → Available ✓
T3: User A books → Success
T4: User B books → Success (DOUBLE BOOKING! ❌)
The Solution: Transactions + Conflict Query
typescriptasync createBooking(data: CreateBookingDto): Promise<Booking> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Step 1: Lock and check for conflicts
    const conflict = await Booking.findOne({
      item_id: data.item_id,
      booking_date: data.booking_date,
      status: 'confirmed',
      $or: [
        // New booking starts during existing
        {
          start_time: { $lte: data.start_time },
          end_time: { $gt: data.start_time }
        },
        // New booking ends during existing
        {
          start_time: { $lt: data.end_time },
          end_time: { $gte: data.end_time }
        },
        // New booking contains existing
        {
          start_time: { $gte: data.start_time },
          end_time: { $lte: data.end_time }
        }
      ]
    }).session(session); // ⭐ Transaction context

    if (conflict) {
      await session.abortTransaction();
      throw new ConflictError('Time slot already booked');
    }

    // Step 2: Create booking
    const [booking] = await Booking.create([data], { session });

    // Step 3: Commit
    await session.commitTransaction();
    return booking;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
Why Transactions?
MongoDB transactions ensure atomicity:

If two users book simultaneously, one waits for the other's transaction to complete
The second user's conflict check sees the first user's booking
Prevents double-booking even under heavy load

Tradeoff:

Slower than simple queries
But correctness > speed for bookings


4. Soft Deletes with Virtual Cascading
The Problem
When a category is deleted (soft-deleted), should its items also be inactive?
Two Approaches
Option A: Physical Cascade
typescript// When category is deleted, update all children
await Item.updateMany(
  { category_id: categoryId },
  { is_active: false }
);

✅ Fast queries (filter by is_active)
❌ Many DB writes
❌ Hard to "undo" delete

Option B: Virtual Cascade (Our Choice)
typescript// When fetching items, check parent status
const items = await Item.find().populate('category_id');
const activeItems = items.filter(item => 
  item.is_active && item.category_id.is_active
);

✅ Preserves data integrity
✅ Easy to reactivate
❌ More complex queries

Why we chose Virtual:

Data is never lost (can undo deletes)
Clear audit trail (know when category was deactivated)
Simpler logic (no cascade updates to maintain)


5. Search & Filtering
Requirements
httpGET /items?search=coffee&minPrice=100&maxPrice=500&category=beverages&page=1&limit=10&sortBy=price&order=desc
MongoDB Aggregation Pipeline
typescriptconst pipeline = [
  // Step 1: Text search
  {
    $match: {
      name: { $regex: search, $options: 'i' },
      is_active: true
    }
  },

  // Step 2: Join with categories
  {
    $lookup: {
      from: 'categories',
      localField: 'category_id',
      foreignField: '_id',
      as: 'category'
    }
  },
  { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },

  // Step 3: Filter by price range
  {
    $match: {
      'pricing_config.price': { $gte: minPrice, $lte: maxPrice }
    }
  },

  // Step 4: Filter by category
  {
    $match: {
      'category.name': categoryName
    }
  },

  // Step 5: Sort
  { $sort: { [sortBy]: sortOrder } },

  // Step 6: Paginate
  { $skip: (page - 1) * limit },
  { $limit: limit }
];

const items = await Item.aggregate(pipeline);
```

**Why Aggregation Pipeline?**
- MongoDB's version of SQL JOINs
- Can filter across relationships
- Single query for complex operations

**Tradeoff:**
- Harder to read than SQL
- But **necessary for MongoDB** to match SQL-like functionality

---

## API Documentation

### Base URL
```
http://localhost:3000/api/v1
Core Endpoints
Categories
http# Create category
POST /categories
Content-Type: application/json

{
  "name": "Beverages",
  "tax_applicable": true,
  "tax_percentage": 5,
  "description": "Hot and cold drinks",
  "image": "https://example.com/beverages.jpg"
}

# List categories (with pagination)
GET /categories?page=1&limit=10&sortBy=name

# Get single category
GET /categories/:id

# Update category
PATCH /categories/:id
Content-Type: application/json

{
  "tax_percentage": 18
}

# Soft delete
DELETE /categories/:id
Items
http# Create item
POST /items
Content-Type: application/json

{
  "name": "Cappuccino",
  "category_id": "507f1f77bcf86cd799439011",
  "description": "Italian coffee with steamed milk",
  "pricing_type": "static",
  "pricing_config": {
    "price": 200
  },
  "is_bookable": false
}

# Search items
GET /items?search=coffee&minPrice=100&maxPrice=500&category=beverages&page=1&limit=10&sortBy=price&order=desc

# Calculate price (⭐ Key endpoint)
GET /items/:id/price?quantity=2&time=10:30&addons[]=addon1&addons[]=addon2

Response:
{
  "success": true,
  "data": {
    "item_id": "...",
    "pricing_rule": "tiered",
    "base_price": 500,
    "addons": [...],
    "addon_total": 150,
    "subtotal": 650,
    "tax": {
      "applicable": true,
      "percentage": 18,
      "amount": 117,
      "inherited_from": "category"
    },
    "grand_total": 767
  }
}
Bookings
http# Create booking
POST /bookings
Content-Type: application/json

{
  "item_id": "507f1f77bcf86cd799439011",
  "booking_date": "2025-01-20",
  "start_time": "10:00",
  "end_time": "11:00",
  "customer_name": "John Doe",
  "customer_email": "john@example.com"
}

# Get available slots
GET /items/:id/available-slots?date=2025-01-20

Response:
{
  "success": true,
  "data": {
    "item_id": "...",
    "date": "2025-01-20",
    "availability_rules": [...],
    "booked_slots": [...],
    "available_slots": [
      { "start_time": "10:00", "end_time": "14:00" },
      { "start_time": "15:00", "end_time": "18:00" }
    ]
  }
}

# Cancel booking
PATCH /bookings/:id/cancel
Response Format
Success:
json{
  "success": true,
  "data": { /* result */ },
  "pagination": { /* if applicable */ }
}
Error:
json{
  "success": false,
  "message": "Validation error",
  "errors": [
    { "field": "name", "message": "Name is required" }
  ]
}
```

---

## Technical Decisions

### 1. Why MongoDB Over PostgreSQL?

| Criteria | MongoDB | PostgreSQL | Our Choice |
|----------|---------|------------|------------|
| **Pricing Config Flexibility** | Native nested objects | JSONB (requires casting) | ✅ MongoDB |
| **Schema Evolution** | No migrations | Migrations required | ✅ MongoDB |
| **Development Speed** | Fast iteration | Slower (schema planning) | ✅ MongoDB |
| **Data Integrity** | Application-level | Database-level | ❌ PostgreSQL wins |
| **Transaction Maturity** | Newer (v4.0+) | Battle-tested | ❌ PostgreSQL wins |
| **Query Performance** | Good for scale | Better for complex joins | ❌ PostgreSQL wins |

**Decision:** MongoDB

**Reasoning:**
1. **Pricing configs are naturally nested objects** → MongoDB stores them cleanly
2. **5-day timeline** → MongoDB's flexibility lets us iterate faster
3. **Assignment focuses on business logic** → Not database optimization
4. **Product company mindset** → Early-stage products often choose MongoDB for velocity

**What we're trading:**
- Giving up referential integrity enforcement
- Accepting slower complex queries
- Taking on transaction complexity

**What we gain:**
- Faster development (no migrations)
- Clearer mental model (documents = objects)
- Easier to explain in Loom video

**In production:** If this scaled to millions of items with heavy analytics, we'd migrate to PostgreSQL. But at this stage, **MongoDB matches the problem better**.

---

### 2. Why Service Layer Pattern?
```
Routes → Services → Models
Benefits:

Testability

typescript   // Easy to unit test without HTTP layer
   describe('ItemService', () => {
     it('calculates tax correctly', () => {
       const tax = itemService.resolveTax(mockItem);
       expect(tax.source).toBe('category');
     });
   });

Reusability

typescript   // Multiple routes can use same logic
   router.get('/items/:id/price', async (req, res) => {
     const price = await itemService.calculatePrice(req.params.id);
     res.json(price);
   });

   router.post('/bookings', async (req, res) => {
     const price = await itemService.calculatePrice(req.body.item_id);
     // Use price for payment processing...
   });

Clarity

Routes: "What HTTP endpoints exist?"
Services: "What business operations can we perform?"
Models: "What data exists?"



Alternative: Fat models (business logic in Mongoose models)

❌ Hard to test (requires DB connection)
❌ Hard to reuse across models
❌ Violates single responsibility


3. Why Zod for Validation?
typescriptimport { z } from 'zod';

// Define schema
const createItemSchema = z.object({
  name: z.string().min(1).max(255),
  category_id: z.string().optional(),
  subcategory_id: z.string().optional(),
  pricing_type: z.enum(['static', 'tiered', 'complimentary', 'discounted', 'dynamic']),
  pricing_config: z.object({}).passthrough(),
}).refine(
  (data) => !!data.category_id !== !!data.subcategory_id,
  { message: "Must provide exactly one: category_id or subcategory_id" }
);

// Auto-infer TypeScript type (no duplication!)
type CreateItemDto = z.infer<typeof createItemSchema>;

// Use in route
router.post('/', validateRequest(createItemSchema), async (req, res) => {
  // req.body is now type-safe and validated!
});
```

**Benefits:**
- ✅ Runtime validation (catches bad data)
- ✅ Type inference (DRY - define once, use everywhere)
- ✅ Custom rules (`refine` for XOR logic)
- ✅ Clear error messages

**vs Alternatives:**
- **Joi:** No TypeScript inference
- **class-validator:** Requires classes (more boilerplate)
- **Manual validation:** Error-prone, verbose

---

### 4. Project Structure
```
src/
├── config/                   # Infrastructure setup
│   ├── configuration.ts      # Environment variables
│   ├── database.ts           # MongoDB connection
│   └── express.ts            # Express app config
│
├── middleware/               # Request processing
│   ├── errorHandler.ts       # Global error handler
│   ├── validation.ts         # Zod middleware
│   └── asyncHandler.ts       # Async route wrapper
│
├── routes/                   # API endpoints
│   ├── category.routes.ts
│   ├── item.routes.ts
│   ├── booking.routes.ts
│   └── index.ts              # Route aggregator
│
├── services/                 # Business logic (⭐ Heart of the app)
│   ├── category/
│   │   ├── category.model.ts      # Mongoose schema
│   │   ├── category.service.ts    # CRUD + business logic
│   │   ├── category.validator.ts  # Zod schemas
│   │   └── index.ts               # Public exports
│   ├── item/
│   ├── booking/
│   └── pricing/                   # Pricing engine
│
├── common/                   # Shared utilities
│   ├── types/                # TypeScript interfaces
│   ├── utils/                # Helper functions
│   └── constants/            # Enums, constants
│
├── server.ts                 # Entry point
└── configuration.ts          # Config loader
Why this structure?

Clear separation: Know where to add features
Scalable: Each entity is self-contained
Testable: Services can be tested independently
Explainable: Easy to walk through in Loom video


Setup Instructions
Prerequisites

Node.js v18+ and npm
MongoDB 4.4+ (local or Atlas)
Git

Installation
bash# 1. Clone repository
git clone <your-repo-url>
cd guestara-assignment

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp configs/.local.env.example configs/.local.env

# Edit .local.env with your MongoDB URI:
# DATABASE_URL=mongodb://localhost:27017/guestara
# or
# DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/guestara
Environment Variables
bash# configs/.local.env
NODE_ENV=local
HOST=0.0.0.0
PORT=3000
DATABASE_URL=mongodb://localhost:27017/guestara
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
Running Locally
bash# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start

# Run tests
npm test
Verify Setup
bash# Health check
curl http://localhost:3000/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-01-15T...",
  "environment": "local"
}
Seed Data (Optional)
bash# Run seed script to populate sample data
npm run seed

Testing
Test Strategy
                 ╱╲
                ╱  ╲Continue3:13 AM╱ E2E╲         (5% - Full API tests)
╱──────╲
╱        ╲
╱Integration╲     (25% - Service + DB)
╱────────────╲
╱              ╲
╱     Unit       ╲   (70% - Pure logic)
╱──────────────────╲

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- item.service.test.ts
```

### Critical Test Cases

**Tax Inheritance:**
```typescript
✓ Item tax overrides subcategory
✓ Inherits from subcategory if item tax is null
✓ Falls back to category if both are null
✓ Updates when category tax changes (no stale data)
```

**Pricing Engine:**
```typescript
✓ Static pricing returns fixed price
✓ Tiered pricing selects correct tier
✓ Complimentary always returns 0
✓ Discounted pricing prevents negative prices
✓ Dynamic pricing throws error outside time windows
```

**Booking Conflicts:**
```typescript
✓ Prevents double booking same time slot
✓ Allows non-overlapping bookings
✓ Handles concurrent booking attempts (race condition)
✓ Validates availability rules (day/time)
```

---

## Challenges & Learnings

### 1. Hardest Technical Challenge: Booking Conflict Prevention

**The Problem:**
Two users booking the same slot simultaneously (race condition).

**Initial Approach:**
Simple query to check conflicts, then create booking.
```typescript
// ❌ Race condition
const conflict = await Booking.findOne({ /* overlap logic */ });
if (!conflict) {
  await Booking.create(data); // Not atomic!
}
```

**What Went Wrong:**
Between the check and create, another request could insert a booking.

**Final Solution:**
MongoDB transactions with session context.
```typescript
// ✅ Atomic
const session = await mongoose.startSession();
session.startTransaction();
const conflict = await Booking.findOne({ /* ... */ }).session(session);
if (!conflict) await Booking.create([data], { session });
await session.commitTransaction();
```

**Lessons Learned:**
- Read-then-write patterns are dangerous without locks
- Transactions add complexity but are necessary for correctness
- Testing edge cases (concurrent requests) is critical

---

### 2. Design Challenge: Tax Inheritance Without Duplication

**The Problem:**
When a category's tax changes, all child items must reflect the new value.

**Considered Approaches:**

| Approach | Pros | Cons |
|----------|------|------|
| Denormalize (store tax in items) | Fast queries | Stale data, complex sync |
| Database triggers | Auto-sync | DB-specific, hard to test |
| Runtime resolution | Always fresh | Multiple queries |

**Why Runtime Resolution Won:**
1. **Correctness over performance** at this scale
2. **Simplicity:** No sync logic, no triggers
3. **Testability:** Pure functions, easy to test
4. **Explainability:** Clear logic flow

**What I'd Change at Scale:**
Cache category tree in Redis to avoid repeated queries.

---

### 3. Three Things I Learned

1. **MongoDB Transactions Are Tricky**
   - Must pass `session` to every query in the transaction
   - Forgetting `.session(session)` creates silent bugs (query runs outside transaction)
   - Replica sets required (doesn't work with standalone MongoDB)

2. **Validation Belongs in Multiple Layers**
   - **Zod:** HTTP request validation
   - **Mongoose:** Schema-level defaults/required
   - **Service:** Business rule validation (e.g., XOR constraints)
   - No single layer is enough

3. **Design Docs Save Time**
   - Spent 2 hours planning architecture upfront
   - Saved 6+ hours of refactoring later
   - README-first development clarifies thinking

---

### 4. What I'd Improve With More Time

**Code Quality:**
- Add comprehensive integration tests (currently 70% coverage)
- Implement request/response logging (structured JSON logs)
- Add API versioning (`/api/v2/...`)

**Features:**
- Bulk operations (upload CSV of items)
- Recurring bookings (weekly meetings)
- Booking cancellation policies
- Email notifications for bookings

**Performance:**
- Redis caching for category tree
- Database indexing strategy (explain plan analysis)
- Pagination cursor-based (vs offset-based)

**Observability:**
- Error tracking (Sentry integration)
- Performance monitoring (APM)
- Database query profiling

**Security:**
- Rate limiting per user (not just IP)
- Input sanitization for XSS
- JWT authentication (if adding user accounts)

---

## Future Improvements

### If This Were Production

**Immediate (Week 1):**
- [ ] Add Redis for category tree caching
- [ ] Implement comprehensive logging (Winston/Pino)
- [ ] Add database indexes for common queries
- [ ] Write OpenAPI/Swagger documentation

**Short-term (Month 1):**
- [ ] Migrate to PostgreSQL for better analytics
- [ ] Add authentication/authorization (JWT + RBAC)
- [ ] Implement audit logs (who changed what when)
- [ ] Add monitoring (Prometheus + Grafana)

**Long-term (Quarter 1):**
- [ ] Microservices architecture (pricing service separate)
- [ ] Event-driven updates (Kafka/RabbitMQ)
- [ ] Multi-tenancy (support multiple restaurants)
- [ ] Advanced search (Elasticsearch)

---

## Tradeoffs Summary

### What We Prioritized

| Choice | Why |
|--------|-----|
| **MongoDB** | Flexibility > Referential integrity (at this scale) |
| **Runtime tax calculation** | Correctness > Performance |
| **Service layer** | Testability > Simplicity |
| **Transactions for bookings** | Correctness > Speed |
| **Soft deletes** | Data preservation > Query simplicity |

### What We Sacrificed

| Tradeoff | What We Gave Up | Why It's OK |
|----------|-----------------|-------------|
| **Query performance** | Complex SQL optimizations | Small dataset, not analytics-heavy |
| **Referential integrity** | Database-level FK constraints | Service-layer validation sufficient |
| **Advanced features** | Bulk uploads, recurring bookings | Focus on core complexity |
| **Full test coverage** | 100% coverage | 70% covers critical paths |

---

## Acknowledgments

Built as part of the Guestara Backend Internship Assignment.
