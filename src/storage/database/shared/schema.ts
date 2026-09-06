import { pgTable, serial, timestamp, index, pgPolicy, varchar, text, boolean, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const categories = pgTable("categories", {
	id: serial().primaryKey().notNull(),
	slug: varchar({ length: 50 }).notNull().unique(),
	nameZh: varchar("name_zh", { length: 100 }).notNull(),
	nameEn: varchar("name_en", { length: 100 }).notNull(),
	emoji: varchar({ length: 20 }).notNull(),
	descriptionZh: text("description_zh"),
	descriptionEn: text("description_en"),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("categories_sort_order_idx").using("btree", table.sortOrder.asc().nullsLast().op("int4_ops")),
]);

export const words = pgTable("words", {
	id: varchar({ length: 36 }).default(sql`(gen_random_uuid())::character varying(36)`).primaryKey().notNull(),
	mongolian: text().notNull(),
	pinyin: text(),
	translationZh: text("translation_zh").notNull(),
	translationEn: text("translation_en").notNull(),
	theme: varchar({ length: 50 }).notNull(),
	sortOrder: integer("sort_order").default(0),
	audioUrl: text("audio_url"),
	exampleMongolian: text("example_mongolian"),
	exampleTranslationZh: text("example_translation_zh"),
	exampleTranslationEn: text("example_translation_en"),
	isUserUploaded: boolean("is_user_uploaded").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdByUserId: varchar("created_by_user_id", { length: 36 }),
	createdByName: varchar("created_by_name", { length: 100 }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("words_theme_sort_idx").using("btree", table.theme.asc().nullsLast().op("text_ops"), table.sortOrder.asc().nullsLast().op("int4_ops")),
	index("words_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("words_created_by_user_id_idx").using("btree", table.createdByUserId.asc().nullsLast().op("text_ops")),
	index("words_is_user_uploaded_idx").using("btree", table.isUserUploaded.asc().nullsLast().op("bool_ops")),
	index("words_theme_idx").using("btree", table.theme.asc().nullsLast().op("text_ops")),
	pgPolicy("words_登录用户可删除", { as: "permissive", for: "delete", to: ["public"], using: sql`(( SELECT auth.role() AS role) = 'authenticated'::text)` }),
	pgPolicy("words_登录用户可更新", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("words_登录用户可写入", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("words_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
]);

export const wisdomQuotes = pgTable("wisdom_quotes", {
	id: varchar({ length: 36 }).default(sql`(gen_random_uuid())::character varying(36)`).primaryKey().notNull(),
	mongolian: text().notNull(),
	translationZh: text("translation_zh").notNull(),
	translationEn: text("translation_en").notNull(),
	author: text(),
	isUserUploaded: boolean("is_user_uploaded").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdByUserId: varchar("created_by_user_id", { length: 36 }),
	createdByName: varchar("created_by_name", { length: 100 }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("wisdom_quotes_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("wisdom_quotes_created_by_user_id_idx").using("btree", table.createdByUserId.asc().nullsLast().op("text_ops")),
	index("wisdom_quotes_is_user_uploaded_idx").using("btree", table.isUserUploaded.asc().nullsLast().op("bool_ops")),
	pgPolicy("wisdom_quotes_登录用户可删除", { as: "permissive", for: "delete", to: ["public"], using: sql`(( SELECT auth.role() AS role) = 'authenticated'::text)` }),
	pgPolicy("wisdom_quotes_登录用户可更新", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("wisdom_quotes_登录用户可写入", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("wisdom_quotes_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
]);

export const audioRecords = pgTable("audio_records", {
	id: varchar({ length: 36 }).default(sql`(gen_random_uuid())::character varying(36)`).primaryKey().notNull(),
	wordId: varchar("word_id", { length: 36 }).notNull(),
	audioUrl: text("audio_url").notNull(),
	createdByUserId: varchar("created_by_user_id", { length: 36 }).notNull(),
	createdByName: varchar("created_by_name", { length: 100 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	// 标签：official（官方发音）/ community（社区发音，默认）
	label: varchar({ length: 20 }).default('community').notNull(),
	// 投票缓存（写入 audio_votes 时同步累加）
	upvotes: integer().default(0).notNull(),
	downvotes: integer().default(0).notNull(),
}, (table) => [
	index("audio_records_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("audio_records_created_by_user_id_idx").using("btree", table.createdByUserId.asc().nullsLast().op("text_ops")),
	index("audio_records_word_id_idx").using("btree", table.wordId.asc().nullsLast().op("text_ops")),
	index("audio_records_label_idx").using("btree", table.label.asc().nullsLast().op("text_ops")),
]);

// 音频投票表：user_id + audio_id 联合主键（一用户对一条音频只能投一次）
export const audioVotes = pgTable("audio_votes", {
	userId: varchar("user_id", { length: 36 }).notNull(),
	audioId: varchar("audio_id", { length: 36 }).notNull(),
	voteType: varchar("vote_type", { length: 10 }).notNull(), // 'up' | 'down'
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("audio_votes_audio_id_idx").using("btree", table.audioId.asc().nullsLast().op("text_ops")),
]);

export const profiles = pgTable("profiles", {
	id: varchar({ length: 36 }).primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	displayName: varchar("display_name", { length: 100 }),
	role: varchar({ length: 20 }).default('user').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("profiles_id_idx").using("btree", table.id.asc().nullsLast().op("text_ops")),
	index("profiles_role_idx").using("btree", table.role.asc().nullsLast().op("text_ops")),
]);
