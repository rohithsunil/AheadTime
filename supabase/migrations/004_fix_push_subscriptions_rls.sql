-- Fix RLS policy on push_subscriptions so admins can select all subscriptions for broadcast
CREATE POLICY "Admins can read all push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
