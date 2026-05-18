# SheenClassics – Full AI & SEO Integration Prompt for GitHub Copilot

> **Role:** You are a Senior Software Engineer taking over the SheenClassics e-commerce project.
> Your job is to implement complete AI integration, SEO metadata management, admin notifications,
> and all related improvements across the entire codebase in one thorough pass.
> Do NOT leave placeholders. Write production-ready, working code for every feature described below.

---

## 0. ENVIRONMENT SETUP

1. Install the following packages if not already present:
   ```
   npm install groq-sdk
   ```
   or if using fetch directly, no install needed — Groq's API is OpenAI-compatible REST.

2. Create a `.env` file in the project root (if it doesn't already exist) and add:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   ```
   Replace with the actual key. In Next.js use `NEXT_PUBLIC_GROQ_API_KEY` only if called from the browser; prefer server-side API routes for security.

3. Add `.env` to `.gitignore` immediately if not already there.

4. Create a central AI utility file at `lib/groq.js` (or `utils/groq.js`):
   ```js
   // lib/groq.js
   const GROQ_API_KEY = process.env.GROQ_API_KEY;
   const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
   const DEFAULT_MODEL = "llama3-8b-8192"; // fast, free-tier friendly

   export async function callGroq(messages, systemPrompt = "", maxTokens = 1024) {
     const body = {
       model: DEFAULT_MODEL,
       max_tokens: maxTokens,
       messages: [
         ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
         ...messages,
       ],
     };

     const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
         Authorization: `Bearer ${GROQ_API_KEY}`,
       },
       body: JSON.stringify(body),
     });

     if (!res.ok) {
       const error = await res.text();
       throw new Error(`Groq API error: ${res.status} – ${error}`);
     }

     const data = await res.json();
     return data.choices[0].message.content;
   }
   ```

---

## 1. CHATBOT – REPLACE PREFED ANSWERS WITH LIVE GROQ AI

### 1a. Create the backend API route

Create `pages/api/chat.js` (Next.js) or the equivalent route file for your framework:

```js
// pages/api/chat.js
import { callGroq } from "../../lib/groq";

const SYSTEM_PROMPT = `You are a helpful shopping assistant for SheenClassics, 
an e-commerce store selling classic and premium products. 
Help customers find products, answer questions about orders, shipping, returns, 
and provide style recommendations. Be friendly, concise, and professional. 
If you don't know something specific about an order, ask the customer for their order ID 
and tell them to contact support@sheenclassics.com. 
Never make up product details — only recommend based on what the customer describes.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages format" });
  }

  try {
    const reply = await callGroq(messages, SYSTEM_PROMPT, 512);
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Chat API error:", err);
    return res.status(500).json({ error: "AI service unavailable. Please try again." });
  }
}
```

### 1b. Update the Chatbot UI component

Find the existing chatbot component (likely named `Chatbot.jsx`, `ChatWidget.jsx`, or similar).
**Completely replace** the hardcoded/prefed answer logic with the following pattern:

```jsx
// components/Chatbot.jsx  (replace existing logic, keep your existing UI/styling)

