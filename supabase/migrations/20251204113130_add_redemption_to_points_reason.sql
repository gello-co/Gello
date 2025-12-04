-- Add 'redemption' to points_reason enum for shop item redemptions
ALTER TYPE public.points_reason ADD VALUE IF NOT EXISTS 'redemption';