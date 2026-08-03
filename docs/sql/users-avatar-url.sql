-- Profile pictures for portal users (Slack-style avatars).
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