import { useState, useRef, useEffect } from "react";

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm the SheenClassics assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I'm having trouble connecting. Please try again in a moment."
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    // Keep your existing chatbot container/toggle UI exactly as-is.
    // Only replace the message rendering and input handling sections:
    <div className="chatbot-container"> {/* your existing class names */}
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <p>{msg.content}</p>
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <p><em>Thinking…</em></p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything…"
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>
          {loading ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
```

**Important:** Do not remove existing styling classes. Only replace the state/logic/JSX structure for message handling. Keep the toggle button and open/close animation exactly as they are.

---

## 2. ADMIN DASHBOARD – ADD PRODUCT: SEO METADATA FIELDS WITH AI ASSISTANCE

### 2a. Update the Product model / schema

Find your product schema (Mongoose model, Prisma schema, or database table).
Add the following SEO fields:

```js
// If using Mongoose (models/Product.js) – add to existing schema:
seoTitle: { type: String, default: "" },
seoDescription: { type: String, default: "" },
seoKeywords: { type: String, default: "" },      // comma-separated
ogTitle: { type: String, default: "" },
ogDescription: { type: String, default: "" },
canonicalUrl: { type: String, default: "" },
structuredDataType: { type: String, default: "Product" },  // for JSON-LD
```

```prisma
// If using Prisma (schema.prisma) – add to Product model:
seoTitle        String  @default("")
seoDescription  String  @default("")
seoKeywords     String  @default("")
ogTitle         String  @default("")
ogDescription   String  @default("")
canonicalUrl    String  @default("")
```

Run `npx prisma migrate dev` after updating the Prisma schema.

### 2b. Create the AI Metadata generation API route

Create `pages/api/admin/generate-seo.js`:

```js
// pages/api/admin/generate-seo.js
import { callGroq } from "../../../lib/groq";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { productName, productDescription, category, price } = req.body;

  if (!productName) return res.status(400).json({ error: "Product name required" });

  const prompt = `Generate SEO metadata for an e-commerce product listed on SheenClassics.
Product Name: ${productName}
Category: ${category || "General"}
Description: ${productDescription || "Not provided"}
Price: ${price ? `$${price}` : "Not provided"}

Return ONLY a valid JSON object with these exact keys (no markdown, no explanation):
{
  "seoTitle": "60 chars max, compelling, includes product name and key benefit",
  "seoDescription": "150-160 chars, includes a call-to-action, unique selling point",
  "seoKeywords": "8-12 comma-separated keywords, mix of short and long-tail",
  "ogTitle": "Social media share title, engaging, under 60 chars",
  "ogDescription": "Social media description, under 200 chars"
}`;

  try {
    const raw = await callGroq([{ role: "user", content: prompt }], "", 512);
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error("SEO generation error:", err);
    return res.status(500).json({ error: "Failed to generate SEO metadata" });
  }
}
```

### 2c. Update the Add Product admin page

Find your Add Product page (likely `pages/admin/add-product.jsx` or `pages/admin/products/new.jsx`).
Add the SEO metadata section **after** the existing product fields:

```jsx
// Add to the top of the file with other imports:
import { useState } from "react"; // already there likely
// Add this state inside the component alongside other form state:
const [seoData, setSeoData] = useState({
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  ogTitle: "",
  ogDescription: "",
  canonicalUrl: "",
});
const [seoLoading, setSeoLoading] = useState(false);
const [seoError, setSeoError] = useState("");

