/**
 * 与 profiles / xp_rules / levels 表对应的类型
 */

export type UserRole = "user" | "admin";

export interface Profile {
  id: string;
  display_name: string;
  role: UserRole;
  created_at: number;
}

export interface AuthState {
  user: { id: string; email: string | null } | null;
  profile: Profile | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  loading: boolean;
}

export interface XPRule {
  id: string;
  value: number;
  description_zh: string;
  description_en: string;
  sort_order: number;
  updated_at: number;
}

export interface Level {
  level: number;
  min_xp: number;
  name_zh: string;
  name_en: string;
  icon: string;
  sort_order: number;
  updated_at: number;
}

// =====================================================
// 公告系统 (Announcements)
// =====================================================
export type AnnouncementType = 'info' | 'warning' | 'success' | 'update';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  priority: number;
  published_at: string | null;  // ISO timestamp
  expires_at: string | null;    // ISO timestamp
  created_by: string | null;    // user id
  created_by_name: string | null;
  created_at: string;           // ISO timestamp
}
