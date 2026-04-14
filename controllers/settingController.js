import Setting from '../models/Setting.js';
import { sequelize } from '../db/sequelize.js';

// ============================================================
// Setting Controller — Converted from api/settings/index.php
// ============================================================

const ALLOWED_KEYS = [
  'site_name', 'school_name', 'school_address', 'school_phone',
  'school_email', 'vision', 'mission', 'about_app', 'logo', 'hero_tagline',
  // Portal/CMS
  'portal_landing_json',
  'portal_documentation_json',
  'portal_header_nav_json',
  'site_logo',
  'site_logo_bg',
  'site_logo_zoom',
];

/**
 * GET /api/settings
 * Get all settings as key-value object
 */
export async function get(req, res) {
  try {
    const rows = await Setting.findAll({ attributes: ['setting_key', 'setting_value'] });

    const settings = {};
    for (const row of rows) {
      const key = row.setting_key;
      const value = row.setting_value ?? null;
      if (key) settings[key] = value;
    }

    return res.json({ success: true, message: 'Settings fetched.', data: settings });
  } catch (err) {
    console.error('getSettings error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * PUT /api/settings
 * Update settings (admin only)
 */
export async function update(req, res) {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ success: false, message: 'Payload tidak valid.', data: null });
    }

    await sequelize.transaction(async (t) => {
      for (const [key, value] of Object.entries(body)) {
        if (!key || typeof key !== 'string') continue;
        const cleanKey = key.trim();
        if (!cleanKey || !ALLOWED_KEYS.includes(cleanKey)) continue;
        const cleanValue = value === null || value === undefined ? null : String(value);

        await Setting.upsert(
          { setting_key: cleanKey, setting_value: cleanValue },
          { transaction: t }
        );
      }
    });

    return res.json({ success: true, message: 'Settings updated.', data: null });
  } catch (err) {
    console.error('updateSettings error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}
