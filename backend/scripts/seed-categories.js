#!/usr/bin/env node
/**
 * Seeds bilingual categories matching the Miracle Times frontend demo.
 * Safe to re-run: uses INSERT... ON DUPLICATE KEY UPDATE on slug.
 */
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { withTransaction, closePool } = require("../src/config/database");

const categories = [
 {
 slug: "uttar-pradesh",
 display_order: 10,
 hi: {
 name: "उत्तर प्रदेश",
 description:
 "उत्तर प्रदेश के शहरों, कस्बों, खेती और जनसुविधाओं पर रिपोर्ट। ये कहानियाँ प्रकाशन का प्रारूप दिखाती हैं।",
 },
 en: {
 name: "Uttar Pradesh",
 description:
 "Reports on cities, towns, farming, and civic services across Uttar Pradesh.",
 },
 },
 {
 slug: "lucknow",
 display_order: 20,
 hi: {
 name: "लखनऊ",
 description:
 "लखनऊ की यातायात, बाजार, स्टेशन और शहर की सुविधाओं पर केंद्रित खबरें।",
 },
 en: {
 name: "Lucknow",
 description:
 "Coverage of Lucknow traffic, markets, stations, and city services.",
 },
 },
 {
 slug: "politics",
 display_order: 30,
 hi: {
 name: "राजनीति",
 description:
 "विधानसभा, स्थानीय निकाय और नागरिक प्रक्रियाओं पर काल्पनिक संपादकीय बुलेटिन। इनमें किसी वास्तविक बयान का दावा नहीं है।",
 },
 en: {
 name: "Politics",
 description:
 "Bulletins on assembly, civic bodies, and citizen processes. No real statements claimed.",
 },
 },
 {
 slug: "national",
 display_order: 40,
 hi: {
 name: "देश",
 description: "रेल, ऊर्जा और शिक्षा जैसे राष्ट्रीय विषयों पर कवरेज।",
 },
 en: {
 name: "National",
 description: "National coverage of rail, energy, education, and related topics.",
 },
 },
 {
 slug: "world",
 display_order: 50,
 hi: {
 name: "दुनिया",
 description: "व्यापार और जलवायु जैसे अंतरराष्ट्रीय विषयों की संक्षिप्त खबरें।",
 },
 en: {
 name: "World",
 description: "Brief stories on international trade, climate, and related topics.",
 },
 },
 {
 slug: "business",
 display_order: 60,
 hi: {
 name: "कारोबार",
 description: "लघु उद्योग, मंडी और स्थानीय कारोबार पर आर्थिक रिपोर्ट।",
 },
 en: {
 name: "Business",
 description: "Business reports on MSMEs, markets, and local enterprise.",
 },
 },
 {
 slug: "education",
 display_order: 70,
 hi: {
 name: "शिक्षा",
 description: "परीक्षा, छात्रवृत्ति और पुस्तकालयों से जुड़ी शैक्षणिक सूचनाएँ।",
 },
 en: {
 name: "Education",
 description: "education notices on exams, scholarships, and libraries.",
 },
 },
 {
 slug: "crime",
 display_order: 80,
 hi: {
 name: "अपराध",
 description:
 "साइबर सावधानी और यातायात जांच पर जागरूकता आधारित रिपोर्ट। इनमें किसी व्यक्ति पर आरोप नहीं लगाया गया है।",
 },
 en: {
 name: "Crime",
 description:
 "Awareness-style reports on cyber safety and traffic checks. No accusations against individuals.",
 },
 },
 {
 slug: "technology",
 display_order: 90,
 hi: {
 name: "टेक्नोलॉजी",
 description: "डिजिटल सेवाओं और नागरिक तकनीक पर सरल व्याख्या।",
 },
 en: {
 name: "Technology",
 description: "Simple explainers on digital services and civic technology.",
 },
 },
 {
 slug: "sports",
 display_order: 100,
 hi: {
 name: "खेल",
 description: "स्थानीय क्रिकेट और खेल शिविरों की खेल खबरें।",
 },
 en: {
 name: "Sports",
 description: "sports stories on local cricket and training camps.",
 },
 },
 {
 slug: "entertainment",
 display_order: 110,
 hi: {
 name: "मनोरंजन",
 description: "रंगमंच, लोकगीत और सामुदायिक कार्यक्रमों की सांस्कृतिक खबरें।",
 },
 en: {
 name: "Entertainment",
 description: "cultural stories on theatre, folk music, and community events.",
 },
 },
 {
 slug: "health",
 display_order: 120,
 hi: {
 name: "स्वास्थ्य",
 description:
 "स्वास्थ्य शिविरों और सामान्य सावधानी की जानकारी। यह चिकित्सकीय सलाह नहीं है।",
 },
 en: {
 name: "Health",
 description:
 "health-camp and general precaution notes. This is not medical advice.",
 },
 },
];

async function upsertCategory(connection, category) {
 const [existing] = await connection.execute(
 "SELECT id FROM categories WHERE slug = ? LIMIT 1",
 [category.slug],
 );

 let categoryId;
 if (existing.length) {
 categoryId = existing[0].id;
 await connection.execute(
 `UPDATE categories
 SET is_active = 1, display_order = ?, updated_at = CURRENT_TIMESTAMP
 WHERE id = ?`,
 [category.display_order, categoryId],
 );
 } else {
 const [result] = await connection.execute(
 `INSERT INTO categories (slug, is_active, display_order)
 VALUES (?, 1, ?)`,
 [category.slug, category.display_order],
 );
 categoryId = result.insertId;
 }

 for (const language_code of ["hi", "en"]) {
 const translation = category[language_code];
 await connection.execute(
 `INSERT INTO category_translations (category_id, language_code, name, description)
 VALUES (?, ?, ?, ?)
 ON DUPLICATE KEY UPDATE
 name = VALUES(name),
 description = VALUES(description),
 updated_at = CURRENT_TIMESTAMP`,
 [categoryId, language_code, translation.name, translation.description],
 );
 }

 return categoryId;
}

async function main() {
 await withTransaction(async (connection) => {
 for (const category of categories) {
 const id = await upsertCategory(connection, category);
 console.log(`Upserted category ${category.slug} (id=${id})`);
 }
 });
 console.log(`Seeded ${categories.length} bilingual categories.`);
}

main()
.catch((error) => {
 console.error("Category seed failed:", error.message);
 process.exitCode = 1;
 })
.finally(async () => {
 await closePool();
 });
