-- Redemptions table - tracks user shop item redemptions
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.redemptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    shop_item_id uuid NOT NULL REFERENCES public.shop_items(id) ON DELETE RESTRICT,
    points_spent integer NOT NULL CHECK (points_spent > 0),
    redeemed_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Index for user redemption history queries
CREATE INDEX IF NOT EXISTS redemptions_user_id_idx ON public.redemptions(user_id);

-- Enable RLS
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions FORCE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- RLS Policies for redemptions
--------------------------------------------------------------------------------

-- Users can read their own redemptions
CREATE POLICY redemptions_read_own ON public.redemptions
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own redemptions
CREATE POLICY redemptions_insert_own ON public.redemptions
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Admins can manage all redemptions
CREATE POLICY redemptions_admin_all ON public.redemptions
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Managers can read team member redemptions
CREATE POLICY redemptions_manager_read ON public.redemptions
FOR SELECT
USING (
    public.is_manager_of_current_team()
    AND public.user_in_current_team(user_id)
);

-- Service role bypass
CREATE POLICY redemptions_service_role ON public.redemptions
FOR ALL
USING (auth.uid() IS NULL)
WITH CHECK (auth.uid() IS NULL);
