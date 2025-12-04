-- Shop Items table - rewards catalog for point redemption
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shop_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    point_cost integer NOT NULL CHECK (point_cost > 0),
    category text NOT NULL DEFAULT 'item',
    image_url text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Index for active items query
CREATE INDEX IF NOT EXISTS shop_items_active_idx ON public.shop_items(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items FORCE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- RLS Policies for shop_items
--------------------------------------------------------------------------------

-- All authenticated users can read active shop items
CREATE POLICY shop_items_read_active ON public.shop_items
FOR SELECT
USING (is_active = true);

-- Admins can manage all shop items (CRUD)
CREATE POLICY shop_items_admin_all ON public.shop_items
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Service role bypass
CREATE POLICY shop_items_service_role ON public.shop_items
FOR ALL
USING (auth.uid() IS NULL)
WITH CHECK (auth.uid() IS NULL);
