-- Fix: UPDATE policy USING clause was also used as WITH CHECK
-- Post-update state has used_at != NULL, which failed the USING check
DROP POLICY IF EXISTS "Users can mark code as used during signup" ON public.invite_codes;

CREATE POLICY "Users can mark code as used during signup"
  ON public.invite_codes
  FOR UPDATE
  USING (used_at IS NULL)
  WITH CHECK (true);