// Add this function inside the component:
async function generateSEO() {
  setSeoLoading(true);
  setSeoError("");
  try {
    const res = await fetch("/api/admin/generate-seo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName: formData.name,         // use your actual state variable names
        productDescription: formData.description,
        category: formData.category,
        price: formData.price,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    setSeoData(prev => ({ ...prev, ...data }));
  } catch (err) {
    setSeoError("Could not generate SEO. Fill fields manually or try again.");
  } finally {
    setSeoLoading(false);
  }
}

// Add this JSX section in your form, AFTER the last existing field, BEFORE the submit button:
```

```jsx
{/* ── SEO METADATA SECTION ── */}
<div className="admin-section seo-section">
  <div className="section-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    <h3>🔍 SEO Metadata</h3>
    <button
      type="button"
      onClick={generateSEO}
      disabled={seoLoading || !formData.name}
      style={{
        background: "#6366f1",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        padding: "8px 16px",
        cursor: "pointer",
        fontWeight: 600,
      }}
    >
      {seoLoading ? "✨ Generating…" : "✨ Auto-Generate with AI"}
    </button>
  </div>

  {seoError && <p style={{ color: "red", fontSize: 13 }}>{seoError}</p>}

  <label>SEO Title <span style={{color:"#888", fontSize:12}}>(max 60 chars)</span></label>
  <input
    type="text"
    maxLength={60}
    value={seoData.seoTitle}
    onChange={e => setSeoData(p => ({ ...p, seoTitle: e.target.value }))}
    placeholder="e.g. Buy Classic Leather Bag – SheenClassics"
  />

  <label>Meta Description <span style={{color:"#888", fontSize:12}}>(max 160 chars)</span></label>
  <textarea
    maxLength={160}
    rows={3}
    value={seoData.seoDescription}
    onChange={e => setSeoData(p => ({ ...p, seoDescription: e.target.value }))}
    placeholder="Compelling description shown in Google search results…"
  />

  <label>Keywords <span style={{color:"#888", fontSize:12}}>(comma-separated)</span></label>
  <input
    type="text"
    value={seoData.seoKeywords}
    onChange={e => setSeoData(p => ({ ...p, seoKeywords: e.target.value }))}
    placeholder="classic bag, leather handbag, premium tote…"
  />

  <label>OG Title (Social Share)</label>
  <input
    type="text"
    maxLength={60}
    value={seoData.ogTitle}
    onChange={e => setSeoData(p => ({ ...p, ogTitle: e.target.value }))}
    placeholder="Title shown when shared on Facebook/WhatsApp…"
  />

  <label>OG Description (Social Share)</label>
  <textarea
    maxLength={200}
    rows={2}
    value={seoData.ogDescription}
    onChange={e => setSeoData(p => ({ ...p, ogDescription: e.target.value }))}
    placeholder="Description shown when shared on social media…"
  />

  <label>Canonical URL <span style={{color:"#888", fontSize:12}}>(optional, leave blank to auto-set)</span></label>
  <input
    type="text"
    value={seoData.canonicalUrl}
    onChange={e => setSeoData(p => ({ ...p, canonicalUrl: e.target.value }))}
    placeholder="https://sheenclassics.com/products/product-slug"
  />
</div>
```

Make sure `seoData` is included in the form submission payload sent to your create-product API route.

### 2d. Use SEO metadata in product pages

Find your individual product page (`pages/products/[id].jsx` or similar).
Replace or update its `<Head>` section:

```jsx
import Head from "next/head";

// Inside the component, after fetching product data:
const seoTitle = product.seoTitle || product.name;
const seoDesc = product.seoDescription || product.description?.slice(0, 155);
const canonical = product.canonicalUrl || `https://sheenclassics.com/products/${product.slug || product._id}`;

return (
  <>
    <Head>
      <title>{seoTitle} | SheenClassics</title>
      <meta name="description" content={seoDesc} />
      {product.seoKeywords && <meta name="keywords" content={product.seoKeywords} />}
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:type" content="product" />
      <meta property="og:title" content={product.ogTitle || seoTitle} />
      <meta property="og:description" content={product.ogDescription || seoDesc} />
      <meta property="og:url" content={canonical} />
      {product.images?.[0] && <meta property="og:image" content={product.images[0]} />}
      <meta property="og:site_name" content="SheenClassics" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={product.ogTitle || seoTitle} />
      <meta name="twitter:description" content={product.ogDescription || seoDesc} />
      {product.images?.[0] && <meta name="twitter:image" content={product.images[0]} />}

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.description,
            image: product.images || [],
            offers: {
              "@type": "Offer",
              price: product.price,
              priceCurrency: "USD",
              availability: product.stock > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            },
          }),
        }}
      />
    </Head>
    {/* rest of product page JSX */}
  </>
);
```

---

## 3. ADMIN DASHBOARD – LOW STOCK NOTIFICATIONS

### 3a. Define the threshold

In your constants or config file, or at the top of relevant files:
```js
const LOW_STOCK_THRESHOLD = 5; // items — adjust to your preference
```

### 3b. Create the low stock API route

Create `pages/api/admin/low-stock.js`:

```js
// pages/api/admin/low-stock.js
import { connectDB } from "../../../lib/db";   // use your actual DB connection utility
import Product from "../../../models/Product";  // use your actual Product model path

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const LOW_STOCK_THRESHOLD = 5;

  try {
    await connectDB();
    const lowStockProducts = await Product.find({
      stock: { $lte: LOW_STOCK_THRESHOLD, $gt: 0 }
    }).select("name stock _id images").limit(20);

    const outOfStock = await Product.find({ stock: 0 })
      .select("name stock _id images").limit(10);

    return res.status(200).json({ lowStockProducts, outOfStock });
  } catch (err) {
    console.error("Low stock check error:", err);
    return res.status(500).json({ error: "Failed to check stock levels" });
  }
}
```

If using Prisma instead of Mongoose:
```js
import { prisma } from "../../../lib/prisma";
const lowStockProducts = await prisma.product.findMany({
  where: { stock: { lte: 5, gt: 0 } },
  select: { id: true, name: true, stock: true, images: true },
  take: 20,
});
```

### 3c. Create the Notification Bell component

Create `components/admin/StockNotifications.jsx`:

```jsx
import { useState, useEffect, useRef } from "react";

export default function StockNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const bellRef = useRef(null);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/admin/low-stock");
      const data = await res.json();

      const items = [];

      (data.outOfStock || []).forEach(p => {
        items.push({
          id: p._id || p.id,
          type: "out",
          message: `⛔ "${p.name}" is OUT OF STOCK`,
          urgency: "critical",
        });
      });

      (data.lowStockProducts || []).forEach(p => {
        items.push({
          id: p._id || p.id,
          type: "low",
          message: `⚠️ "${p.name}" is low — only ${p.stock} left`,
          urgency: "warning",
        });
      });

      setNotifications(items);
    } catch (err) {
      console.error("Notification fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // re-check every 60 seconds
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const criticalCount = notifications.filter(n => n.urgency === "critical").length;
  const totalCount = notifications.length;

  return (
    <div ref={bellRef} style={{ position: "relative", display: "inline-block" }}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 24,
          position: "relative",
          padding: "4px 8px",
        }}
        title="Stock Notifications"
      >
        🔔
        {totalCount > 0 && (
          <span style={{
            position: "absolute",
            top: 0,
            right: 0,
            background: criticalCount > 0 ? "#ef4444" : "#f59e0b",
            color: "#fff",
            borderRadius: "50%",
            fontSize: 10,
            fontWeight: 700,
            width: 18,
            height: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            {totalCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div style={{
          position: "absolute",
          right: 0,
          top: "110%",
          width: 320,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          zIndex: 1000,
          overflow: "hidden",
        }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", fontWeight: 700, fontSize: 14 }}>
            📦 Stock Alerts
          </div>

          {loading && <p style={{ padding: 16, color: "#888", fontSize: 13 }}>Checking inventory…</p>}

          {!loading && notifications.length === 0 && (
            <p style={{ padding: 16, color: "#22c55e", fontSize: 13 }}>✅ All products are well stocked!</p>
          )}

          {!loading && notifications.map((n, i) => (
            <div key={i} style={{
              padding: "10px 16px",
              borderBottom: "1px solid #f9fafb",
              background: n.urgency === "critical" ? "#fef2f2" : "#fffbeb",
              fontSize: 13,
              color: n.urgency === "critical" ? "#b91c1c" : "#92400e",
            }}>
              {n.message}
            </div>
          ))}

          <div style={{ padding: "10px 16px", textAlign: "center" }}>
            <a href="/admin/products" style={{ fontSize: 12, color: "#6366f1", textDecoration: "none" }}>
              View all products →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 3d. Add the notification bell to the Admin Layout/Navbar

Find your admin navbar or layout component (`components/admin/AdminNavbar.jsx`, `layouts/AdminLayout.jsx`, or similar).
Import and place `<StockNotifications />` in the top-right area of the navbar:

```jsx
import StockNotifications from "../components/admin/StockNotifications";

// Inside your admin navbar JSX, in the right-side icons area:
<div className="admin-navbar-right">
  <StockNotifications />
  {/* your existing profile/logout icons */}
</div>
```

---

## 4. SEO CONTENT GENERATION – AI-POWERED PAGE CONTENT

This section adds AI-generated SEO-optimized content for product descriptions,
category pages, blog posts (if any), and a global site SEO audit helper.

### 4a. Create the SEO Content Generation API route

Create `pages/api/admin/generate-content.js`:

```js
// pages/api/admin/generate-content.js
import { callGroq } from "../../../lib/groq";

const CONTENT_TYPES = ["product-description", "category-intro", "blog-post", "homepage-hero", "about-snippet"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { type, context } = req.body;

  if (!CONTENT_TYPES.includes(type)) {
    return res.status(400).json({ error: "Invalid content type" });
  }

  const prompts = {
    "product-description": `
      Write an SEO-optimized product description for an e-commerce store called SheenClassics.
      Product Name: ${context.name}
      Category: ${context.category || "General"}
      Key Features: ${context.features || "Not specified"}
      Target Audience: ${context.audience || "General shoppers"}
      Tone: Premium, trustworthy, elegant.

      Write 2-3 paragraphs. First paragraph: hook + main benefit. 
      Second: features/details. Third: call-to-action.
      Use natural keyword placement. Do NOT use generic phrases like "look no further".
      Output plain text only, no markdown.
    `,
    "category-intro": `
      Write a short SEO-optimized category introduction paragraph (100-150 words) for the 
      "${context.categoryName}" category on SheenClassics, a premium e-commerce store.
      Mention the breadth of products, quality, and what makes SheenClassics different.
      End with a gentle call to action. Plain text only.
    `,
    "blog-post": `
      Write a complete SEO-optimized blog post for SheenClassics e-commerce store.
      Topic: ${context.topic}
      Target keyword: ${context.keyword || context.topic}
      Word count: approximately 500 words.
      Structure: H1 title, intro paragraph, 3-4 H2 sections with content, conclusion with CTA.
      Tone: Helpful, authoritative, premium feel.
      Output in plain markdown format.
    `,
    "homepage-hero": `
      Write 3 variations of homepage hero copy for SheenClassics, a premium e-commerce store.
      Each variation should have:
      - A headline (max 8 words, punchy)
      - A subheading (max 20 words, benefit-focused)
      - A CTA button label (max 4 words)
      Return ONLY a JSON array like:
      [
        { "headline": "...", "subheading": "...", "cta": "..." },
        { "headline": "...", "subheading": "...", "cta": "..." },
        { "headline": "...", "subheading": "...", "cta": "..." }
      ]
    `,
    "about-snippet": `
      Write a 100-word SEO-optimized "About Us" snippet for SheenClassics.
      Emphasize quality, customer trust, and classic style. 
      Make it warm and human. Plain text only.
    `,
  };

  try {
    const raw = await callGroq([{ role: "user", content: prompts[type] }], "", 1024);

    // For homepage-hero, parse JSON; for others return plain text
    if (type === "homepage-hero") {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return res.status(200).json({ content: parsed, type });
    }

    return res.status(200).json({ content: raw.trim(), type });
  } catch (err) {
    console.error("Content generation error:", err);
    return res.status(500).json({ error: "Content generation failed. Please try again." });
  }
}
```

### 4b. Create the SEO Content Studio admin page

Create `pages/admin/seo-studio.jsx`:

```jsx
// pages/admin/seo-studio.jsx
import { useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout"; // use your actual layout

const CONTENT_TYPES = [
  { value: "product-description", label: "📦 Product Description" },
  { value: "category-intro",      label: "🗂️ Category Intro" },
  { value: "blog-post",           label: "📝 Blog Post" },
  { value: "homepage-hero",       label: "🏠 Homepage Hero Copy" },
  { value: "about-snippet",       label: "🏷️ About Us Snippet" },
];

export default function SeoStudio() {
  const [type, setType] = useState("product-description");
  const [context, setContext] = useState({});
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError("");
    setOutput(null);
    try {
      const res = await fetch("/api/admin/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, context }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOutput(data.content);
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard() {
    const text = typeof output === "string" ? output : JSON.stringify(output, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Dynamic context fields based on selected type
  function renderContextFields() {
    switch (type) {
      case "product-description":
        return (
          <>
            <input placeholder="Product Name *" onChange={e => setContext(p => ({ ...p, name: e.target.value }))} />
            <input placeholder="Category (e.g. Bags, Watches)" onChange={e => setContext(p => ({ ...p, category: e.target.value }))} />
            <textarea rows={2} placeholder="Key Features (e.g. leather strap, waterproof, handmade)" onChange={e => setContext(p => ({ ...p, features: e.target.value }))} />
            <input placeholder="Target Audience (e.g. working professionals, women 25-45)" onChange={e => setContext(p => ({ ...p, audience: e.target.value }))} />
          </>
        );
      case "category-intro":
        return (
          <input placeholder="Category Name *" onChange={e => setContext(p => ({ ...p, categoryName: e.target.value }))} />
        );
      case "blog-post":
        return (
          <>
            <input placeholder="Blog Topic *" onChange={e => setContext(p => ({ ...p, topic: e.target.value }))} />
            <input placeholder="Target Keyword (for SEO)" onChange={e => setContext(p => ({ ...p, keyword: e.target.value }))} />
          </>
        );
      case "homepage-hero":
      case "about-snippet":
        return <p style={{ color: "#888", fontSize: 13 }}>No extra input needed — click Generate!</p>;
      default:
        return null;
    }
  }

  return (
    <AdminLayout>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>✨ AI SEO Content Studio</h1>
        <p style={{ color: "#6b7280", marginBottom: 28 }}>
          Generate high-quality, SEO-optimized content for your store using AI. 
          Review and edit before publishing.
        </p>

        {/* Type Selector */}
        <label style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>Content Type</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
          {CONTENT_TYPES.map(ct => (
            <button
              key={ct.value}
              onClick={() => { setType(ct.value); setContext({}); setOutput(null); }}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "2px solid",
                borderColor: type === ct.value ? "#6366f1" : "#e5e7eb",
                background: type === ct.value ? "#eef2ff" : "#fff",
                color: type === ct.value ? "#6366f1" : "#374151",
                fontWeight: type === ct.value ? 700 : 400,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {ct.label}
            </button>
          ))}
        </div>

        {/* Context Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {renderContextFields()}
        </div>

        {/* Generate Button */}
        <button
          onClick={generate}
          disabled={loading}
          style={{
            background: loading ? "#a5b4fc" : "#6366f1",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "12px 28px",
            fontWeight: 700,
            fontSize: 15,
            cursor: loading ? "not-allowed" : "pointer",
            marginBottom: 24,
          }}
        >
          {loading ? "✨ Generating with AI…" : "✨ Generate Content"}
        </button>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 16, color: "#b91c1c", marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Output */}
        {output && (
          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, margin: 0 }}>Generated Content</h3>
              <button
                onClick={copyToClipboard}
                style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}
              >
                {copied ? "✅ Copied!" : "📋 Copy"}
              </button>
            </div>

            {typeof output === "string" ? (
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, color: "#1f2937", lineHeight: 1.7 }}>
                {output}
              </pre>
            ) : Array.isArray(output) ? (
              // Homepage hero variations
              output.map((v, i) => (
                <div key={i} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: i < output.length - 1 ? "1px solid #e5e7eb" : "none" }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>Variation {i + 1}</p>
                  <p style={{ margin: "4px 0" }}><strong>Headline:</strong> {v.headline}</p>
                  <p style={{ margin: "4px 0" }}><strong>Subheading:</strong> {v.subheading}</p>
                  <p style={{ margin: "4px 0" }}><strong>CTA:</strong> {v.cta}</p>
                </div>
              ))
            ) : null}

            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 16, marginBottom: 0 }}>
              ⚠️ Always review AI-generated content before publishing. Edit as needed to match your brand voice.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
```

### 4c. Add SEO Studio link to the Admin Sidebar

Find your admin sidebar component. Add this link to the navigation list:

```jsx
<li>
  <a href="/admin/seo-studio">✨ SEO Content Studio</a>
</li>
```

### 4d. Add Global SEO to `_app.js` or Root Layout

In `pages/_app.js` (or `app/layout.js` for Next.js App Router), add global default SEO tags
that will apply site-wide but be overridden by individual page `<Head>` blocks:

```jsx
// pages/_app.js
import Head from "next/head";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        {/* Default site-wide SEO — individual pages override these */}
        <meta name="robots" content="index, follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="icon" href="/favicon.ico" />

        {/* Default Open Graph fallback */}
        <meta property="og:site_name" content="SheenClassics" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_US" />

        {/* Default Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@sheenclassics" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
```

### 4e. Create `sitemap.xml` generation route

Create `pages/api/sitemap.js`:

```js
// pages/api/sitemap.js
import { connectDB } from "../../lib/db";
import Product from "../../models/Product";

export default async function handler(req, res) {
  await connectDB();
  const products = await Product.find({}).select("_id slug updatedAt").lean();

  const baseUrl = "https://sheenclassics.com";

  const staticPages = [
    { url: "/",            priority: "1.0", freq: "daily" },
    { url: "/products",    priority: "0.9", freq: "daily" },
    { url: "/about",       priority: "0.7", freq: "monthly" },
    { url: "/contact",     priority: "0.6", freq: "monthly" },
  ];

  const productUrls = products.map(p => ({
    url: `/products/${p.slug || p._id}`,
    lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
    priority: "0.8",
    freq: "weekly",
  }));

  const allUrls = [...staticPages, ...productUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${baseUrl}${u.url}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.freq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, s-maxage=86400");
  res.status(200).send(xml);
}
```

Also create `pages/robots.txt.js`:

```js
// pages/robots.txt.js
export default function handler(req, res) {
  res.setHeader("Content-Type", "text/plain");
  res.send(`User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: https://sheenclassics.com/api/sitemap`);
}
```

---

## 5. FINAL CHECKLIST FOR COPILOT

After implementing everything above, verify each item:

- [ ] `.env` has `GROQ_API_KEY` set and `.gitignore` includes `.env`
- [ ] `lib/groq.js` central utility exists and is importable
- [ ] Chatbot sends messages to `/api/chat` and displays live AI replies
- [ ] Chatbot shows loading state and handles errors gracefully
- [ ] Add Product form has all 6 SEO fields visible and editable
- [ ] "Auto-Generate with AI" button on Add Product calls `/api/admin/generate-seo` and fills fields
- [ ] Product model/schema has all SEO fields saved to DB
- [ ] Product detail page `<Head>` uses SEO fields with JSON-LD structured data
- [ ] `/api/admin/low-stock` returns products below threshold
- [ ] `<StockNotifications />` bell renders in admin navbar with badge count
- [ ] Bell dropdown shows out-of-stock (red) and low-stock (yellow) alerts separately
- [ ] Notifications auto-refresh every 60 seconds
- [ ] `/admin/seo-studio` page loads with all 5 content type options
- [ ] SEO Studio generates content for each type and shows copy button
- [ ] SEO Studio is linked in admin sidebar navigation
- [ ] `_app.js` has global default SEO meta tags
- [ ] `/api/sitemap` returns valid XML with all product URLs
- [ ] `/robots.txt` blocks `/admin/` and `/api/` from crawlers

---

## 6. IMPORTANT NOTES FOR COPILOT

1. **Do NOT hardcode the API key anywhere in source files.** Always read from `process.env.GROQ_API_KEY`.
2. **Adapt import paths** — `../../lib/groq`, `../../models/Product`, `../../lib/db` etc. must match the actual project folder structure.
3. **Preserve all existing styling** — do not remove or rename existing CSS classes. Only add new styles via inline styles or new class names to avoid conflicts.
4. **State variable names** — the form state in Add Product (`formData.name`, `formData.description`, etc.) must match whatever the existing component actually uses. Inspect the existing state before wiring up the SEO generator.
5. **Database adapter** — all DB queries are shown in Mongoose syntax. If the project uses Prisma, SQLite, Supabase, or another ORM, translate accordingly. The logic is identical — only the query syntax changes.
6. **Groq model** — `llama3-8b-8192` is used throughout. If the free tier changes, swap to `mixtral-8x7b-32768` or `gemma-7b-it` — both are available on Groq free tier.
